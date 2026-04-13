import { io, type Socket } from 'socket.io-client';

interface TournamentRound {
  order: number;
  label: string;
  status: string;
  promoteTopX: number;
  startTime: string | null;
  endTime: string | null;
}

interface TournamentInfo {
  _id: string;
  title: string;
  description: string;
  status: string;
  currentRound: number;
  rounds: TournamentRound[];
  prizes: Array<{ rank: number; label: string; amount: number; currency: string }>;
  registrationFee: number;
  currency: string;
}

interface BracketParticipant {
  _id: string;
  name: string;
  establishment: string;
  score: number;
  maxScore: number;
  percentage: number;
  duration: string;
  status: string;
}

interface BracketRound {
  order: number;
  label: string;
  status: string;
  promoteTopX: number;
  startTime: string | null;
  endTime: string | null;
  participants: BracketParticipant[];
}

interface PodiumEntry {
  rank: number;
  name: string;
  establishment: string;
  totalScore: number;
  prize: { amount: number; currency: string } | null;
}

interface AdvanceResult {
  round: number;
  label: string;
  qualified: Array<{ name: string; rank: number; percentage: number; durationSec: number | null }>;
  eliminated: Array<{ name: string; percentage: number }>;
  isFinished: boolean;
}

interface BreakingNews {
  type: string;
  round?: string;
  qualifiedCount?: number;
  eliminatedCount?: number;
  leader?: { name: string; rank: number; percentage: number };
}

export function useTournamentSocket() {
  const config = useRuntimeConfig();
  const backendUrl = (config.public.apiBase as string).replace('/api', '');

  const socket = ref<Socket | null>(null);
  const connected = ref(false);

  // State
  const tournament = ref<TournamentInfo | null>(null);
  const bracket = ref<BracketRound[]>([]);
  const podium = ref<PodiumEntry[] | null>(null);
  const participantCount = ref(0);
  const breakingNews = ref<BreakingNews[]>([]);
  const lastAdvance = ref<AdvanceResult | null>(null);
  const error = ref<string | null>(null);

  // Events
  const roundStarted = ref<{ round: TournamentRound; currentRound: number } | null>(null);
  const tournamentFinished = ref<{ podium: PodiumEntry[]; tournamentTitle: string } | null>(null);

  function connectSpectator(shareToken: string) {
    if (socket.value) return;

    const s = io(`${backendUrl}/tournament`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      connected.value = true;
      s.emit('join_tournament', { shareToken });
    });

    s.on('disconnect', () => {
      connected.value = false;
    });

    s.on('error_msg', (data: { message: string }) => {
      error.value = data.message;
    });

    // Tournament state
    s.on('tournament_state', (data: { tournament: TournamentInfo; participantCount?: number }) => {
      tournament.value = data.tournament;
      if (data.participantCount !== undefined) {
        participantCount.value = data.participantCount;
      }
    });

    // Bracket update
    s.on('tournament_bracket', (data: { bracket: BracketRound[]; podium: PodiumEntry[] | null }) => {
      bracket.value = data.bracket;
      if (data.podium) podium.value = data.podium;
    });

    // Round started
    s.on('round_started', (data: any) => {
      roundStarted.value = data;
    });

    // Round advanced
    s.on('round_advanced', (data: AdvanceResult) => {
      lastAdvance.value = data;
    });

    // Breaking news
    s.on('breaking_news', (data: BreakingNews) => {
      breakingNews.value.unshift(data);
      // Keep only last 10
      if (breakingNews.value.length > 10) breakingNews.value.pop();
    });

    // Tournament finished
    s.on('tournament_finished', (data: { podium: PodiumEntry[]; tournamentTitle: string }) => {
      tournamentFinished.value = data;
      podium.value = data.podium;
    });

    socket.value = s;
  }

  function connectAdmin(tournamentId: string, authToken: string) {
    if (socket.value) return;

    const s = io(`${backendUrl}/tournament`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      connected.value = true;
      s.emit('join_admin', { tournamentId, token: authToken });
    });

    s.on('disconnect', () => {
      connected.value = false;
    });

    s.on('error_msg', (data: { message: string }) => {
      error.value = data.message;
    });

    s.on('tournament_state', (data: any) => {
      tournament.value = data.tournament;
      if (data.participantCount !== undefined) {
        participantCount.value = data.participantCount;
      }
    });

    s.on('tournament_bracket', (data: { bracket: BracketRound[]; podium: PodiumEntry[] | null }) => {
      bracket.value = data.bracket;
      if (data.podium) podium.value = data.podium;
    });

    s.on('round_started', (data: any) => {
      roundStarted.value = data;
    });

    s.on('round_advanced', (data: AdvanceResult) => {
      lastAdvance.value = data;
    });

    s.on('breaking_news', (data: BreakingNews) => {
      breakingNews.value.unshift(data);
      if (breakingNews.value.length > 10) breakingNews.value.pop();
    });

    s.on('tournament_finished', (data: { podium: PodiumEntry[]; tournamentTitle: string }) => {
      tournamentFinished.value = data;
      podium.value = data.podium;
    });

    s.on('tournament_participants', (data: any) => {
      // available for admin panel
    });

    socket.value = s;
  }

  // Admin actions
  function emitStartRound() {
    socket.value?.emit('admin_start_round');
  }

  function emitAdvance() {
    socket.value?.emit('admin_advance');
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    // Connection
    connectSpectator,
    connectAdmin,
    disconnect,
    connected,
    error,

    // State
    tournament,
    bracket,
    podium,
    participantCount,
    breakingNews,
    lastAdvance,
    roundStarted,
    tournamentFinished,

    // Admin actions
    emitStartRound,
    emitAdvance,

    // Raw socket
    socket,
  };
}
