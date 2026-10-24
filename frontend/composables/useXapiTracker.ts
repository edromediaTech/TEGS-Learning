// Tracker xAPI/cmi5 cote navigateur - emet des statements vers TEGS-Learning.
// Reproduit la logique de cmi5_bridge/tracker.py (CRNS) cote frontend.
// L'actor n'est PAS envoye - le backend l'injecte depuis le JWT (req.user).

const CMI5_VERBS: Record<string, string> = {
  initialized: 'http://adlnet.gov/expapi/verbs/initialized',
  completed:   'http://adlnet.gov/expapi/verbs/completed',
  passed:      'http://adlnet.gov/expapi/verbs/passed',
  failed:      'http://adlnet.gov/expapi/verbs/failed',
  scored:      'http://adlnet.gov/expapi/verbs/scored',
  attempted:   'http://adlnet.gov/expapi/verbs/attempted',
  experienced: 'http://adlnet.gov/expapi/verbs/experienced',
  answered:    'http://adlnet.gov/expapi/verbs/answered',
  suspended:   'http://adlnet.gov/expapi/verbs/suspended',
  terminated:  'http://adlnet.gov/expapi/verbs/terminated',
  voided:      'http://adlnet.gov/expapi/verbs/voided',
};

const VERB_ALIASES: Record<string, string> = {
  interacted: 'experienced',
  launched: 'initialized',
};

const SIMULATION_ACTIVITY_TYPE = 'http://adlnet.gov/expapi/activities/simulation';
const SESSION_EXT = 'https://w3id.org/xapi/cmi5/context/extensions/sessionid';
const EVENT_ID_EXT = 'https://crns.tegs-learning.edu.ht/xapi/extensions/event_id';
const RUNTIME_EXT = 'https://crns.tegs-learning.edu.ht/xapi/extensions/runtime';

export interface XapiEventConfig {
  id?: string;
  xapi_verb?: string;
  xapi_description?: string;
}

export interface XapiSendResult {
  status: number | string;
  id: string;
  error?: string;
}

// === Queue offline (Phase 1.3) ===
// Quand un POST /xapi/statements echoue (network error ou status >= 500),
// on stocke le statement dans localStorage. Un flush() est tente :
//   - apres chaque envoi reussi
//   - apres chaque event 'online' (cf plugin client xapi-replay)
//   - au demarrage de chaque tracker (initialize)
const QUEUE_KEY = 'crns_xapi_offline_queue';

function readQueue(): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: any[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-200))); // cap 200
  } catch {
    // quota / private mode : on perd la trace, tant pis
  }
}

function enqueueStatement(stmt: any): void {
  const q = readQueue();
  q.push({ stmt, queued_at: new Date().toISOString() });
  writeQueue(q);
}

let _flushInProgress = false;
export async function flushXapiQueue(apiFetch: any): Promise<{ flushed: number; failed: number }> {
  if (_flushInProgress) return { flushed: 0, failed: 0 };
  _flushInProgress = true;
  let flushed = 0;
  let failed = 0;
  try {
    const q = readQueue();
    if (!q.length) return { flushed: 0, failed: 0 };
    const remaining: any[] = [];
    for (const item of q) {
      try {
        await apiFetch('/xapi/statements', {
          method: 'POST',
          headers: { 'X-Experience-API-Version': '1.0.3' },
          body: JSON.stringify(item.stmt),
        });
        flushed++;
      } catch {
        // toujours pas joignable : remettre dans la file et arreter
        remaining.push(item);
        failed++;
        // ne pas continuer si le 1er rejoue echoue (probable offline persistant)
        const idx = q.indexOf(item);
        for (let i = idx + 1; i < q.length; i++) remaining.push(q[i]);
        break;
      }
    }
    writeQueue(remaining);
    if (flushed > 0) {
      console.log(`[xapi] flushed ${flushed} queued statement(s), ${remaining.length} still pending`);
    }
  } finally {
    _flushInProgress = false;
  }
  return { flushed, failed };
}

