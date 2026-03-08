/**
 * TEGS-Learning Runtime Tracking Library (cmi5)
 *
 * Injecte dans le player HTML pour envoyer les verbes xAPI/cmi5 au LRS.
 * Utilise les credentials recuperes via le fetch endpoint (Sprint 5).
 *
 * Verbes geres :
 *   - Initialized  : debut de session
 *   - Experienced   : navigation entre ecrans
 *   - Passed/Failed : resultat d'un quiz
 *   - Completed     : fin du contenu
 *   - Terminated    : fermeture de la session
 *
 * Usage :
 *   const runtime = new TEGSRuntime({ endpoint, authToken, registration, activityId, actor });
 *   await runtime.initialize();
 *   await runtime.experienced(screenTitle);
 *   await runtime.passed(0.85);
 *   await runtime.completed();
 *   await runtime.terminate();
 */

(function (global) {
  'use strict';

  // cmi5 verb IRIs
  const VERBS = {
    initialized: {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: { 'fr-HT': 'a initialise' },
    },
    experienced: {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: { 'fr-HT': 'a consulte' },
    },
    passed: {
      id: 'http://adlnet.gov/expapi/verbs/passed',
      display: { 'fr-HT': 'a reussi' },
    },
    failed: {
      id: 'http://adlnet.gov/expapi/verbs/failed',
      display: { 'fr-HT': 'a echoue' },
    },
    completed: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
    terminated: {
      id: 'http://adlnet.gov/expapi/verbs/terminated',
      display: { 'fr-HT': 'a mis fin' },
    },
  };

  // Retry queue for failed sends
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // ms

  class TEGSRuntime {
    /**
     * @param {Object} opts
     * @param {string} opts.endpoint   - LRS endpoint (e.g. http://localhost:3000/api/xapi)
     * @param {string} opts.authToken  - Auth token from cmi5 fetch
     * @param {string} opts.registration - cmi5 registration ID
     * @param {string} opts.activityId - Activity IRI
     * @param {Object} opts.actor      - xAPI Agent object
     * @param {string} opts.sessionId  - LaunchSession _id
     */
    constructor(opts) {
      this.endpoint = opts.endpoint;
      this.authToken = opts.authToken;
      this.registration = opts.registration;
      this.activityId = opts.activityId;
      this.actor = opts.actor;
      this.sessionId = opts.sessionId;

      this._initialized = false;
      this._terminated = false;
      this._startTime = null;
      this._retryQueue = [];
      this._log = [];
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /** Send Initialized verb — must be called first */
    async initialize() {
      if (this._initialized) {
        console.warn('[TEGS-Runtime] Already initialized');
        return;
      }
      this._startTime = new Date();

      const result = await this._sendStatement(VERBS.initialized);
      if (result) {
        this._initialized = true;
        // Update session status to launched
        await this._updateSessionStatus('launched');
      }
      return result;
    }

    /** Send Experienced verb — call on screen navigation */
    async experienced(screenTitle) {
      this._ensureInitialized();
      return this._sendStatement(VERBS.experienced, {
        object: screenTitle
          ? {
              definition: {
                name: { 'fr-HT': screenTitle },
                type: 'http://adlnet.gov/expapi/activities/media',
              },
            }
          : undefined,
      });
    }

    /** Send Passed verb with score */
    async passed(scaledScore, rawScore, maxScore) {
      this._ensureInitialized();
      return this._sendStatement(VERBS.passed, {
        result: {
          score: {
            scaled: scaledScore,
            raw: rawScore !== undefined ? rawScore : Math.round(scaledScore * 100),
            min: 0,
            max: maxScore !== undefined ? maxScore : 100,
          },
          success: true,
          completion: true,
        },
      });
    }

    /** Send Failed verb with score */
    async failed(scaledScore, rawScore, maxScore) {
      this._ensureInitialized();
      return this._sendStatement(VERBS.failed, {
        result: {
          score: {
            scaled: scaledScore,
            raw: rawScore !== undefined ? rawScore : Math.round(scaledScore * 100),
            min: 0,
            max: maxScore !== undefined ? maxScore : 100,
          },
          success: false,
          completion: true,
        },
      });
    }

    /** Send Completed verb — content fully consumed */
    async completed() {
      this._ensureInitialized();
      const duration = this._isoDuration();
      const result = await this._sendStatement(VERBS.completed, {
        result: { completion: true, duration },
      });
      if (result) {
        await this._updateSessionStatus('completed');
      }
      return result;
    }

    /** Send Terminated verb — must be called last */
    async terminate() {
      if (this._terminated) {
        console.warn('[TEGS-Runtime] Already terminated');
        return;
      }
      if (!this._initialized) {
        console.warn('[TEGS-Runtime] Cannot terminate: not initialized');
        return;
      }

      const duration = this._isoDuration();
      const result = await this._sendStatement(VERBS.terminated, {
        result: { duration },
      });
      if (result) {
        this._terminated = true;
        await this._updateSessionStatus('terminated');
      }

      // Flush retry queue
      await this._flushRetryQueue();
      return result;
    }

    /** Save bookmark state (current screen) */
    async saveState(stateData) {
      try {
        const url = `${this.endpoint.replace('/xapi', '/cmi5')}/state/${this.sessionId}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.authToken}`,
          },
          body: JSON.stringify(stateData),
        });
        return res.ok;
      } catch (e) {
        console.warn('[TEGS-Runtime] saveState failed:', e.message);
        return false;
      }
    }

    /** Restore bookmark state */
    async getState() {
      try {
        const url = `${this.endpoint.replace('/xapi', '/cmi5')}/state/${this.sessionId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.authToken}` },
        });
        if (res.ok) return res.json();
        return null;
      } catch (e) {
        console.warn('[TEGS-Runtime] getState failed:', e.message);
        return null;
      }
    }

    /** Get log of all sent statements */
    getLog() {
      return [...this._log];
    }

    // -----------------------------------------------------------------------
    // Internal methods
    // -----------------------------------------------------------------------

    _ensureInitialized() {
      if (!this._initialized) {
        throw new Error('[TEGS-Runtime] Must call initialize() first');
      }
      if (this._terminated) {
        throw new Error('[TEGS-Runtime] Session already terminated');
      }
    }

    _isoDuration() {
      if (!this._startTime) return 'PT0S';
      const ms = Date.now() - this._startTime.getTime();
      const seconds = Math.floor(ms / 1000);
      return `PT${seconds}S`;
    }

    async _sendStatement(verb, extras = {}) {
      const statement = {
        verb: { id: verb.id, display: verb.display },
        object: {
          id: this.activityId,
          objectType: 'Activity',
          ...(extras.object || {}),
        },
        context: {
          registration: this.registration,
          extensions: {
            'https://tegs-learning.edu.ht/ext/session_id': this.sessionId,
          },
        },
      };

      if (extras.result) {
        statement.result = extras.result;
      }

      const entry = { verb: verb.id, timestamp: new Date().toISOString(), sent: false };
      this._log.push(entry);

      try {
        const res = await this._postStatement(statement);
        entry.sent = true;
        entry.statementId = res.statementId;
        return res;
      } catch (err) {
        console.warn(`[TEGS-Runtime] Failed to send ${verb.id}:`, err.message);
        entry.error = err.message;
        // Add to retry queue
        this._retryQueue.push({ statement, retries: 0, entry });
        return null;
      }
    }

    async _postStatement(statement) {
      const url = `${this.endpoint}/statements`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(statement),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return res.json();
    }

    async _updateSessionStatus(status) {
      if (!this.sessionId) return;
      try {
        const url = `${this.endpoint.replace('/xapi', '/cmi5')}/session/${this.sessionId}/status`;
        await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.authToken}`,
          },
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('[TEGS-Runtime] Session status update failed:', e.message);
      }
    }

    async _flushRetryQueue() {
      for (const item of this._retryQueue) {
        if (item.entry.sent) continue;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
            const res = await this._postStatement(item.statement);
            item.entry.sent = true;
            item.entry.statementId = res.statementId;
            break;
          } catch (e) {
            console.warn(`[TEGS-Runtime] Retry ${attempt + 1}/${MAX_RETRIES} failed`);
          }
        }
      }
    }
  }

  // Expose globally
  global.TEGSRuntime = TEGSRuntime;
  global.TEGS_VERBS = VERBS;
})(typeof window !== 'undefined' ? window : globalThis);
