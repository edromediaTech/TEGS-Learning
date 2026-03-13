<template>
  <div class="arena-root" :class="phaseClass">
    <!-- ═══════ HEADER BAR ═══════ -->
    <header class="arena-header">
      <div class="header-left">
        <div class="logo-badge">TEGS</div>
        <div class="header-title">
          <h1>{{ arenaInfo?.title || 'Concours National' }}</h1>
          <span class="header-subtitle">LIVE ARENA — DDENE</span>
        </div>
      </div>
      <div class="header-center">
        <div v-if="phase === 'running' || phase === 'frozen'" class="question-badge">
          Question {{ (question?.questionIndex ?? 0) + 1 }} / {{ question?.totalQuestions || contestState?.totalQuestions || '?' }}
        </div>
      </div>
      <div class="header-right">
        <div class="participant-pill">
          <span class="pulse-dot" :class="{ active: connected }"></span>
          {{ participantCount }} participants
        </div>
        <div v-if="phase === 'running'" class="timer-pill" :class="{ urgent: remaining <= 5 }">
          {{ formatTime(remaining) }}
        </div>
      </div>
    </header>

    <!-- ═══════ MAIN CONTENT ═══════ -->
    <main class="arena-main">

      <!-- LOBBY -->
      <div v-if="phase === 'lobby'" class="phase-lobby">
        <div class="lobby-logo">
          <div class="logo-ring">
            <span class="logo-text">TEGS</span>
          </div>
        </div>
        <h2 class="lobby-title">{{ arenaInfo?.title || 'Concours National' }}</h2>
        <p class="lobby-sub">En attente du lancement...</p>
        <div class="lobby-counter">
          <span class="counter-num">{{ participantCount }}</span>
          <span class="counter-label">participants connectés</span>
        </div>
        <div v-if="rankings.length > 0" class="lobby-early-list">
          <div v-for="r in rankings.slice(0, 8)" :key="r.sessionKey" class="lobby-name">
            {{ r.name }} <span v-if="r.establishment" class="est-tag">{{ r.establishment }}</span>
          </div>
        </div>
      </div>

      <!-- COUNTDOWN 3-2-1 -->
      <div v-else-if="phase === 'countdown'" class="phase-countdown">
        <div class="cd-number" :key="countdown">{{ countdown || '...' }}</div>
        <p class="cd-label">Préparez-vous !</p>
      </div>

      <!-- RUNNING: question + leaderboard -->
      <div v-else-if="phase === 'running' || phase === 'paused'" class="phase-running">
        <div class="running-grid">
          <!-- Left: Leaderboard -->
          <div class="leaderboard-panel">
            <h3 class="panel-title">Classement</h3>
            <TransitionGroup name="rank" tag="div" class="rank-list">
              <div
                v-for="(r, i) in rankings"
                :key="r.sessionKey"
                class="rank-row"
                :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }"
              >
                <span class="rank-pos">{{ r.rank }}</span>
                <span class="rank-medal" v-if="i < 3">{{ ['🥇','🥈','🥉'][i] }}</span>
                <div class="rank-info">
                  <span class="rank-name">{{ r.name }}</span>
                  <span v-if="r.establishment" class="rank-est">{{ r.establishment }}</span>
                </div>
                <div class="rank-score">
                  <span class="score-val">{{ r.score }}</span>
                  <span class="score-max">/ {{ r.maxScore }}</span>
                </div>
                <div v-if="r.streak >= 3" class="streak-badge">🔥{{ r.streak }}</div>
              </div>
            </TransitionGroup>
          </div>

          <!-- Right: Question display -->
          <div class="question-panel">
            <div class="q-type-badge">{{ questionTypeLabel(question?.questionType) }}</div>
            <div class="q-points">{{ question?.points || 0 }} pts</div>
            <div class="q-text">{{ question?.questionText }}</div>
            <div v-if="phase === 'paused'" class="pause-overlay">
              <span>⏸ PAUSE</span>
            </div>
            <!-- Live answer stats -->
            <div v-if="questionStats" class="q-live-stats">
              <div class="stat-bar">
                <div class="stat-fill" :style="{ width: questionStats.percentage + '%' }"></div>
              </div>
              <span class="stat-text">{{ questionStats.correct }}/{{ questionStats.total }} correct ({{ questionStats.percentage }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- REVEAL: "Moment de Vérité" -->
      <div v-else-if="phase === 'reveal'" class="phase-reveal">
        <div class="reveal-grid">
          <!-- Left: Leaderboard (animated rank changes) -->
          <div class="leaderboard-panel">
            <h3 class="panel-title">Classement</h3>
            <TransitionGroup name="rank" tag="div" class="rank-list">
              <div
                v-for="(r, i) in rankings"
                :key="r.sessionKey"
                class="rank-row"
                :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }"
              >
                <span class="rank-pos">{{ r.rank }}</span>
                <span class="rank-medal" v-if="i < 3">{{ ['🥇','🥈','🥉'][i] }}</span>
                <div class="rank-info">
                  <span class="rank-name">{{ r.name }}</span>
                  <span v-if="r.establishment" class="rank-est">{{ r.establishment }}</span>
                </div>
                <div class="rank-score">
                  <span class="score-val">{{ r.score }}</span>
                  <span class="score-max">/ {{ r.maxScore }}</span>
                </div>
                <div v-if="r.streak >= 3" class="streak-badge">🔥{{ r.streak }}</div>
              </div>
            </TransitionGroup>
          </div>

          <!-- Right: Answer reveal -->
          <div class="reveal-panel">
            <h3 class="reveal-heading">Moment de Vérité</h3>
            <p class="reveal-question">{{ reveal?.questionText }}</p>
            <div class="reveal-answer">
              <span class="correct-label">Réponse correcte :</span>
              <span class="correct-value">{{ reveal?.correctAnswer || '—' }}</span>
            </div>
            <p v-if="reveal?.explanation" class="reveal-explanation">{{ reveal.explanation }}</p>
            <div class="reveal-stats-bar">
              {{ reveal?.stats.correct }}/{{ reveal?.stats.total }} correct — {{ reveal?.stats.percentage }}%
            </div>
            <!-- Distribution chart -->
            <div class="distribution">
              <div
                v-for="d in reveal?.distribution || []"
                :key="d.answer"
                class="dist-row"
                :class="{ correct: d.isCorrect }"
              >
                <span class="dist-answer">{{ d.answer }}</span>
                <div class="dist-bar-track">
                  <div class="dist-bar-fill" :style="{ width: d.percentage + '%' }"></div>
                </div>
                <span class="dist-pct">{{ d.percentage }}%</span>
                <span class="dist-count">({{ d.count }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FINISHED: Podium -->
      <div v-else-if="phase === 'finished'" class="phase-finished">
        <h2 class="finished-title">Résultats Finaux</h2>

        <!-- Podium top 3 -->
        <div class="podium" v-if="finalRankings.length >= 3">
          <div class="podium-slot second">
            <div class="podium-avatar">🥈</div>
            <div class="podium-name">{{ finalRankings[1]?.name }}</div>
            <div class="podium-score">{{ finalRankings[1]?.score }} pts</div>
            <div class="podium-bar bar-2"></div>
          </div>
          <div class="podium-slot first">
            <div class="podium-avatar">🥇</div>
            <div class="podium-name">{{ finalRankings[0]?.name }}</div>
            <div class="podium-score">{{ finalRankings[0]?.score }} pts</div>
            <div class="podium-bar bar-1"></div>
          </div>
          <div class="podium-slot third">
            <div class="podium-avatar">🥉</div>
            <div class="podium-name">{{ finalRankings[2]?.name }}</div>
            <div class="podium-score">{{ finalRankings[2]?.score }} pts</div>
            <div class="podium-bar bar-3"></div>
          </div>
        </div>

        <!-- Full ranking table -->
        <div class="final-table">
          <div v-for="r in finalRankings" :key="r.sessionKey" class="final-row">
            <span class="final-rank">#{{ r.rank }}</span>
            <span class="final-name">{{ r.name }}</span>
            <span v-if="r.establishment" class="final-est">{{ r.establishment }}</span>
            <span class="final-score">{{ r.score }} / {{ r.maxScore }}</span>
            <span class="final-pct">{{ r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0 }}%</span>
          </div>
        </div>

        <!-- Establishment ranking -->
        <div v-if="finalEstablishments.length > 0" class="est-section">
          <h3>Classement par Établissement</h3>
          <div v-for="(e, i) in finalEstablishments" :key="e.name" class="est-row">
            <span class="est-rank">#{{ i + 1 }}</span>
            <span class="est-name">{{ e.name }}</span>
            <span class="est-avg">{{ e.avgPct }}%</span>
            <span class="est-count">{{ e.studentCount }} élèves</span>
          </div>
        </div>
      </div>

      <!-- ERROR -->
      <div v-if="error" class="error-banner">{{ error }}</div>
    </main>

    <!-- ═══════ BREAKING NEWS TICKER ═══════ -->
    <div class="ticker-bar" v-if="tickerItems.length > 0">
      <div class="ticker-track">
        <span v-for="(item, i) in tickerItems" :key="i" class="ticker-item">
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const shareToken = route.params.token as string;

const {
  connect,
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
  establishmentStats,
  contestEnd,
  countdown,
  questionStats,
} = useSpectatorSocket();

// Connect on mount
onMounted(() => {
  connect(shareToken);
});

// Compute current phase
const phase = computed(() => {
  if (contestEnd.value) return 'finished';
  if (reveal.value) return 'reveal';
  const status = contestState.value?.status;
  if (!status || status === 'lobby') return 'lobby';
  if (status === 'countdown' || countdown.value !== null && countdown.value > 0) return 'countdown';
  if (status === 'paused') return 'paused';
  if (status === 'frozen') return 'reveal';
  if (status === 'running') return 'running';
  if (status === 'finished') return 'finished';
  return 'lobby';
});

const phaseClass = computed(() => `phase-is-${phase.value}`);

// Final data
const finalRankings = computed(() => contestEnd.value?.rankings || rankings.value);
const finalEstablishments = computed(() => contestEnd.value?.establishments || establishmentStats.value);

// Breaking news ticker
const tickerItems = ref<string[]>([]);
const newsQueue = ref<string[]>([]);

watch(breakingNews, (events) => {
  for (const ev of events) {
    let text = '';
    if (ev.type === 'new_leader') {
      text = `⚡ NOUVEAU LEADER : ${ev.name} prend la tête avec ${ev.score} pts !`;
    } else if (ev.type === 'top3_entry') {
      text = `🏆 ${ev.name} entre dans le Top 3 (#${ev.rank}) !`;
    } else if (ev.type === 'perfect_streak') {
      text = `🔥 ${ev.name} enchaîne ${ev.streak} bonnes réponses d'affilée !`;
    }
    if (text) newsQueue.value.push(text);
  }
}, { deep: true });

// Rotate ticker items
let tickerTimer: any = null;
onMounted(() => {
  tickerTimer = setInterval(() => {
    // Add pending news
    if (newsQueue.value.length > 0) {
      tickerItems.value.push(...newsQueue.value.splice(0));
    }
    // Keep max 10 items, remove oldest
    if (tickerItems.value.length > 10) {
      tickerItems.value = tickerItems.value.slice(-10);
    }
  }, 1000);
});
onUnmounted(() => {
  if (tickerTimer) clearInterval(tickerTimer);
});

// Clear reveal when new question arrives
watch(question, () => {
  reveal.value = null;
});

// Helpers
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

function questionTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    quiz: 'QCM',
    true_false: 'Vrai / Faux',
    numeric: 'Numérique',
    fill_blank: 'Texte à trou',
    matching: 'Appariement',
    sequence: 'Séquence',
    open_answer: 'Réponse ouverte',
  };
  return labels[type || ''] || type || '';
}
</script>

<style scoped>
/* ═══════ BASE ═══════ */
.arena-root {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ═══════ HEADER ═══════ */
.arena-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 2px solid #1e40af;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-badge {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  font-weight: 800;
  font-size: 1.25rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  letter-spacing: 2px;
}

.header-title h1 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #f1f5f9;
}

