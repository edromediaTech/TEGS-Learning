/**
 * Panic Switch — Interrupteur d'urgence pour le module agentique.
 *
 * Singleton en memoire : pas besoin de restart serveur.
 * Peut etre declenche manuellement (bouton SuperAdmin) ou
 * automatiquement (detection d'anomalie dans agentGate.js).
 *
 * Quand active :
 *   - Toutes les nouvelles requetes agent sont bloquees (503)
 *   - Un evenement Socket.io est emis a tous les clients connectes
 *   - L'evenement est enregistre dans AgentAuditLog
 */

let _panicActive = false;
let _panicReason = null;
let _panicActivatedAt = null;
let _panicActivatedBy = null;

/**
 * Active le mode panique.
 * @param {string} reason - Raison ('manual', 'auto-anomaly')
 * @param {string} [activatedBy] - userId du SuperAdmin (si manuel)
 */
function panicActivate(reason = 'manual', activatedBy = null) {
  if (_panicActive) return; // deja actif

  _panicActive = true;
  _panicReason = reason;
  _panicActivatedAt = new Date();
  _panicActivatedBy = activatedBy;

  console.error(`[PANIC-SWITCH] ACTIVE — raison: ${reason}, par: ${activatedBy || 'systeme'}`);

  // Emettre via Socket.io si disponible
  const io = global._io;
  if (io) {
    io.of('/agent').emit('agent_panic_activated', {
      reason,
      activatedAt: _panicActivatedAt.toISOString(),
    });
  }

  // Log dans AgentAuditLog (fire-and-forget)
  try {
    const AgentAuditLog = require('../models/AgentAuditLog');
    AgentAuditLog.create({
      tenant_id: activatedBy ? undefined : '000000000000000000000000',
      user_id: activatedBy || '000000000000000000000000',
      sessionId: 'PANIC',
      role: 'superadmin',
      action: 'panic_activate',
      input: { reason },
      output: null,
      status: 'panic_killed',
      executionMs: 0,
      metadata: { activatedBy, reason },
    }).catch((err) => console.error('[PANIC-SWITCH] Audit log error:', err.message));
  } catch {
    // Model not loaded yet, skip
  }
}

/**
 * Desactive le mode panique.
 * @param {string} [deactivatedBy] - userId du SuperAdmin
 */
function panicDeactivate(deactivatedBy = null) {
  if (!_panicActive) return;

  _panicActive = false;
  const duration = Date.now() - (_panicActivatedAt?.getTime() || Date.now());

  console.log(`[PANIC-SWITCH] DESACTIVE — duree: ${Math.round(duration / 1000)}s, par: ${deactivatedBy || 'systeme'}`);

  _panicReason = null;
  _panicActivatedAt = null;
  _panicActivatedBy = null;

  // Notifier les clients
  const io = global._io;
  if (io) {
    io.of('/agent').emit('agent_panic_deactivated', {
      deactivatedBy,
    });
  }
}

/**
 * @returns {boolean} true si le mode panique est actif
 */
function isPanicMode() {
  return _panicActive;
}

/**
 * @returns {object} Statut complet du Panic Switch
 */
function getPanicStatus() {
  return {
    active: _panicActive,
    reason: _panicReason,
    activatedAt: _panicActivatedAt?.toISOString() || null,
    activatedBy: _panicActivatedBy,
  };
}

module.exports = {
  panicActivate,
  panicDeactivate,
  isPanicMode,
  getPanicStatus,
};
