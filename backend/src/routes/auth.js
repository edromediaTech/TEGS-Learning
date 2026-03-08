const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const generateToken = require('../utils/generateToken');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Cree un nouvel utilisateur lie a un tenant existant.
// Seul un admin_ddene peut creer des comptes (sauf le tout premier admin bootstrap).
// ---------------------------------------------------------------------------
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Mot de passe : 6 caracteres minimum'),
    body('firstName').notEmpty().withMessage('Prenom requis'),
    body('lastName').notEmpty().withMessage('Nom requis'),
    body('role')
      .isIn(['admin_ddene', 'teacher', 'student'])
      .withMessage('Role invalide'),
    body('tenant_id').notEmpty().withMessage('tenant_id requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, tenant_id } = req.body;

      // Verifier que le tenant existe et est actif
      const tenant = await Tenant.findById(tenant_id);
      if (!tenant || !tenant.isActive) {
        return res.status(404).json({ error: 'Ecole (tenant) introuvable ou inactive' });
      }

      // Verifier l'unicite email + tenant
      const existingUser = await User.findOne({ email, tenant_id });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: 'Un utilisateur avec cet email existe deja dans cette ecole' });
      }

      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role,
        tenant_id,
      });

      const token = generateToken(user);

      res.status(201).json({
        message: 'Utilisateur cree avec succes',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant_id: user.tenant_id,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Authentifie un utilisateur et retourne un JWT.
// ---------------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
    body('tenant_id').notEmpty().withMessage('tenant_id requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, tenant_id } = req.body;

      // IMPORTANT : le login filtre AUSSI par tenant_id pour l'isolation
      const user = await User.findOne({ email, tenant_id }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Compte desactive' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = generateToken(user);

      res.json({
        message: 'Connexion reussie',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant_id: user.tenant_id,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Retourne le profil de l'utilisateur connecte (route protegee).
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.user.id,
      tenant_id: req.tenantId, // ISOLATION : filtre obligatoire
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
