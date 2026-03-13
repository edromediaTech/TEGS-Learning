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

  // =========================================================================
  // TEGSSurveillance — Proctoring module (light / strict)
  // =========================================================================

  class TEGSSurveillance {
    /**
     * @param {Object} opts
     * @param {string} opts.mode           - 'light' | 'strict'
     * @param {Object} opts.strictSettings - { fullscreen, antiCopy, blurDetection, maxBlurCount, autoSubmitOnExceed }
     * @param {TEGSRuntime} [opts.runtime] - Optional runtime instance for xAPI reporting
     * @param {Function} [opts.onExceedBlur] - Callback when blur count exceeds max
     * @param {Function} [opts.onBlur]       - Callback on each blur event
     */
    constructor(opts) {
      this.mode = opts.mode || 'light';
      this.settings = Object.assign(
        { fullscreen: true, antiCopy: true, blurDetection: true, maxBlurCount: 3, autoSubmitOnExceed: false },
        opts.strictSettings || {}
      );
      this.runtime = opts.runtime || null;
      this.onExceedBlur = opts.onExceedBlur || null;
      this.onBlur = opts.onBlur || null;

      this._blurCount = 0;
      this._active = false;
      this._handlers = {};
    }

    /** Get current blur/anomaly count */
    get blurCount() {
      return this._blurCount;
    }

    /** Activate surveillance based on mode */
    activate() {
      if (this._active) return;
      this._active = true;

      if (this.mode === 'strict') {
        if (this.settings.fullscreen) this._enterFullscreen();
        if (this.settings.antiCopy) this._enableAntiCopy();
        if (this.settings.blurDetection) this._enableBlurDetection();
        this._enableFullscreenExitDetection();
      }
      // Light mode: just start — no restrictions
      console.log(`[TEGS-Surveillance] Activated in ${this.mode} mode`);
    }

    /** Deactivate all surveillance listeners */
    deactivate() {
      if (!this._active) return;
      this._active = false;

      // Remove all registered listeners
      for (const [event, handler] of Object.entries(this._handlers)) {
        document.removeEventListener(event, handler);
      }
      window.removeEventListener('blur', this._handlers._windowBlur);
      document.removeEventListener('fullscreenchange', this._handlers._fullscreenChange);
      this._handlers = {};

      console.log('[TEGS-Surveillance] Deactivated');
    }

    /** Report anomaly via xAPI statement */
    async _reportAnomaly(type, details) {
      if (!this.runtime || !this.runtime._initialized) return;
      try {
        const statement = {
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/interacted',
            display: { 'fr-HT': 'anomalie detectee' },
          },
          object: {
            id: this.runtime.activityId,
            objectType: 'Activity',
          },
          context: {
            registration: this.runtime.registration,
            extensions: {
              'https://tegs-learning.edu.ht/ext/session_id': this.runtime.sessionId,
              'https://tegs-learning.edu.ht/ext/anomaly_type': type,
              'https://tegs-learning.edu.ht/ext/anomaly_details': details,
              'https://tegs-learning.edu.ht/ext/blur_count': this._blurCount,
            },
          },
        };
        await this.runtime._postStatement(statement);
      } catch (e) {
        console.warn('[TEGS-Surveillance] Failed to report anomaly:', e.message);
      }
    }

    // --- Fullscreen ---
    _enterFullscreen() {
      const el = document.documentElement;
      const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (request) {
        request.call(el).catch((err) => {
          console.warn('[TEGS-Surveillance] Fullscreen request failed:', err.message);
        });
      }
    }

    _enableFullscreenExitDetection() {
      this._handlers._fullscreenChange = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          this._blurCount++;
          this._reportAnomaly('fullscreen_exit', 'Student exited fullscreen mode');
          if (this.onBlur) this.onBlur('fullscreen_exit', this._blurCount);
          this._checkBlurLimit();
        }
      };
      document.addEventListener('fullscreenchange', this._handlers._fullscreenChange);
      document.addEventListener('webkitfullscreenchange', this._handlers._fullscreenChange);
    }

    // --- Anti-copy ---
    _enableAntiCopy() {
      this._handlers.contextmenu = (e) => { e.preventDefault(); };
      this._handlers.copy = (e) => { e.preventDefault(); };
      this._handlers.cut = (e) => { e.preventDefault(); };
      this._handlers.selectstart = (e) => { e.preventDefault(); };

      document.addEventListener('contextmenu', this._handlers.contextmenu);
      document.addEventListener('copy', this._handlers.copy);
      document.addEventListener('cut', this._handlers.cut);
      document.addEventListener('selectstart', this._handlers.selectstart);
    }

    // --- Blur/Tab switch detection ---
    _enableBlurDetection() {
      this._handlers._windowBlur = () => {
        this._blurCount++;
        this._reportAnomaly('tab_switch', `Tab lost focus (count: ${this._blurCount})`);
        if (this.onBlur) this.onBlur('tab_switch', this._blurCount);
        this._checkBlurLimit();
      };
      window.addEventListener('blur', this._handlers._windowBlur);
    }

    _checkBlurLimit() {
      if (this._blurCount >= this.settings.maxBlurCount) {
        this._reportAnomaly('blur_limit_exceeded', `Max blur count (${this.settings.maxBlurCount}) exceeded`);
        if (this.onExceedBlur) this.onExceedBlur(this._blurCount);
      }
    }
  }

  // Expose globally
  global.TEGSRuntime = TEGSRuntime;
  global.TEGSSurveillance = TEGSSurveillance;
  global.TEGS_VERBS = VERBS;
})(typeof window !== 'undefined' ? window : globalThis);
