import { io, type Socket } from 'socket.io-client';

interface ArenaInfo {
  moduleId: string;
  title: string;
}

interface ContestState {
  moduleId: string;
  status: 'lobby' | 'countdown' | 'running' | 'frozen' | 'paused' | 'finished';
  currentIndex: number;
  totalQuestions: number;
  currentQuestion: any;
  remaining: number;
  startedAt: string;
  eliminatedCount: number;
  participantCount: number;
}

interface ContestQuestion {
  questionIndex: number;
  totalQuestions: number;
  duration: number;
  remaining: number;
  questionText: string;
  questionType: string;
  points: number;
  serverTimestamp: number;
}

interface ContestTick {
  questionIndex: number;
  remaining: number;
  serverTimestamp: number;
}

interface ContestReveal {
  questionIndex: number;
  questionText: string;
  questionType: string;
  correctAnswer: string | null;
  correctIndex: number;
  explanation: string | null;
  stats: { correct: number; total: number; percentage: number };
  distribution: Array<{ answer: string; count: number; percentage: number; isCorrect: boolean }>;
  revealDuration: number;
}

interface Ranking {
  sessionKey: string;
  name: string;
  establishment: string;
  score: number;
  maxScore: number;
  answeredCount: number;
  avgTime: number;
  streak: number;
  bestStreak: number;
  rank: number;
}

interface BreakingNewsEvent {
  type: 'top3_entry' | 'new_leader' | 'perfect_streak';
  name: string;
  rank?: number;
  score?: number;
  streak?: number;
}

interface EstablishmentStat {
  name: string;
  avgScore: number;
  avgPct: number;
  studentCount: number;
  bestStudent: string;
  bestScore: number;
}

interface ContestEnd {
  reason: string;
  stats: Array<{ questionIndex: number; questionText: string; correct: number; total: number; percentage: number }>;
  rankings: Ranking[];
  establishments: EstablishmentStat[];
}

export function useSpectatorSocket() {
  const config = useRuntimeConfig();
  const backendUrl = (config.public.apiBase as string).replace('/api', '');

  const socket = ref<Socket | null>(null);
  const connected = ref(false);

  // State
  const arenaInfo = ref<ArenaInfo | null>(null);
  const contestState = ref<ContestState | null>(null);
  const question = ref<ContestQuestion | null>(null);
  const remaining = ref(0);
  const rankings = ref<Ranking[]>([]);
  const participantCount = ref(0);
  const reveal = ref<ContestReveal | null>(null);
  const breakingNews = ref<BreakingNewsEvent[]>([]);
  const establishmentStats = ref<EstablishmentStat[]>([]);
  const contestEnd = ref<ContestEnd | null>(null);
  const countdown = ref<number | null>(null);
  const questionStats = ref<{ questionIndex: number; correct: number; total: number; percentage: number } | null>(null);
  const error = ref<string | null>(null);

  // Spotlight
  const spotlight = ref<{ sessionKey: string; studentName: string } | null>(null);

  function connect(shareToken: string) {
    if (socket.value) return;

    const s = io(`${backendUrl}/spectator`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      connected.value = true;
      s.emit('join_arena', { shareToken });
    });

    s.on('disconnect', () => {
      connected.value = false;
    });

    s.on('error_msg', (data: { message: string }) => {
      error.value = data.message;
    });

    // Arena info
    s.on('arena_info', (data: ArenaInfo) => {
      arenaInfo.value = data;
    });

    // Contest lifecycle
    s.on('contest_state', (data: ContestState) => {
      contestState.value = data;
    });

    s.on('contest_start', (data: { totalQuestions: number; startedAt: string; countdown: number }) => {
      countdown.value = data.countdown;
      reveal.value = null;
      contestEnd.value = null;
    });

    s.on('contest_countdown', (data: { value: number }) => {
      countdown.value = data.value;
    });

    s.on('contest_question', (data: ContestQuestion) => {
      question.value = data;
      remaining.value = data.remaining;
      reveal.value = null;
      countdown.value = null;
    });

    s.on('contest_tick', (data: ContestTick) => {
      remaining.value = data.remaining;
    });

    s.on('contest_lock', () => {
      // Question locked — reveal coming soon
    });

    s.on('contest_reveal', (data: ContestReveal) => {
      reveal.value = data;
    });

    s.on('contest_pause', (data: { remaining: number }) => {
      remaining.value = data.remaining;
    });

    s.on('contest_resume', (data: { questionIndex: number; remaining: number }) => {
      remaining.value = data.remaining;
    });

    s.on('contest_rankings', (data: Ranking[]) => {
      rankings.value = data;
    });

    s.on('participant_count', (data: { count: number }) => {
      participantCount.value = data.count;
    });

    s.on('contest_question_stats', (data: any) => {
      questionStats.value = data;
    });

    s.on('contest_breaking_news', (events: BreakingNewsEvent[]) => {
      breakingNews.value = [...breakingNews.value, ...events];
    });

    s.on('contest_establishment_stats', (data: EstablishmentStat[]) => {
      establishmentStats.value = data;
    });

    s.on('contest_end', (data: ContestEnd) => {
      contestEnd.value = data;
    });

    // Spotlight
    s.on('spotlight_start', (data: { sessionKey: string; studentName: string }) => {
      spotlight.value = data;
    });

    s.on('spotlight_stop', () => {
      spotlight.value = null;
    });

    socket.value = s;
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
    }
  }

  function consumeBreakingNews() {
    const events = [...breakingNews.value];
    breakingNews.value = [];
    return events;
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    connected,
    error,
    arenaInfo,
    contestState,
    question,
    remaining,
    rankings,
    participantCount,
    reveal,
    breakingNews,
    consumeBreakingNews,
    establishmentStats,
    contestEnd,
    countdown,
    questionStats,
    spotlight,
  };
}
