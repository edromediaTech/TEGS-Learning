const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requireAgentEnabled, requireAgentEnabledForTenant, agentRateLimit } = require('../middleware/agentGate');
const { requireFeature } = require('../middleware/featureGate');
const { processMessage } = require('../agent/orchestrator');
const { clearSession, clearUserSessions, getHistory, getOrCreateSession, clearAllSessions, activeSessionCount } = require('../agent/sessionStore');
const { executeConfirmation, rejectConfirmation } = require('../agent/confirmationStore');
const { getProfileForRole } = require('../config/agentConfig');
const { panicActivate, panicDeactivate, getPanicStatus } = require('../agent/panicSwitch');

const Tenant = require('../models/Tenant');
const { getAgentSettings, saveAgentSettings } = require('../agent/tenantSettings');
const { getAllTools } = require('../agent/tools');

const router = express.Router();

// ── Middleware chain commun (authentifie) ─────────────────────
const agentMiddleware = [
  authenticate,
  tenantIsolation,
  requireAgentEnabled,
  requireAgentEnabledForTenant,
  requireFeature('agenticAssistant'),
  agentRateLimit,
];

// ══════════════════════════════════════════════════════════════
// POST /api/agent/public/chat — Chat public (non-authentifie)
// ══════════════════════════════════════════════════════════════
router.post('/public/chat', requireAgentEnabled, agentRateLimit, async (req, res, next) => {
  try {
    const { message, sessionHint } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    const context = {
      user: { id: 'public', role: 'public', tenant_id: null },
      tenantId: null,
      tenantFilter: () => ({}),
      isSuperAdmin: false,
      isPublic: true,
      sessionHint: sessionHint || req.ip || Date.now().toString(),
    };

    const result = await processMessage(message, context);

    res.json({
      response: result.response,
      sessionId: result.sessionId,
      remainingRequests: req.agentRemainingRequests,
    });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/agent/chat — Message principal
// ══════════════════════════════════════════════════════════════
router.post('/chat', ...agentMiddleware, async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Le message est requis.' });
    }

    // Charger le nom du tenant pour le contexte
    let tenantName = '';
    if (req.tenantId) {
      const tenant = await Tenant.findById(req.tenantId).select('name').lean();
      tenantName = tenant?.name || '';
    }

    const context = {
      user: {
        id: req.user.id,
        role: req.user.role,
        tenant_id: req.user.tenant_id,
        firstName: req.body.firstName || '',
      },
      tenantId: req.tenantId,
      tenantFilter: req.tenantFilter || (() => ({})),
      isSuperAdmin: req.isSuperAdmin,
      isPublic: false,
      tenantName,
    };

    const result = await processMessage(message, context);

    res.json({
      response: result.response,
      sessionId: result.sessionId,
      proposal: result.proposal || null,
      remainingRequests: req.agentRemainingRequests,
    });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/agent/confirm/:id — Confirmer une mutation
// ══════════════════════════════════════════════════════════════
router.post('/confirm/:id', authenticate, tenantIsolation, requireAgentEnabled, async (req, res, next) => {
  try {
    const result = await executeConfirmation(req.params.id, req.user.id.toString());

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, result: result.result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/agent/reject/:id — Rejeter une mutation
// ══════════════════════════════════════════════════════════════
router.post('/reject/:id', authenticate, tenantIsolation, requireAgentEnabled, async (req, res, next) => {
  try {
    const result = await rejectConfirmation(req.params.id, req.user.id.toString());

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/agent/session — Effacer la session
// ══════════════════════════════════════════════════════════════
router.delete('/session', authenticate, async (req, res) => {
  clearUserSessions(req.user.id.toString());
  res.json({ success: true, message: 'Session effacee.' });
});

// ══════════════════════════════════════════════════════════════
// GET /api/agent/status — Statut de l'agent pour l'utilisateur
// ══════════════════════════════════════════════════════════════
router.get('/status', authenticate, tenantIsolation, async (req, res) => {
  const { isAgentEnabled } = require('../config/agentConfig');
  const profile = getProfileForRole(req.user.role);
  const panic = getPanicStatus();

  res.json({
    enabled: isAgentEnabled() && !panic.active,
    panicMode: panic.active,
    profile: profile ? {
      name: profile.profileName,
      description: profile.description,
      canMutate: profile.canMutate,
      toolCount: profile.allowedTools.length,
    } : null,
    remainingRequests: req.agentRemainingRequests ?? null,
  });
});

// ══════════════════════════════════════════════════════════════
// GET /api/agent/history — Historique du chat
// ══════════════════════════════════════════════════════════════
router.get('/history', authenticate, async (req, res) => {
  const { sessionId } = getOrCreateSession(req.user.id.toString(), req.tenantId?.toString());
  const messages = getHistory(sessionId, 20);
  res.json({ sessionId, messages });
});

// ══════════════════════════════════════════════════════════════
// PANIC MODE — SuperAdmin uniquement
// ══════════════════════════════════════════════════════════════
router.post('/panic', authenticate, authorize('superadmin'), async (req, res) => {
  panicActivate('manual', req.user.id.toString());
  const killed = clearAllSessions();
  res.json({
    success: true,
    message: `Panic Mode active. ${killed} session(s) supprimee(s).`,
    status: getPanicStatus(),
  });
});

router.post('/panic/deactivate', authenticate, authorize('superadmin'), async (req, res) => {
  panicDeactivate(req.user.id.toString());
  res.json({
    success: true,
    message: 'Panic Mode desactive.',
    status: getPanicStatus(),
  });
});

router.get('/panic/status', authenticate, authorize('superadmin', 'admin_ddene'), async (req, res) => {
  res.json({
    ...getPanicStatus(),
    activeSessions: activeSessionCount(),
  });
});

// ══════════════════════════════════════════════════════════════
// GET /api/agent/audit — Logs d'audit (admin)
// ══════════════════════════════════════════════════════════════
router.get('/audit', authenticate, tenantIsolation, authorize('superadmin', 'admin_ddene'), async (req, res, next) => {
  try {
    const AgentAuditLog = require('../models/AgentAuditLog');
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = parseInt(req.query.offset) || 0;

    const filter = req.isSuperAdmin ? {} : { tenant_id: req.tenantId };

    const [logs, total] = await Promise.all([
      AgentAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AgentAuditLog.countDocuments(filter),
    ]);

    res.json({
      logs: logs.map((l) => ({
        id: l._id.toString(),
        userId: l.user_id?.toString(),
        role: l.role,
        action: l.action,
        status: l.status,
        executionMs: l.executionMs,
        input: typeof l.input === 'string' ? l.input.substring(0, 150) : JSON.stringify(l.input)?.substring(0, 150),
        confirmedByUser: l.confirmedByUser,
        createdAt: l.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/agent/audit/stats — Statistiques d'usage (admin)
// ══════════════════════════════════════════════════════════════
router.get('/audit/stats', authenticate, tenantIsolation, authorize('superadmin', 'admin_ddene'), async (req, res, next) => {
  try {
    const AgentAuditLog = require('../models/AgentAuditLog');
    const filter = req.isSuperAdmin ? {} : { tenant_id: req.tenantId };

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, lastHour, lastDay, errors, proposals, confirmed] = await Promise.all([
      AgentAuditLog.countDocuments(filter),
      AgentAuditLog.countDocuments({ ...filter, createdAt: { $gte: hourAgo } }),
      AgentAuditLog.countDocuments({ ...filter, createdAt: { $gte: dayAgo } }),
      AgentAuditLog.countDocuments({ ...filter, status: 'error' }),
      AgentAuditLog.countDocuments({ ...filter, status: 'pending_confirmation' }),
      AgentAuditLog.countDocuments({ ...filter, status: 'confirmed' }),
    ]);

    res.json({
      total,
      lastHour,
      lastDay,
      errors,
      proposals,
      confirmed,
      activeSessions: activeSessionCount(),
      panicStatus: getPanicStatus(),
    });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// SETTINGS — Configuration agentique par tenant
// ══════════════════════════════════════════════════════════════
router.get('/settings', authenticate, tenantIsolation, authorize('superadmin', 'admin_ddene'), async (req, res, next) => {
  try {
    const settings = await getAgentSettings(req.tenantId);
    const tools = getAllTools().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      isMutation: t.isMutation,
      requiredRoles: t.requiredRoles,
    }));

    res.json({ settings, tools });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', authenticate, tenantIsolation, authorize('superadmin', 'admin_ddene'), async (req, res, next) => {
  try {
    const updates = req.body;

    // Validation basique
    if (updates.preferredModel && !['gemini-2.0-flash', 'gemini-1.5-pro'].includes(updates.preferredModel)) {
      return res.status(400).json({ error: 'Modele LLM invalide.' });
    }

    if (updates.rateLimits) {
      for (const [role, limit] of Object.entries(updates.rateLimits)) {
        if (typeof limit !== 'number' || limit < 1 || limit > 200) {
          return res.status(400).json({ error: `Rate limit invalide pour ${role}.` });
        }
      }
    }

    const saved = await saveAgentSettings(req.tenantId, updates);
    res.json({ success: true, settings: saved });
  } catch (err) {
    next(err);
  }
});

// GET /api/agent/settings/token-usage — Estimation tokens du mois
router.get('/settings/token-usage', authenticate, tenantIsolation, authorize('superadmin', 'admin_ddene'), async (req, res, next) => {
  try {
    const AgentAuditLog = require('../models/AgentAuditLog');
    const filter = req.isSuperAdmin ? {} : { tenant_id: req.tenantId };

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await AgentAuditLog.aggregate([
      { $match: { ...filter, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, totalTokens: { $sum: '$tokenUsage' }, totalRequests: { $sum: 1 } } },
    ]);

    const data = result[0] || { totalTokens: 0, totalRequests: 0 };

    res.json({
      month: monthStart.toISOString().substring(0, 7),
      totalTokens: data.totalTokens,
      totalRequests: data.totalRequests,
      estimatedCostUSD: Math.round(data.totalTokens * 0.000001 * 100) / 100, // ~$1/1M tokens Flash
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
