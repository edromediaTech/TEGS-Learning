/**
 * Socket.io namespace /agent — Communication temps reel avec l'agent IA.
 *
 * Auth : JWT via handshake (meme pattern que /prof).
 * Events :
 *   Client → Server : agent_message, agent_confirm, agent_reject
 *   Server → Client : agent_typing, agent_response, agent_confirmed,
 *                      agent_rejected, agent_error, agent_panic_activated
 */

const jwt = require('jsonwebtoken');
const { processMessage } = require('../agent/orchestrator');
const { executeConfirmation, rejectConfirmation } = require('../agent/confirmationStore');
const { clearUserSessions } = require('../agent/sessionStore');
const { isPanicMode } = require('../agent/panicSwitch');
const { isAgentEnabled } = require('../config/agentConfig');

/**
 * Configure le namespace /agent sur l'instance Socket.io.
 *
 * @param {import('socket.io').Server} io
 */
function setupAgentNamespace(io) {
  const agentNsp = io.of('/agent');

  // ── Authentication middleware (JWT optionnel pour public) ───
  agentNsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      // Mode public — visiteur non connecte
      socket.userId = `public:${socket.id}`;
      socket.tenantId = null;
      socket.role = 'public';
      socket.firstName = '';
      socket.isPublic = true;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.tenantId = decoded.tenant_id;
      socket.role = decoded.role;
      socket.firstName = decoded.firstName || '';
      socket.isPublic = false;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  agentNsp.on('connection', (socket) => {
    // Rejoindre un room personnel pour les notifications ciblees
    socket.join(`agent:${socket.userId}`);
    console.log(`[AGENT-SOCKET] Connected: ${socket.userId} (${socket.role})`);

    // ── AGENT MESSAGE ────────────────────────────────────────
    socket.on('agent_message', async ({ message, sessionId }) => {
      // Verifications de securite
      if (!isAgentEnabled()) {
        return socket.emit('agent_error', { error: 'Agent IA desactive.' });
      }
      if (isPanicMode()) {
        return socket.emit('agent_error', { error: 'Agent IA temporairement suspendu (mode urgence).', panicMode: true });
      }
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return socket.emit('agent_error', { error: 'Message vide.' });
      }

      // Indicateur "ecrit..."
      socket.emit('agent_typing', { isTyping: true });

      try {
        const context = {
          user: {
            id: socket.userId,
            role: socket.role,
            tenant_id: socket.tenantId,
            firstName: socket.firstName,
          },
          tenantId: socket.tenantId,
          tenantFilter: () => (socket.isPublic ? {} : socket.role === 'superadmin' ? {} : { tenant_id: socket.tenantId }),
          isSuperAdmin: socket.role === 'superadmin',
          isPublic: socket.isPublic || false,
          sessionHint: socket.id,
        };

        const result = await processMessage(message, context);

        socket.emit('agent_typing', { isTyping: false });
        socket.emit('agent_response', {
          response: result.response,
          sessionId: result.sessionId,
          proposal: result.proposal || null,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[AGENT-SOCKET] Error:', err.message);
        socket.emit('agent_typing', { isTyping: false });
        socket.emit('agent_error', { error: 'Erreur interne. Veuillez reessayer.' });
      }
    });

    // ── CONFIRM MUTATION ─────────────────────────────────────
    socket.on('agent_confirm', async ({ confirmationId }) => {
      try {
        const result = await executeConfirmation(confirmationId, socket.userId);

        if (result.success) {
          socket.emit('agent_confirmed', {
            confirmationId,
            result: result.result,
            timestamp: new Date().toISOString(),
          });
        } else {
          socket.emit('agent_error', { error: result.error });
        }
      } catch (err) {
        socket.emit('agent_error', { error: 'Erreur lors de la confirmation.' });
      }
    });

    // ── REJECT MUTATION ──────────────────────────────────────
    socket.on('agent_reject', async ({ confirmationId }) => {
      try {
        const result = await rejectConfirmation(confirmationId, socket.userId);

        if (result.success) {
          socket.emit('agent_rejected', { confirmationId });
        } else {
          socket.emit('agent_error', { error: result.error });
        }
      } catch (err) {
        socket.emit('agent_error', { error: 'Erreur lors du rejet.' });
      }
    });

    // ── CLEAR SESSION ────────────────────────────────────────
    socket.on('agent_clear_session', () => {
      clearUserSessions(socket.userId);
      socket.emit('agent_session_cleared');
    });

    socket.on('disconnect', () => {
      console.log(`[AGENT-SOCKET] Disconnected: ${socket.userId}`);
    });
  });

  console.log('[SOCKET] Agent namespace /agent initialise');
}

module.exports = { setupAgentNamespace };
