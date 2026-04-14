const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/users
// Liste les utilisateurs. Superadmin voit tout, admin_ddene/teacher voient leur tenant.
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene', 'teacher'),
  async (req, res, next) => {
    try {
      const filter = req.tenantFilter();
      // Optional role filter
      if (req.query.role) filter.role = req.query.role;
      const users = await User.find(filter).populate('tenant_id', 'name code').sort({ createdAt: -1 });
      res.json({ users, count: users.length });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/users/:id
// Detail d'un utilisateur.
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id, ...req.tenantFilter() };
      const user = await User.findOne(filter).populate('tenant_id', 'name code');
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/users
// Cree un utilisateur (superadmin ou admin_ddene).
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'admin_ddene'),
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe : 6 caracteres minimum'),
    body('firstName').notEmpty().withMessage('Prenom requis'),
    body('lastName').notEmpty().withMessage('Nom requis'),
    body('role').isIn(['superadmin', 'admin_ddene', 'teacher', 'student']).withMessage('Role invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, tenant_id } = req.body;

      // Seul un superadmin peut creer un autre superadmin
      if (role === 'superadmin' && !req.isSuperAdmin) {
        return res.status(403).json({ error: 'Seul un superadmin peut creer un superadmin' });
      }

      // Superadmin sans tenant (compte global)
      if (role === 'superadmin') {
        const existing = await User.findOne({ email, role: 'superadmin' });
        if (existing) {
          return res.status(409).json({ error: 'Email deja utilise pour un superadmin' });
        }
        const user = await User.create({
          email, password, firstName, lastName, role: 'superadmin',
          tenant_id: tenant_id || null,
        });
        return res.status(201).json({
          message: 'Superadmin cree',
          user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenant_id: user.tenant_id },
        });
      }

      // Determine tenant: superadmin must specify, admin_ddene uses their own
      const targetTenant = req.isSuperAdmin ? tenant_id : req.tenantId;
      if (!targetTenant) {
        return res.status(400).json({ error: 'tenant_id requis' });
      }

      const tenant = await Tenant.findById(targetTenant);
      if (!tenant || !tenant.isActive) {
        return res.status(404).json({ error: 'Organisation introuvable ou inactive' });
      }

      const existing = await User.findOne({ email, tenant_id: targetTenant });
      if (existing) {
        return res.status(409).json({ error: 'Email deja utilise dans cette organisation' });
      }

      const user = await User.create({
        email, password, firstName, lastName, role,
        tenant_id: targetTenant,
      });

      res.status(201).json({
        message: 'Utilisateur cree',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/users/:id
// Met a jour un utilisateur.
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const { firstName, lastName, role, isActive, password, tenant_id } = req.body;
      const update = {};
      if (firstName !== undefined) update.firstName = firstName;
      if (lastName !== undefined) update.lastName = lastName;
      if (role !== undefined) {
        // Seul superadmin peut promouvoir en superadmin
        if (role === 'superadmin' && !req.isSuperAdmin) {
          return res.status(403).json({ error: 'Seul un superadmin peut assigner le role superadmin' });
        }
        update.role = role;
      }
      if (isActive !== undefined) update.isActive = isActive;
      // Superadmin peut reassigner le tenant
      if (tenant_id !== undefined && req.isSuperAdmin) {
        update.tenant_id = tenant_id || null;
      }
      // Superadmin peut reset le mot de passe
      if (password && req.isSuperAdmin) {
        // On passe par le model pour hasher
        const targetUser = await User.findById(req.params.id);
        if (targetUser) {
          targetUser.password = password;
          await targetUser.save();
        }
      }

      const filter = { _id: req.params.id, ...req.tenantFilter() };
      const user = await User.findOneAndUpdate(filter, { $set: update }, { new: true });

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      res.json({ message: 'Utilisateur mis a jour', user });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
// Desactive un utilisateur (soft delete).
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const filter = { _id: req.params.id, ...req.tenantFilter() };
      const user = await User.findOneAndUpdate(filter, { $set: { isActive: false } }, { new: true });

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      res.json({ message: 'Utilisateur desactive', user });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
