const express = require('express');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/users
// Liste les utilisateurs du tenant courant.
// Demontre l'isolation : un user ne voit QUE les utilisateurs de son ecole.
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  tenantIsolation,
  authorize('admin_ddene', 'teacher'),
  async (req, res, next) => {
    try {
      // ISOLATION OBLIGATOIRE : req.tenantFilter() injecte { tenant_id: <id> }
      const users = await User.find(req.tenantFilter());
      res.json({ users, count: users.length });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