.header-subtitle {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.header-center {
  flex: 1;
  text-align: center;
}

.question-badge {
  display: inline-block;
  background: #1e40af;
  padding: 0.35rem 1.2rem;
  border-radius: 2rem;
  font-weight: 700;
  font-size: 0.95rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.participant-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #1e293b;
  padding: 0.35rem 0.8rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  border: 1px solid #334155;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
}
.pulse-dot.active {
  background: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.timer-pill {
  background: #1e40af;
  padding: 0.35rem 1rem;
  border-radius: 1rem;
  font-weight: 700;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  min-width: 4rem;
  text-align: center;
}
.timer-pill.urgent {
  background: #dc2626;
  animation: timer-pulse 0.5s infinite alternate;
}

@keyframes timer-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

/* ═══════ MAIN ═══════ */
.arena-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
}

/* ═══════ LOBBY ═══════ */
.phase-lobby {
  text-align: center;
}

.lobby-logo {
  margin-bottom: 2rem;
}

.logo-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #1e40af;
  animation: ring-rotate 6s linear infinite;
}

@keyframes ring-rotate {
  from { box-shadow: 0 0 30px rgba(30, 64, 175, 0.3), inset 0 0 30px rgba(30, 64, 175, 0.1); }
  50% { box-shadow: 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 40px rgba(59, 130, 246, 0.2); }
  to { box-shadow: 0 0 30px rgba(30, 64, 175, 0.3), inset 0 0 30px rgba(30, 64, 175, 0.1); }
}

