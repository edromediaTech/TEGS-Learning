const Tenant = require('../models/Tenant');
const { hasFeature, checkLimit, getPlan } = require('../config/plans');

/**
 * Cache tenant plan in req to avoid multiple DB lookups per request.
 */
async function loadTenantPlan(req) {
  if (req._tenantPlan) return req._tenantPlan;

  // SuperAdmin bypasses all gates
  if (req.isSuperAdmin) {
    req._tenantPlan = 'pro';
    return 'pro';
  }

  if (!req.tenantId) {
    req._tenantPlan = 'free';
    return 'free';
  }

  const tenant = await Tenant.findById(req.tenantId)
    .select('subscriptionPlan seatsCount billingCycle subscriptionEndDate')
    .lean();

  if (!tenant) {
    req._tenantPlan = 'free';
    return 'free';
  }

  // Check if subscription is expired
  let plan = tenant.subscriptionPlan || 'free';
  if (plan !== 'free' && tenant.subscriptionEndDate && new Date() > tenant.subscriptionEndDate) {
    plan = 'free'; // Expired, fallback to free
  }

  req._tenantPlan = plan;
  req._tenantSeats = tenant.seatsCount || 1;
  return plan;
}

/**
 * Middleware factory: require a specific feature.
 * Usage: router.get('/pdf/:id', requireFeature('exportPDF'), handler)
 *
 * @param {string} feature - feature key from plans.js
 * @returns {Function} Express middleware
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const plan = await loadTenantPlan(req);
      if (hasFeature(plan, feature)) {
        return next();
      }

      const planDef = getPlan(plan);
      res.status(403).json({
        error: 'Fonctionnalite non disponible dans votre plan',
        feature,
        currentPlan: plan,
        planName: planDef.name,
        upgradeRequired: true,
        message: `La fonctionnalite "${feature}" necessite un plan superieur. Plan actuel: ${planDef.name}.`,
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware factory: check a resource limit.
 * Usage: router.post('/modules', requireLimit('modules', getModuleCount), handler)
 *
 * @param {string} limitKey - limit key from plans.js
 * @param {Function} countFn - async (req) => number, returns current usage count
 * @returns {Function} Express middleware
 */
function requireLimit(limitKey, countFn) {
  return async (req, res, next) => {
    try {
      const plan = await loadTenantPlan(req);
      const currentCount = await countFn(req);
      if (checkLimit(plan, limitKey, currentCount)) {
        return next();
      }

      const planDef = getPlan(plan);
      const limit = planDef.limits[limitKey];
      res.status(403).json({
        error: 'Limite du plan atteinte',
        limitKey,
        currentCount,
        limit,
        currentPlan: plan,
        planName: planDef.name,
        upgradeRequired: true,
        message: `Vous avez atteint la limite de ${limit} ${limitKey} pour le plan ${planDef.name}.`,
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: inject tenant plan info into req for downstream use.
 */
async function injectPlanInfo(req, _res, next) {
  try {
    await loadTenantPlan(req);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireFeature, requireLimit, injectPlanInfo, loadTenantPlan };
