<template>
  <div class="competition-timer" :class="stateClass">
    <!-- SVG circular progress ring -->
    <svg viewBox="0 0 120 120" class="timer-ring">
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        stroke="currentColor"
        stroke-width="6"
        class="ring-bg"
        opacity="0.15"
      />
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        stroke="currentColor"
        stroke-width="6"
        class="ring-progress"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        :style="{ transition: smooth ? 'stroke-dashoffset 1s linear' : 'none' }"
      />
    </svg>

    <!-- Center display -->
    <div class="timer-center">
      <div class="timer-seconds">{{ displaySeconds }}</div>
      <div class="timer-label">{{ label }}</div>
    </div>

    <!-- Hard-lock overlay -->
    <Transition name="lock-fade">
      <div v-if="locked" class="lock-overlay">
        <div class="lock-icon">&#x1F512;</div>
        <div class="lock-text">VERROUILLE</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Total duration in seconds for this question */
  duration: number
  /** Remaining seconds (server-synced via contest_tick) */
  remaining: number
  /** Server timestamp (ms) for latency drift compensation */
  serverTimestamp?: number
  /** Current state */
  status: 'running' | 'paused' | 'frozen' | 'locked' | 'finished'
  /** Optional label under the seconds */
  label?: string
}>()

const emit = defineEmits<{
  (e: 'expired'): void
  (e: 'warning', level: 'low' | 'critical'): void
}>()

const circumference = 2 * Math.PI * 52 // ~326.73
const smooth = ref(true)

// Latency-compensated remaining
const compensatedRemaining = computed(() => {
  if (!props.serverTimestamp || props.status !== 'running') return props.remaining
  const drift = Math.max(0, (Date.now() - props.serverTimestamp) / 1000)
  return Math.max(0, props.remaining - drift)
})

const displaySeconds = computed(() => {
  if (props.status === 'finished') return 'FIN'
  if (props.status === 'frozen' || props.status === 'locked') return '0'
  return Math.ceil(compensatedRemaining.value)
})

const percentage = computed(() => {
  if (props.duration <= 0) return 0
  return Math.max(0, Math.min(100, (compensatedRemaining.value / props.duration) * 100))
})

const dashOffset = computed(() => {
  return circumference * (1 - percentage.value / 100)
})

const locked = computed(() => props.status === 'frozen' || props.status === 'locked')

const stateClass = computed(() => {
  if (locked.value) return 'state-locked'
  if (props.status === 'paused') return 'state-paused'
  if (percentage.value <= 10) return 'state-critical'
  if (percentage.value <= 25) return 'state-warning'
  return 'state-normal'
})

// Emit warnings at thresholds
watch(() => percentage.value, (pct) => {
  if (pct <= 10 && pct > 0) emit('warning', 'critical')
  else if (pct <= 25 && pct > 10) emit('warning', 'low')
})

// Emit expired when reaching 0
watch(() => compensatedRemaining.value, (r) => {
  if (r <= 0 && props.status === 'running') emit('expired')
})
</script>

<style scoped>
.competition-timer {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 1s linear;
}

.timer-center {
  text-align: center;
  z-index: 1;
}

.timer-seconds {
  font-size: 2.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.timer-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
  margin-top: 4px;
}

/* State colors */
.state-normal { color: #3b82f6; }
.state-warning { color: #f59e0b; }
.state-critical { color: #ef4444; animation: pulse-critical 0.5s ease-in-out infinite alternate; }
.state-paused { color: #94a3b8; }
.state-locked { color: #6b7280; }

@keyframes pulse-critical {
  from { opacity: 1; }
  to { opacity: 0.6; }
}

/* Lock overlay */
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  z-index: 10;
}

.lock-icon {
  font-size: 2rem;
}

.lock-text {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #ef4444;
  margin-top: 4px;
}

/* Transition */
.lock-fade-enter-active { transition: opacity 0.3s ease; }
.lock-fade-leave-active { transition: opacity 0.2s ease; }
.lock-fade-enter-from,
.lock-fade-leave-to { opacity: 0; }
</style>
