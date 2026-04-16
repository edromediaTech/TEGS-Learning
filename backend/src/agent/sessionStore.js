/**
 * Store de sessions de conversation agentique en memoire.
 *
 * Chaque session garde l'historique des messages pour que l'utilisateur
 * puisse dire "Change la date du tournoi dont on vient de parler".
 *
 * TTL : 2 heures d'inactivite.
 * Cleanup : toutes les 30 minutes.
 */

const MAX_MESSAGES = 20; // Nombre max de messages par session
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const sessions = new Map();

/**
 * Recupere ou cree une session pour un utilisateur.
 *
 * @param {string} userId
 * @param {string} tenantId
 * @returns {{ sessionId: string, messages: Array, isNew: boolean }}
 */
function getOrCreateSession(userId, tenantId) {
  // Chercher une session existante pour cet utilisateur
  for (const [sessionId, session] of sessions) {
    if (session.userId === userId && session.tenantId === tenantId) {
      session.lastActivity = Date.now();
      return { sessionId, messages: session.messages, isNew: false };
    }
  }

  // Creer une nouvelle session
  const sessionId = `agent:${userId}:${Date.now().toString(36)}`;
  const session = {
    userId,
    tenantId,
    messages: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  sessions.set(sessionId, session);
  return { sessionId, messages: session.messages, isNew: true };
}

/**
 * Recupere une session par ID.
 *
 * @param {string} sessionId
 * @returns {object|null}
 */
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastActivity = Date.now();
  return session;
}

/**
 * Ajoute un message a la session.
 *
 * @param {string} sessionId
 * @param {'user'|'assistant'|'tool_result'} role
 * @param {string} content
 */
function addMessage(sessionId, role, content) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.messages.push({
    role,
    content: typeof content === 'string' ? content : JSON.stringify(content),
    timestamp: Date.now(),
  });

  // Garder les N derniers messages
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  session.lastActivity = Date.now();
}

/**
 * Retourne les derniers messages de la session.
 *
 * @param {string} sessionId
 * @param {number} limit
 * @returns {Array}
 */
function getHistory(sessionId, limit = 10) {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return session.messages.slice(-limit);
}

/**
 * Supprime une session.
 */
function clearSession(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Supprime toutes les sessions d'un utilisateur.
 */
function clearUserSessions(userId) {
  for (const [sessionId, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Supprime TOUTES les sessions (pour Panic Mode).
 */
function clearAllSessions() {
  const count = sessions.size;
  sessions.clear();
  return count;
}

/**
 * Nombre de sessions actives.
 */
function activeSessionCount() {
  return sessions.size;
}

// Nettoyage periodique des sessions expirees
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[AGENT-SESSION] Cleanup: ${cleaned} session(s) expiree(s) supprimee(s)`);
  }
}, CLEANUP_INTERVAL_MS);

module.exports = {
  getOrCreateSession,
  getSession,
  addMessage,
  getHistory,
  clearSession,
  clearUserSessions,
  clearAllSessions,
  activeSessionCount,
};
