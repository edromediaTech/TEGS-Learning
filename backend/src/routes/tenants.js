const express = require('express');
const { body, validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/tenants
// Cree une nouvelle ecole (tenant).
// En production, cette route serait reservee a admin_ddene.
// Pour le bootstrap initial, elle est ouverte (pas d'auth requise).
// ---------------------------------------------------------------------------
router.post(
  '/',
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
// Liste toutes les ecoles. Route protegee (admin_ddene uniquement).
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  authorize('admin_ddene'),
  async (_req, res, next) => {
    try {
      const tenants = await Tenant.find();
      res.json({ tenants });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
