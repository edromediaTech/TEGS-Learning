<template>
  <div class="live-leaderboard">
    <!-- Header -->
    <div class="lb-header">
      <span class="lb-trophy">&#x1F3C6;</span>
      <span>Classement en direct</span>
      <span class="lb-count">{{ rankings.length }} participants</span>
    </div>

    <!-- Animated list -->
    <div class="lb-body">
      <TransitionGroup name="lb" tag="div" class="lb-list">
        <div
          v-for="entry in displayRankings"
          :key="entry.sessionKey"
          class="lb-row"
          :class="{
            'lb-row--gold': entry.rank === 1,
            'lb-row--silver': entry.rank === 2,
            'lb-row--bronze': entry.rank === 3,
            'lb-row--up': entry._movedUp,
          }"
        >
          <!-- Rank badge -->
          <div
            class="lb-rank"
            :class="{
              'rank-1': entry.rank === 1,
              'rank-2': entry.rank === 2,
              'rank-3': entry.rank === 3,
              'rank-default': entry.rank > 3,
            }"
          >
            {{ entry.rank }}
          </div>

          <!-- Name + streak -->
          <div class="lb-name">
            <span class="lb-name-text">{{ entry.name }}</span>
            <span v-if="(entry.bestStreak || 0) >= 3" class="lb-streak">
              &#x1F525; {{ entry.bestStreak }}
            </span>
            <span v-if="entry._movedUp" class="lb-arrow">&#x2B06;&#xFE0F;</span>
          </div>

          <!-- Score -->
          <div class="lb-score">{{ entry.score }}</div>

          <!-- Percentage -->
          <div class="lb-pct">
            {{ entry.maxScore > 0 ? Math.round((entry.score / entry.maxScore) * 100) : 0 }}%
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Breaking news ticker -->
    <Transition name="ticker-fade">
      <div v-if="tickerItems.length > 0" class="ticker-bar">
        <div class="ticker-badge">FLASH</div>
        <div class="ticker-content">
          <TransitionGroup name="ticker-item" tag="div" class="ticker-items">
            <div
              v-for="(item, idx) in tickerItems"
              :key="item.id"
              class="ticker-item"
            >
              <span class="ticker-icon">{{ item.icon }}</span>
              <span class="ticker-name">{{ item.name }}</span>
              <span class="ticker-msg">{{ item.message }}</span>
              <span v-if="idx < tickerItems.length - 1" class="ticker-sep">&#x25C6;</span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Ranking {
  sessionKey: string
  name: string
  score: number
  maxScore: number
  answeredCount: number
  avgTime: number
  rank: number
  streak?: number
  bestStreak?: number
}

interface BreakingEvent {
  type: 'new_leader' | 'top3_entry' | 'perfect_streak'
  name: string
  rank?: number
  score?: number
  streak?: number
}

interface TickerItem {
  id: number
  icon: string
  name: string
  message: string
}

const props = defineProps<{
  rankings: Ranking[]
  maxDisplay?: number
}>()

const emit = defineEmits<{
  (e: 'leader-change', name: string): void
  (e: 'particles'): void
}>()

const maxRows = computed(() => props.maxDisplay || 20)

// Track previous ranks for move detection
const prevRankMap = ref<Map<string, number>>(new Map())

const displayRankings = computed(() => {
  const prev = prevRankMap.value
  return props.rankings.slice(0, maxRows.value).map(r => ({
    ...r,
    _movedUp: prev.has(r.sessionKey) && (prev.get(r.sessionKey)! > r.rank),
  }))
})

// Update previous ranks whenever rankings change
watch(() => props.rankings, (newVal, oldVal) => {
  if (oldVal && oldVal.length > 0) {
    const map = new Map<string, number>()
    oldVal.forEach(r => map.set(r.sessionKey, r.rank))
    prevRankMap.value = map
  }

  // Detect leader change
  if (newVal.length > 0 && oldVal && oldVal.length > 0) {
    if (newVal[0].sessionKey !== oldVal[0]?.sessionKey) {
      emit('leader-change', newVal[0].name)
      emit('particles')
    }
  }
})

// Breaking news ticker
const tickerItems = ref<TickerItem[]>([])
let tickerIdCounter = 0
let tickerTimer: ReturnType<typeof setTimeout> | null = null

