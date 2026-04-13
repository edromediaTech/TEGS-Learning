/**
 * TEGS Waiting Room — Traffic Controller
 *
 * Gère la file d'attente virtuelle pour les événements massifs.
 * - Suit les connexions actives (socket + HTTP sessions)
 * - Queue FIFO avec priorité (candidats > spectateurs)
 * - Libère X personnes toutes les Y secondes
 * - Admin peut forcer le sas manuellement
 */

class TrafficController {
  constructor(options = {}) {
    // Seuil de sessions actives avant activation du sas
    this.maxConcurrent = options.maxConcurrent || 2000;

    // Personnes autorisées par batch (toutes les intervalSeconds)
    this.batchSize = options.batchSize || 50;
    this.intervalMs = (options.intervalSeconds || 30) * 1000;

    // État
    this.activeSessions = 0;
    this.queue = []; // { id, token, priority, joinedAt, tournamentId }
    this.admitted = new Set(); // IDs admis (passent le sas)
    this.forceEnabled = false; // Admin force le sas
    this.forceByTournament = new Map(); // tournamentId → boolean

    // Stats
    this.totalAdmitted = 0;
    this.totalQueued = 0;
    this.peakConcurrent = 0;

    // Timer pour libérer les batches
    this._timer = null;
  }

  /**
   * Démarrer le contrôleur (libération périodique).
   */
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._releaseBatch(), this.intervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Vérifier si un utilisateur doit attendre.
   * @param {string} sessionId - ID unique (IP + session)
   * @param {Object} options
   * @param {string} options.tournamentId
   * @param {string} options.competitionToken - Si présent, priorité haute
   * @returns {{ mustWait: boolean, position: number, estimatedWaitTime: number, admitToken: string|null }}
   */
  checkAccess(sessionId, { tournamentId, competitionToken } = {}) {
    // Déjà admis
    if (this.admitted.has(sessionId)) {
      return { mustWait: false, position: 0, estimatedWaitTime: 0, admitToken: sessionId };
    }

    // Sas activé ?
    const isForced = this.forceEnabled || this.forceByTournament.get(tournamentId) === true;
    const isOverCapacity = this.activeSessions >= this.maxConcurrent;

    if (!isForced && !isOverCapacity) {
      // Pas de file d'attente nécessaire
      this.admitted.add(sessionId);
      this.activeSessions++;
      this.totalAdmitted++;
      if (this.activeSessions > this.peakConcurrent) this.peakConcurrent = this.activeSessions;
      return { mustWait: false, position: 0, estimatedWaitTime: 0, admitToken: sessionId };
    }

    // Chercher dans la queue
    let existing = this.queue.find((q) => q.id === sessionId);
    if (!existing) {
      const priority = competitionToken ? 'high' : 'normal';
      existing = {
        id: sessionId,
        token: competitionToken || null,
        priority,
        joinedAt: Date.now(),
        tournamentId,
      };
      this.queue.push(existing);
      this.totalQueued++;
      this._sortQueue();
    }

    const position = this.queue.findIndex((q) => q.id === sessionId) + 1;
    const batchesNeeded = Math.ceil(position / this.batchSize);
    const estimatedWaitTime = batchesNeeded * (this.intervalMs / 1000);

    return {
      mustWait: true,
      position,
      totalInQueue: this.queue.length,
      estimatedWaitTime, // en secondes
      priority: existing.priority,
    };
  }

  /**
   * Libérer un batch de la queue.
   */
  _releaseBatch() {
    const toRelease = Math.min(this.batchSize, this.queue.length);
    for (let i = 0; i < toRelease; i++) {
      const entry = this.queue.shift();
      if (entry) {
        this.admitted.add(entry.id);
        this.activeSessions++;
        this.totalAdmitted++;
      }
    }
    if (this.activeSessions > this.peakConcurrent) this.peakConcurrent = this.activeSessions;
  }

  /**
   * Trier la queue : high priority d'abord, puis FIFO.
   */
  _sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return a.joinedAt - b.joinedAt;
    });
  }

  /**
   * Décrémenter quand un utilisateur part.
   */
  release(sessionId) {
    this.admitted.delete(sessionId);
    if (this.activeSessions > 0) this.activeSessions--;
  }

  /**
   * Admin : forcer le sas globalement.
   */
  setForceEnabled(enabled) {
    this.forceEnabled = enabled;
  }

  /**
   * Admin : forcer le sas pour un tournoi spécifique.
   */
  setForceForTournament(tournamentId, enabled) {
    this.forceByTournament.set(tournamentId, enabled);
  }

  /**
   * Configurer les paramètres.
   */
  configure({ maxConcurrent, batchSize, intervalSeconds } = {}) {
    if (maxConcurrent !== undefined) this.maxConcurrent = maxConcurrent;
    if (batchSize !== undefined) this.batchSize = batchSize;
    if (intervalSeconds !== undefined) {
      this.intervalMs = intervalSeconds * 1000;
      // Redémarrer le timer
      this.stop();
      this.start();
    }
  }

  /**
   * Stats pour le dashboard admin.
   */
  getStats() {
    return {
      activeSessions: this.activeSessions,
      queueLength: this.queue.length,
      totalAdmitted: this.totalAdmitted,
      totalQueued: this.totalQueued,
      peakConcurrent: this.peakConcurrent,
      maxConcurrent: this.maxConcurrent,
      batchSize: this.batchSize,
      intervalSeconds: this.intervalMs / 1000,
      forceEnabled: this.forceEnabled,
      forcedTournaments: [...this.forceByTournament.entries()].filter(([, v]) => v).map(([k]) => k),
      queueByPriority: {
        high: this.queue.filter((q) => q.priority === 'high').length,
        normal: this.queue.filter((q) => q.priority === 'normal').length,
      },
    };
  }
}

// Singleton global
const trafficController = new TrafficController();
trafficController.start();

module.exports = trafficController;