export function getXapiQueueSize(): number {
  return readQueue().length;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeVerb(verbKey: string): string {
  const canonical = VERB_ALIASES[verbKey] ?? verbKey;
  if (!(canonical in CMI5_VERBS)) {
    throw new Error(
      `Verbe xAPI non supporte : ${verbKey} (whitelist: ${Object.keys(CMI5_VERBS).join(', ')})`
    );
  }
  return canonical;
}

export function useXapiTracker(activityId: string) {
  const { apiFetch } = useApi();
  const registration = uuid();
  const sessionId = uuid();
  const activityName = activityId.split('/').pop() || activityId;

  function buildStatement(
    verbKey: string,
    description: string,
    options: { result?: Record<string, any>; extensions?: Record<string, any> } = {}
  ) {
    const verb = normalizeVerb(verbKey);
    const statement: Record<string, any> = {
      id: uuid(),
      verb: {
        id: CMI5_VERBS[verb],
        display: { 'fr-HT': verb, 'en-US': verb },
      },
      object: {
        id: activityId,
        objectType: 'Activity',
        definition: {
          name: { 'fr-HT': activityName },
          description: { 'fr-HT': description },
          type: SIMULATION_ACTIVITY_TYPE,
        },
      },
      timestamp: new Date().toISOString(),
      context: {
        registration,
        extensions: { [SESSION_EXT]: sessionId },
      },
    };
    if (options.result) statement.result = options.result;
    if (options.extensions) Object.assign(statement.context.extensions, options.extensions);
    return statement;
  }

  async function send(statement: Record<string, any>): Promise<XapiSendResult> {
    try {
      const { status } = await apiFetch('/xapi/statements', {
        method: 'POST',
        headers: { 'X-Experience-API-Version': '1.0.3' },
        body: JSON.stringify(statement),
      });
      // Tentative opportuniste de flush la file en cas de retour reseau
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        flushXapiQueue(apiFetch).catch(() => {});
      }
      return { status, id: statement.id };
    } catch (e: any) {
      const status = e?.response?.status ?? 'error';
      const error = e?.data?.error || e?.message || String(e);
      // Si offline ou erreur reseau, on stocke pour rejouer plus tard
      const isNetworkError = !navigator.onLine || status === 'error' || (typeof status === 'number' && status >= 500);
      if (isNetworkError) {
        enqueueStatement(statement);
        console.warn('[xapi] queued offline', verbOf(statement), '(queue=' + getXapiQueueSize() + ')');
      } else {
        console.error('[xapi] echec', verbOf(statement), status, error);
      }
      return { status, id: statement.id, error };
    }
  }

  function verbOf(statement: Record<string, any>): string {
    return statement?.verb?.display?.['fr-HT'] ?? '?';
  }

  function initialize(description = 'Session lancee') {
    // Tentative de flush avant le 1er envoi (sync de progres en attente)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushXapiQueue(apiFetch).catch(() => {});
    }
    return send(buildStatement('initialized', description));
  }

  function terminate(description = 'Session terminee', extensions?: Record<string, any>) {
    return send(buildStatement('terminated', description, extensions ? { extensions } : {}));
  }

  function sendEvent(eventCfg: XapiEventConfig, runtime?: Record<string, any>, extra?: Record<string, any>) {
    const verb = eventCfg.xapi_verb || 'experienced';
    const desc = eventCfg.xapi_description || eventCfg.id || 'event';
    const extensions: Record<string, any> = { [EVENT_ID_EXT]: eventCfg.id, ...(extra || {}) };
    if (runtime) extensions[RUNTIME_EXT] = runtime;
    return send(buildStatement(verb, desc, { extensions }));
  }

  function sendCustom(
    verbKey: string,
    description: string,
    options: { result?: Record<string, any>; extensions?: Record<string, any> } = {}
  ) {
    return send(buildStatement(verbKey, description, options));
  }

  return {
    activityId,
    registration,
    sessionId,
    initialize,
    terminate,
    sendEvent,
    sendCustom,
    buildStatement,
  };
}
