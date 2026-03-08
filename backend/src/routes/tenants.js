const express = require('express');
const { body, validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/tenants
// Cree une nouvelle ecole (tenant). Superadmin uniquement.
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  authorize('superadmin'),
  [
    body('name').notEmpty().withMessage('Nom de l\'ecole requis'),
    body('code').notEmpty().withMessage('Code unique requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, code, address, contactEmail, config } = req.body;

      const existing = await Tenant.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(409).json({ error: 'Une ecole avec ce code existe deja' });
      }

      const tenant = await Tenant.create({ name, code, address, contactEmail, config });

      res.status(201).json({
        message: 'Ecole creee avec succes',
        tenant,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tenants
// Liste toutes les ecoles. Superadmin et admin_ddene.
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  authorize('superadmin', 'admin_ddene'),
  async (_req, res, next) => {
    try {
      const tenants = await Tenant.find().sort({ createdAt: -1 });
      // Count users per tenant
      const tenantsWithStats = await Promise.all(
        tenants.map(async (t) => {
          const userCount = await User.countDocuments({ tenant_id: t._id });
          return { ...t.toObject(), userCount };
        })
      );
      res.json({ tenants: tenantsWithStats });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tenants/:id
// Detail d'un tenant.
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  authenticate,
  authorize('superadmin', 'admin_ddene'),
  async (req, res, next) => {
    try {
      const tenant = await Tenant.findById(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'Ecole introuvable' });
      }
      const userCount = await User.countDocuments({ tenant_id: tenant._id });
      res.json({ tenant: { ...tenant.toObject(), userCount } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/tenants/:id
// Met a jour un tenant. Superadmin uniquement.
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authenticate,
  authorize('superadmin'),
  async (req, res, next) => {
    try {
      const { name, code, address, contactEmail, isActive, config } = req.body;
      const update = {};
      if (name !== undefined) update.name = name;
      if (code !== undefined) update.code = code;
      if (address !== undefined) update.address = address;
      if (contactEmail !== undefined) update.contactEmail = contactEmail;
      if (isActive !== undefined) update.isActive = isActive;
      if (config !== undefined) update.config = config;

      const tenant = await Tenant.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        return res.status(404).json({ error: 'Ecole introuvable' });
      }

      res.json({ message: 'Ecole mise a jour', tenant });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/tenants/:id
// Desactive un tenant (soft delete). Superadmin uniquement.
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin'),
  async (req, res, next) => {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!tenant) {
        return res.status(404).json({ error: 'Ecole introuvable' });
      }

      res.json({ message: 'Ecole desactivee', tenant });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