.logo-text {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #3b82f6, #f59e0b);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lobby-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
}

.lobby-sub {
  color: #94a3b8;
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.lobby-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 2rem;
}

.counter-num {
  font-size: 4rem;
  font-weight: 900;
  color: #3b82f6;
  line-height: 1;
}

.counter-label {
  color: #64748b;
  font-size: 0.9rem;
}

.lobby-early-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  max-width: 600px;
  margin: 0 auto;
}

.lobby-name {
  background: #1e293b;
  padding: 0.3rem 0.8rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  border: 1px solid #334155;
}

.est-tag {
  color: #64748b;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

/* ═══════ COUNTDOWN ═══════ */
.phase-countdown {
  text-align: center;
}

.cd-number {
  font-size: 12rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(180deg, #f59e0b, #dc2626);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: cd-pop 1s ease-out;
}

@keyframes cd-pop {
  from { transform: scale(2); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.cd-label {
  font-size: 1.5rem;
  color: #94a3b8;
  margin-top: 1rem;
}

/* ═══════ RUNNING GRID ═══════ */
.running-grid, .reveal-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 1.5rem;
  width: 100%;
  max-width: 1400px;
  height: calc(100vh - 120px);
  align-items: start;
}

/* ═══════ LEADERBOARD PANEL ═══════ */
.leaderboard-panel {
  background: #1e293b;
  border-radius: 1rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  border: 1px solid #334155;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.8rem;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: #0f172a;
  transition: all 0.5s ease;
}

.rank-row.gold { background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); border: 1px solid rgba(245, 158, 11, 0.3); }
.rank-row.silver { background: linear-gradient(135deg, rgba(156, 163, 175, 0.15), rgba(156, 163, 175, 0.05)); border: 1px solid rgba(156, 163, 175, 0.3); }
.rank-row.bronze { background: linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(217, 119, 6, 0.05)); border: 1px solid rgba(217, 119, 6, 0.3); }

.rank-pos {
  font-weight: 800;
  font-size: 1rem;
  min-width: 1.5rem;
  text-align: center;
  color: #64748b;
}

.rank-row.gold .rank-pos { color: #f59e0b; }
.rank-row.silver .rank-pos { color: #9ca3af; }
.rank-row.bronze .rank-pos { color: #d97706; }

.rank-medal {
  font-size: 1.2rem;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-weight: 600;
  font-size: 0.9rem;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-est {
  font-size: 0.7rem;
  color: #64748b;
  display: block;
}

.rank-score {
  text-align: right;
  white-space: nowrap;
}

.score-val {
  font-weight: 700;
  font-size: 1rem;
  color: #3b82f6;
}

.score-max {
  font-size: 0.75rem;
  color: #475569;
}

.streak-badge {
  font-size: 0.75rem;
  background: rgba(239, 68, 68, 0.2);
  padding: 0.15rem 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* TransitionGroup animation */
.rank-move { transition: transform 0.6s ease; }
.rank-enter-active { transition: all 0.4s ease; }
.rank-leave-active { transition: all 0.3s ease; position: absolute; }
.rank-enter-from { opacity: 0; transform: translateX(-20px); }
.rank-leave-to { opacity: 0; transform: translateX(20px); }

/* ═══════ QUESTION PANEL ═══════ */
.question-panel {
  background: #1e293b;
  border-radius: 1rem;
  padding: 2rem;
  position: relative;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.q-type-badge {
  background: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.q-points {
  color: #f59e0b;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.q-text {
  font-size: 1.6rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
  max-width: 700px;
}

.pause-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  font-size: 3rem;
  font-weight: 900;
  color: #f59e0b;
}

.q-live-stats {
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
}

.stat-bar {
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.35rem;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #3b82f6);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.stat-text {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* ═══════ REVEAL PANEL ═══════ */
.reveal-panel {
  background: #1e293b;
  border-radius: 1rem;
  padding: 2rem;
  border: 1px solid #334155;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.reveal-heading {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f59e0b;
  margin: 0 0 1rem;
  text-align: center;
}

.reveal-question {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  text-align: center;
}

.reveal-answer {
  text-align: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 0.75rem;
}

.correct-label {
  color: #94a3b8;
  font-size: 0.85rem;
  display: block;
  margin-bottom: 0.25rem;
}

.correct-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #22c55e;
}

.reveal-explanation {
  background: #0f172a;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 1rem;
  border-left: 3px solid #3b82f6;
}

.reveal-stats-bar {
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

/* Distribution chart */
.distribution {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dist-row.correct .dist-answer { color: #22c55e; font-weight: 700; }

.dist-answer {
  width: 120px;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  flex-shrink: 0;
}

.dist-bar-track {
  flex: 1;
  height: 24px;
  background: #0f172a;
  border-radius: 4px;
  overflow: hidden;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease;
  background: #475569;
}

.dist-row.correct .dist-bar-fill {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.dist-pct {
  font-size: 0.85rem;
  font-weight: 600;
  width: 40px;
  text-align: right;
}

.dist-count {
  font-size: 0.75rem;
  color: #64748b;
  width: 30px;
}

/* ═══════ FINISHED ═══════ */
.phase-finished {
  text-align: center;
  width: 100%;
  max-width: 900px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
  padding: 1rem;
}

.finished-title {
  font-size: 2rem;
  font-weight: 900;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #f59e0b, #3b82f6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Podium */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
}

.podium-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 180px;
}

.podium-avatar {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.podium-name {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.podium-score {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.podium-bar {
  width: 100%;
  border-radius: 0.5rem 0.5rem 0 0;
}

.bar-1 { height: 160px; background: linear-gradient(180deg, #f59e0b, #b45309); }
.bar-2 { height: 120px; background: linear-gradient(180deg, #9ca3af, #6b7280); }
.bar-3 { height: 90px; background: linear-gradient(180deg, #d97706, #92400e); }

/* Final table */
.final-table {
  max-width: 700px;
  margin: 0 auto 2rem;
}

.final-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #1e293b;
}

.final-row:nth-child(-n+3) { background: rgba(30, 64, 175, 0.1); }

.final-rank {
  font-weight: 800;
  width: 2.5rem;
  color: #64748b;
}

.final-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.final-est {
  color: #64748b;
  font-size: 0.8rem;
}

.final-score {
  font-weight: 600;
  color: #3b82f6;
}

.final-pct {
  font-weight: 700;
  min-width: 3rem;
  text-align: right;
}

/* Establishment section */
.est-section {
  max-width: 600px;
  margin: 0 auto;
}

.est-section h3 {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 1rem;
}

.est-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #1e293b;
}

.est-rank { font-weight: 700; color: #64748b; width: 2rem; }
.est-name { flex: 1; font-weight: 600; text-align: left; }
.est-avg { font-weight: 700; color: #f59e0b; }
.est-count { font-size: 0.8rem; color: #64748b; }

/* ═══════ ERROR ═══════ */
.error-banner {
  position: fixed;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  z-index: 100;
}

/* ═══════ TICKER ═══════ */
.ticker-bar {
  flex-shrink: 0;
  background: linear-gradient(90deg, #1e40af, #0f172a);
  padding: 0.5rem 0;
  overflow: hidden;
  border-top: 1px solid #334155;
  white-space: nowrap;
}

.ticker-track {
  display: inline-flex;
  gap: 4rem;
  animation: ticker-scroll 30s linear infinite;
}

@keyframes ticker-scroll {
  from { transform: translateX(100vw); }
  to { transform: translateX(-100%); }
}

.ticker-item {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f59e0b;
  flex-shrink: 0;
}

/* ═══════ RESPONSIVE ═══════ */
@media (max-width: 900px) {
  .running-grid, .reveal-grid {
    grid-template-columns: 1fr;
  }
  .leaderboard-panel {
    max-height: 250px;
  }
}
</style>
