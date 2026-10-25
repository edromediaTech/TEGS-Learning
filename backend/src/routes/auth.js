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
// Seul un admin_ddene (dans son organisation) ou un superadmin peut creer des comptes,
// sauf le tout premier superadmin (bootstrap, sans token).
// ---------------------------------------------------------------------------
function authenticateUnlessBootstrap(req, res, next) {
  if (req.body?.role === 'superadmin') return next();
  return authenticate(req, res, next);
}

router.post(
  '/register',
  authenticateUnlessBootstrap,
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Mot de passe : 6 caracteres minimum'),
    body('firstName').notEmpty().withMessage('Prenom requis'),
    body('lastName').notEmpty().withMessage('Nom requis'),
    body('role')
      .isIn(['superadmin', 'admin_ddene', 'teacher', 'student', 'authorized_agent'])
      .withMessage('Role invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, tenant_id } = req.body;

      // superadmin n'a pas besoin de tenant_id
      if (role === 'superadmin') {
        // Only allow creating superadmin if no superadmin exists yet (bootstrap)
        // or if the requester is already a superadmin
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        if (existingSuperAdmin) {
          return res.status(403).json({ error: 'Un superadmin existe deja. Contactez le superadmin existant.' });
        }
        const existingUser = await User.findOne({ email, role: 'superadmin' });
        if (existingUser) {
          return res.status(409).json({ error: 'Ce superadmin existe deja' });
        }
        const user = await User.create({ email, password, firstName, lastName, role });
        const token = generateToken(user);
        return res.status(201).json({
          message: 'Superadmin cree avec succes',
          user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
          token,
        });
      }

      // Autres roles : createur authentifie, superadmin (toute organisation) ou admin_ddene (la sienne)
      if (!req.user || !['superadmin', 'admin_ddene'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Acces refuse : seul un administrateur peut creer des comptes' });
      }
      const targetTenant = req.isSuperAdmin ? tenant_id : req.tenantId;
      if (!targetTenant) {
        return res.status(400).json({ error: 'tenant_id requis pour ce role' });
      }
      if (!req.isSuperAdmin && tenant_id && String(tenant_id) !== String(req.tenantId)) {
        return res.status(403).json({ error: 'Acces refuse : organisation differente de la votre' });
      }

      // Verifier que le tenant existe et est actif
      const tenant = await Tenant.findById(targetTenant);
      if (!tenant || !tenant.isActive) {
        return res.status(404).json({ error: 'Ecole (tenant) introuvable ou inactive' });
      }

      // Verifier l'unicite email + tenant
      const existingUser = await User.findOne({ email, tenant_id: targetTenant });
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
        tenant_id: targetTenant,
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
// Limite des ECHECS contre la force brute : 10 par compte (email + organisation) en
// 15 min, 30 par adresse IP en 10 min. Les succes ne comptent pas (personnel d'un meme
// etablissement derriere une seule connexion). Compteurs en memoire, par instance.
// ---------------------------------------------------------------------------
function failureCounter(limit, windowMs) {
  const entries = new Map();
  return {
    blocked(key) {
      const e = entries.get(key);
      return Boolean(e && e.resetAt > Date.now() && e.count >= limit);
    },
    record(key) {
      const now = Date.now();
      const e = entries.get(key);
      if (!e || e.resetAt <= now) {
        entries.set(key, { count: 1, resetAt: now + windowMs });
        if (entries.size > 10000) {
          for (const [k, v] of entries) if (v.resetAt <= now) entries.delete(k);
        }
      } else {
        e.count += 1;
      }
    },
    clear(key) { entries.delete(key); },
  };
}

const loginFailuresByAccount = failureCounter(10, 15 * 60 * 1000);
const loginFailuresByIp = failureCounter(30, 10 * 60 * 1000);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
    // tenant_id is optional for superadmin
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, tenant_id } = req.body;
      const accountKey = `${String(email).toLowerCase()}|${tenant_id || ''}`;
      if (loginFailuresByIp.blocked(req.ip) || loginFailuresByAccount.blocked(accountKey)) {
        return res.status(429).json({ error: 'Trop de tentatives de connexion, reessayez dans quelques minutes' });
      }
      const fail = (status, error) => {
        loginFailuresByIp.record(req.ip);
        loginFailuresByAccount.record(accountKey);
        return res.status(status).json({ error });
      };

      let user;
      if (tenant_id) {
        // Login avec tenant_id (normal flow)
        user = await User.findOne({ email, tenant_id }).select('+password');
      } else {
        // Login sans tenant_id : uniquement superadmin
        user = await User.findOne({ email, role: 'superadmin' }).select('+password');
      }

      if (!user) {
        return fail(401, 'Identifiants invalides');
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Compte desactive' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return fail(401, 'Identifiants invalides');
      }
      loginFailuresByAccount.clear(accountKey);

      const token = generateToken(user);

      res.json({
        message: 'Connexion reussie',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenant_id: user.tenant_id || null,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/login-pin
// Connexion eleve par matricule + PIN (E4, identifiants distribues par l'enseignant).
// Verrouillage du compte apres 5 PIN errones (15 min) et limite des ECHECS par adresse IP
// (30 / 10 min) contre le balayage des matricules. Les succes ne comptent pas : une classe
// entiere derriere la connexion de l'ecole doit pouvoir se connecter en meme temps.
// ---------------------------------------------------------------------------
const hashPool = require('../services/hashPool');
const { MAX_FAILED_ATTEMPTS, LOCK_MINUTES } = require('../services/studentCredentials');

const PIN_IP_LIMIT = 30;
const PIN_IP_WINDOW_MS = 10 * 60 * 1000;
const pinFailuresByIp = new Map();

function pinIpBlocked(ip) {
  const entry = pinFailuresByIp.get(ip);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= PIN_IP_LIMIT);
}

function recordPinFailure(ip) {
  const now = Date.now();
  const entry = pinFailuresByIp.get(ip);
  if (!entry || entry.resetAt <= now) {
    pinFailuresByIp.set(ip, { count: 1, resetAt: now + PIN_IP_WINDOW_MS });
    if (pinFailuresByIp.size > 10000) {
      for (const [k, v] of pinFailuresByIp) if (v.resetAt <= now) pinFailuresByIp.delete(k);
    }
  } else {
    entry.count += 1;
  }
}

router.post(
  '/login-pin',
  [
    body('tenant_id').isMongoId().withMessage('Ecole requise'),
    body('matricule').isString().trim().notEmpty().withMessage('Matricule requis'),
    body('pin').isString().matches(/^[0-9]{6}$/).withMessage('Le PIN compte 6 chiffres'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      if (pinIpBlocked(req.ip)) {
        return res.status(429).json({ error: 'Trop de tentatives depuis ce poste, reessayez dans quelques minutes' });
      }

      const { tenant_id, pin } = req.body;
      const matricule = String(req.body.matricule).trim().toUpperCase();
      const user = await User.findOne({ tenant_id, matricule, role: 'student' }).select('+pin_hash');
      if (!user || !user.pin_hash) {
        recordPinFailure(req.ip);
        return res.status(401).json({ error: 'Matricule ou PIN invalide' });
      }
      if (!user.isActive) return res.status(401).json({ error: 'Compte desactive' });
      if (user.pin_locked_until && user.pin_locked_until > new Date()) {
        return res.status(423).json({
          error: 'Compte verrouille apres plusieurs PIN errones : demandez a votre enseignant ou reessayez plus tard',
          locked_until: user.pin_locked_until,
        });
      }

      if (!(await hashPool.compare(pin, user.pin_hash))) {
        user.pin_failed_attempts = (user.pin_failed_attempts || 0) + 1;
        if (user.pin_failed_attempts >= MAX_FAILED_ATTEMPTS) {
          user.pin_locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
          user.pin_failed_attempts = 0;
        }
        await user.save();
        recordPinFailure(req.ip);
        return res.status(401).json({ error: 'Matricule ou PIN invalide' });
      }

      if (user.pin_failed_attempts || user.pin_locked_until) {
        user.pin_failed_attempts = 0;
        user.pin_locked_until = undefined;
        await user.save();
      }
      res.json({
        message: 'Connexion reussie',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          matricule: user.matricule,
          role: user.role,
          tenant_id: user.tenant_id,
        },
        token: generateToken(user),
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
    const filter = { _id: req.user.id };
    // superadmin n'a pas de tenant_id
    if (req.tenantId) {
      filter.tenant_id = req.tenantId;
    }
    const user = await User.findOne(filter);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
