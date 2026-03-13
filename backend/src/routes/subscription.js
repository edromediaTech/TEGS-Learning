const express = require('express');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { PLANS, FEATURE_LABELS, getPlan, calculatePrice } = require('../config/plans');

const router = express.Router();

router.use(authenticate);
router.use(tenantIsolation);

// -----------------------------------------------------------------------
// GET /api/subscription/current
// Retourne le plan actuel du tenant + infos de facturation
// -----------------------------------------------------------------------
router.get('/current', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId).lean();
    if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

    const plan = getPlan(tenant.subscriptionPlan || 'free');
    const seats = tenant.seatsCount || 1;
    const cycle = tenant.billingCycle || 'monthly';
    const pricing = calculatePrice(plan.id, seats, cycle);

    // Count active users (current seat usage)
    const activeUsers = await User.countDocuments({
      tenant_id: req.tenantId,
      isActive: true,
      role: { $in: ['admin_ddene', 'teacher'] },
    });

    res.json({
      plan: plan.id,
      planName: plan.name,
      planDescription: plan.description,
      seats,
      seatsUsed: activeUsers,
      billingCycle: cycle,
      pricing,
      limits: plan.limits,
      features: plan.features,
      subscriptionStartDate: tenant.subscriptionStartDate,
      subscriptionEndDate: tenant.subscriptionEndDate,
      trialEndsAt: tenant.trialEndsAt,
      isExpired: tenant.subscriptionEndDate ? new Date() > tenant.subscriptionEndDate : false,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/subscription/plans
// Retourne tous les plans disponibles avec comparaison
// -----------------------------------------------------------------------
router.get('/plans', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId).lean();
    const currentPlan = tenant?.subscriptionPlan || 'free';
    const seats = parseInt(req.query.seats) || tenant?.seatsCount || 1;
    const cycle = req.query.cycle || tenant?.billingCycle || 'monthly';

    const plans = Object.values(PLANS).map(plan => ({
      ...plan,
      pricing: calculatePrice(plan.id, seats, cycle),
      isCurrent: plan.id === currentPlan,
    }));

    res.json({
      plans,
      featureLabels: FEATURE_LABELS,
      currentPlan,
      seats,
      cycle,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// PUT /api/subscription/change
// Changer de plan (admin_ddene uniquement)
// -----------------------------------------------------------------------
router.put('/change', authorize('admin_ddene'), async (req, res, next) => {
  try {
    const { plan, seats, billingCycle } = req.body;

    if (!plan || !['free', 'individual', 'establishment', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    const seatCount = Math.max(1, Math.min(500, parseInt(seats) || 1));
    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';

    const update = {
      subscriptionPlan: plan,
      seatsCount: seatCount,
      billingCycle: cycle,
    };

    // Set subscription dates
    if (plan !== 'free') {
      update.subscriptionStartDate = new Date();
      if (cycle === 'annual') {
        update.subscriptionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else {
        update.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      update.subscriptionStartDate = null;
      update.subscriptionEndDate = null;
    }

    const tenant = await Tenant.findByIdAndUpdate(req.tenantId, update, { new: true }).lean();
    if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

    const planDef = getPlan(plan);
    const pricing = calculatePrice(plan, seatCount, cycle);

    res.json({
      message: `Plan mis a jour: ${planDef.name}`,
      plan: planDef.id,
      planName: planDef.name,
      seats: seatCount,
      billingCycle: cycle,
      pricing,
      subscriptionStartDate: tenant.subscriptionStartDate,
      subscriptionEndDate: tenant.subscriptionEndDate,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// PUT /api/subscription/seats
// Mettre a jour le nombre de sieges
// -----------------------------------------------------------------------
router.put('/seats', authorize('admin_ddene'), async (req, res, next) => {
  try {
    const { seats } = req.body;
    const seatCount = Math.max(1, Math.min(500, parseInt(seats) || 1));

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { seatsCount: seatCount },
      { new: true }
    ).lean();

    if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

    const pricing = calculatePrice(
      tenant.subscriptionPlan || 'free',
      seatCount,
      tenant.billingCycle || 'monthly'
    );

    res.json({
      message: `Nombre de sieges mis a jour: ${seatCount}`,
      seats: seatCount,
      pricing,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/subscription/usage
// Retourne l'utilisation courante par rapport aux limites du plan
// -----------------------------------------------------------------------
router.get('/usage', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId).lean();
    if (!tenant) return res.status(404).json({ error: 'Tenant introuvable' });

    const plan = getPlan(tenant.subscriptionPlan || 'free');
    const Module = require('../models/Module');
    const Statement = require('../models/Statement');

    const [moduleCount, userCount, statementCount] = await Promise.all([
      Module.countDocuments({ tenant_id: req.tenantId }),
      User.countDocuments({ tenant_id: req.tenantId, isActive: true }),
      Statement.countDocuments({ tenant_id: req.tenantId, voided: false }),
    ]);

    res.json({
      plan: plan.id,
      usage: {
        modules: {
          current: moduleCount,
          limit: plan.limits.modules,
          unlimited: plan.limits.modules === -1,
          percent: plan.limits.modules === -1 ? 0 : Math.round((moduleCount / plan.limits.modules) * 100),
        },
        seats: {
          current: userCount,
          limit: tenant.seatsCount || 1,
          percent: Math.round((userCount / (tenant.seatsCount || 1)) * 100),
        },
        rooms: {
          limit: plan.limits.rooms,
          unlimited: plan.limits.rooms === -1,
        },
        studentsPerActivity: {
          limit: plan.limits.studentsPerActivity,
          unlimited: plan.limits.studentsPerActivity === -1,
        },
        storage: {
          limitGB: plan.limits.storageGB,
          unlimited: plan.limits.storageGB === -1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
