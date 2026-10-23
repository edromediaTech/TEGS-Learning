// Connexion Socket.IO au namespace /crns pour le dashboard moniteur live.
// Implementee comme SINGLETON : le plugin client ouvre une seule socket
// partagee entre la page admin/classroom-monitor.vue, le plugin
// crns-launch-listener (eleve auto-redirect) et SimulationViewer (echo des
// events xAPI). Plusieurs `useCrnsClassroomSocket()` => meme connexion + memes
// refs reactives.

import { io, type Socket } from 'socket.io-client';

export interface CrnsRosterEntry {
  userId: string | null;
  role: string;
  name?: string | null;
  socketId: string;
  currentSimulationId?: string | null;
  lastEventId?: string | null;
  lastEventAt?: string | null;
}

export interface CrnsLaunchPayload {
  simulationId: string;
  simulationTitle: string | null;
  launchedBy: string;
  launchedByName: string | null;
  at: string;
}

export interface CrnsStateUpdate {
  userId: string;
  userName: string | null;
  role: string;
  simulationId: string;
  eventId: string;
  xapiVerb: string | null;
  xapiDescription: string | null;
  at: string;
}

const TEACHER_ROLES = new Set(['admin_ddene', 'superadmin', 'teacher']);

// === Etat partage (module-level) ===
let _socket: Socket | null = null;
let _initialized = false;
const _connected = ref(false);
const _roster = ref<Map<string, CrnsRosterEntry>>(new Map());
const _lastLaunch = ref<CrnsLaunchPayload | null>(null);
const _events = ref<CrnsStateUpdate[]>([]);
const _error = ref<string | null>(null);

function getToken(): string | null {
  const session = useCookie<{ token: string; tenant_id: string } | null>('__session').value;
  return session?.token || (useCookie<string>('auth_token').value as string) || null;
}

export function useCrnsClassroomSocket(opts: { name?: string } = {}) {
  const config = useRuntimeConfig();

  function connect(): boolean {
    if (_initialized && _socket) return _connected.value;
    if (import.meta.server) return false;
    const token = getToken();
    if (!token) {
      _error.value = 'session token manquant';
      return false;
    }
    const baseURL = config.public.apiBase?.replace('/api', '') || 'http://localhost:3000';
    _socket = io(`${baseURL}/crns`, {
      path: '/socket.io',
      auth: { token, name: opts.name || null },
      transports: ['websocket', 'polling'],
    });
    _initialized = true;

    _socket.on('connect', () => {
      _connected.value = true;
      _error.value = null;
    });
    _socket.on('disconnect', () => {
      _connected.value = false;
    });
    _socket.on('connect_error', (e: Error) => {
      _error.value = e.message;
    });

    _socket.on('crns:roster', (list: CrnsRosterEntry[]) => {
      const m = new Map<string, CrnsRosterEntry>();
      for (const u of list) if (u.userId) m.set(u.userId, u);
      _roster.value = m;
    });

    _socket.on('crns:user_joined', (u: CrnsRosterEntry) => {
      if (!u.userId) return;
      _roster.value.set(u.userId, u);
      _roster.value = new Map(_roster.value);
    });

    _socket.on('crns:user_left', (u: { userId: string }) => {
      if (!u.userId) return;
      _roster.value.delete(u.userId);
      _roster.value = new Map(_roster.value);
    });

    _socket.on('crns:launch', (p: CrnsLaunchPayload) => {
      _lastLaunch.value = p;
    });

    _socket.on('crns:launch_ack', (p: CrnsLaunchPayload) => {
      _lastLaunch.value = p;
    });

    _socket.on('crns:state_update', (u: CrnsStateUpdate) => {
      _events.value = [u, ..._events.value].slice(0, 200);
      if (u.userId && _roster.value.has(u.userId)) {
        const cur = _roster.value.get(u.userId)!;
        _roster.value.set(u.userId, {
          ...cur,
          currentSimulationId: u.simulationId,
          lastEventId: u.eventId,
          lastEventAt: u.at,
        });
        _roster.value = new Map(_roster.value);
      }
    });

    _socket.on('crns:error', (e: { message: string }) => {
      _error.value = e?.message || 'erreur serveur';
    });

    return true;
  }

  function launch(simulationId: string, simulationTitle: string | null = null): void {
    if (!_socket || !_connected.value) return;
    _socket.emit('crns:launch', { simulationId, simulationTitle });
  }

  function notifyEvent(simulationId: string, eventId: string, xapiVerb?: string | null, xapiDescription?: string | null): void {
    if (!_socket || !_connected.value) return;
    _socket.emit('crns:event', { simulationId, eventId, xapiVerb, xapiDescription });
  }

  function disconnect(): void {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
      _initialized = false;
      _connected.value = false;
      _roster.value = new Map();
    }
  }

  const rosterList = computed(() => Array.from(_roster.value.values()));
  const teachers = computed(() => rosterList.value.filter((u) => TEACHER_ROLES.has(u.role)));
  const students = computed(() => rosterList.value.filter((u) => !TEACHER_ROLES.has(u.role)));

  return {
    connected: _connected,
    roster: _roster,
    rosterList,
    teachers,
    students,
    lastLaunch: _lastLaunch,
    events: _events,
    error: _error,
    connect,
    launch,
    notifyEvent,
    disconnect,
  };
}