function pushBreakingNews(events: BreakingEvent[]) {
  for (const evt of events) {
    let icon = ''
    let message = ''

    switch (evt.type) {
      case 'new_leader':
        icon = '\u{1F451}'
        message = 'prend la tete du classement !'
        break
      case 'top3_entry':
        icon = evt.rank === 1 ? '\u{1F947}' : evt.rank === 2 ? '\u{1F948}' : '\u{1F949}'
        message = `entre dans le Top ${evt.rank} !`
        break
      case 'perfect_streak':
        icon = '\u{1F525}'
        message = `${evt.streak} bonnes reponses d'affilee !`
        break
      default:
        continue
    }

    tickerItems.value.push({
      id: ++tickerIdCounter,
      icon,
      name: evt.name,
      message,
    })

    if (tickerItems.value.length > 5) {
      tickerItems.value.shift()
    }
  }

  // Auto-clear after 8s
  if (tickerTimer) clearTimeout(tickerTimer)
  tickerTimer = setTimeout(() => {
    tickerItems.value = []
  }, 8000)
}

defineExpose({ pushBreakingNews })
</script>

<style scoped>
.live-leaderboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #111827;
  border-left: 1px solid rgba(255,255,255,0.06);
  position: relative;
}

.lb-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lb-trophy { font-size: 18px; }
.lb-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: none;
  letter-spacing: 0;
}

.lb-body {
  flex: 1;
  overflow: hidden;
}
.lb-list {
  position: relative;
}

/* ═══ ROW ═══ */
.lb-row {
  display: flex;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  height: 56px;
}
.lb-row--gold { background: rgba(251,191,36,0.06); }
.lb-row--up { animation: glow-up 1s ease-out; }

/* ═══ TRANSITION GROUP: v-move makes items glide ═══ */
.lb-move {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.lb-enter-active {
  transition: all 0.4s ease-out;
}
.lb-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
  width: 100%;
}
.lb-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.lb-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

/* ═══ RANK BADGE ═══ */
.lb-rank {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 16px;
  border-radius: 10px;
  flex-shrink: 0;
  margin-right: 14px;
}
.rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; }
.rank-2 { background: linear-gradient(135deg, #94a3b8, #64748b); color: #1a1a2e; }
.rank-3 { background: linear-gradient(135deg, #d97706, #b45309); color: #fff; }
.rank-default { background: #1e293b; color: #94a3b8; }

/* ═══ NAME + STREAK ═══ */
.lb-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.lb-name-text {
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lb-streak {
  font-size: 12px;
  animation: sparkle 0.4s ease-out;
  flex-shrink: 0;
}
.lb-arrow {
  font-size: 12px;
  animation: sparkle 0.4s ease-out;
  flex-shrink: 0;
}

/* ═══ SCORE ═══ */
.lb-score {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-size: 16px;
  color: #3b82f6;
  margin-left: 12px;
  flex-shrink: 0;
}
.lb-pct {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 8px;
  width: 40px;
  text-align: right;
  flex-shrink: 0;
}

/* ═══ TICKER ═══ */
.ticker-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(90deg, #111827, #1a1f35, #111827);
  border-top: 2px solid #fbbf24;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.ticker-badge {
  flex-shrink: 0;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15em;
  padding: 4px 12px;
  margin-right: 12px;
}
.ticker-content {
  flex: 1;
  overflow: hidden;
}
.ticker-items {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}
.ticker-icon { font-size: 16px; }
.ticker-name { color: #fbbf24; }
.ticker-msg { color: #e2e8f0; }
.ticker-sep { color: #475569; font-size: 10px; }

/* Ticker transitions */
.ticker-fade-enter-active { transition: all 0.3s ease-out; }
.ticker-fade-leave-active { transition: all 0.2s ease-in; }
.ticker-fade-enter-from { transform: translateY(100%); opacity: 0; }
.ticker-fade-leave-to { transform: translateY(100%); opacity: 0; }

.ticker-item-enter-active { transition: all 0.4s ease-out; }
.ticker-item-leave-active { transition: all 0.2s ease-in; position: absolute; }
.ticker-item-enter-from { opacity: 0; transform: translateX(30px); }
.ticker-item-leave-to { opacity: 0; }

@keyframes glow-up {
  0% { background: rgba(59,130,246,0.2); }
  100% { background: transparent; }
}
@keyframes sparkle {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
