<template>
  <div class="tournament-tree">
    <!-- Bracket horizontal scroll -->
    <div class="flex items-start space-x-6 overflow-x-auto pb-6 px-2">
      <div
        v-for="(round, ri) in bracket"
        :key="round.order"
        class="min-w-[300px] shrink-0"
      >
        <!-- Round header -->
        <div class="flex items-center space-x-2 mb-3">
          <!-- Connector line (except first) -->
          <div v-if="ri > 0" class="w-8 h-px" :class="round.status === 'pending' ? 'bg-gray-600' : 'bg-amber-500'"></div>
          <div class="flex items-center space-x-2 flex-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              :class="roundCircleClass(round.status)">
              {{ round.status === 'completed' ? '&#10003;' : round.order }}
            </div>
            <div class="flex-1">
              <div class="font-bold text-sm" :class="dark ? 'text-white' : 'text-gray-900'">{{ round.label }}</div>
              <div class="text-[10px]" :class="dark ? 'text-gray-500' : 'text-gray-400'">
                Top {{ round.promoteTopX }}
                <span v-if="round.status === 'active'" class="text-amber-400 ml-1 font-bold">EN COURS</span>
                <span v-else-if="round.status === 'completed'" class="text-green-400 ml-1">termine</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Participants card -->
        <div class="rounded-2xl overflow-hidden border"
          :class="dark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'">
          <!-- Cutoff line indicator -->
          <div v-if="round.participants.length > 0" class="relative">
            <div
              v-for="(p, pi) in round.participants"
              :key="p._id"
              class="flex items-center space-x-3 px-4 py-2.5 transition-colors"
              :class="[
                participantRowClass(p, pi, round),
                pi < round.participants.length - 1 ? (dark ? 'border-b border-white/5' : 'border-b border-gray-50') : '',
              ]"
            >
              <!-- Rank -->
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                :class="rankClass(pi, p.status)">
                {{ pi + 1 }}
              </div>

              <!-- Name + establishment -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate" :class="dark ? 'text-white' : 'text-gray-900'">
                  {{ p.name }}
                </div>
                <div v-if="p.establishment" class="text-[10px] truncate" :class="dark ? 'text-gray-500' : 'text-gray-400'">
                  {{ p.establishment }}
                </div>
              </div>

              <!-- Score + duration -->
              <div class="text-right shrink-0">
                <div class="text-sm font-bold" :class="scoreColor(p)">
                  {{ p.percentage.toFixed(1) }}%
                </div>
                <div v-if="p.duration" class="text-[10px]" :class="dark ? 'text-gray-500' : 'text-gray-400'">
                  {{ formatDuration(p.duration) }}
                </div>
              </div>

              <!-- Status icon -->
              <div class="w-5 shrink-0 text-center">
                <span v-if="p.status === 'qualified'" class="text-green-400 text-xs font-bold" title="Qualifie">&#9650;</span>
                <span v-else-if="p.status === 'eliminated'" class="text-red-400 text-xs" title="Elimine">&#9660;</span>
              </div>
            </div>

            <!-- Cutoff line -->
            <div v-if="round.status !== 'pending' && round.participants.length > round.promoteTopX"
              class="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/50 pointer-events-none"
              :style="{ top: `${(round.promoteTopX / round.participants.length) * 100}%` }">
              <span class="absolute -top-2.5 right-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
                CUTOFF
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="px-4 py-8 text-center text-sm" :class="dark ? 'text-gray-600' : 'text-gray-400'">
            {{ round.status === 'pending' ? 'En attente' : 'Aucun participant' }}
          </div>
        </div>
      </div>

      <!-- Podium (if finished) -->
      <div v-if="podium && podium.length > 0" class="min-w-[260px] shrink-0">
        <div class="flex items-center space-x-2 mb-3">
          <div class="w-8 h-px bg-green-500"></div>
          <div class="w-8 h-8 bg-yellow-500/30 rounded-full flex items-center justify-center text-yellow-300 font-bold text-sm">
            &#127942;
          </div>
          <div class="font-bold text-sm" :class="dark ? 'text-white' : 'text-gray-900'">Podium</div>
        </div>

        <div class="rounded-2xl overflow-hidden border p-5"
          :class="dark ? 'bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border-yellow-500/20' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'">
          <div class="flex items-end justify-center space-x-4 mb-4">
            <!-- 2nd -->
            <div v-if="podium[1]" class="text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1"
                :class="dark ? 'bg-gray-500/30' : 'bg-gray-200'">
                <span class="text-lg font-black" :class="dark ? 'text-gray-300' : 'text-gray-600'">2</span>
              </div>
              <div class="text-xs font-bold truncate max-w-[80px]" :class="dark ? 'text-gray-300' : 'text-gray-700'">
                {{ podium[1].firstName || podium[1].name }}
              </div>
              <div v-if="podium[1].prize" class="text-[10px] text-green-400 font-medium">
                {{ podium[1].prize.amount }} {{ podium[1].prize.currency }}
              </div>
            </div>
            <!-- 1st -->
            <div v-if="podium[0]" class="text-center -mb-2">
              <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-1 ring-4"
                :class="dark ? 'bg-yellow-500/30 ring-yellow-500/40' : 'bg-yellow-200 ring-yellow-300'">
                <span class="text-2xl font-black" :class="dark ? 'text-yellow-300' : 'text-yellow-700'">1</span>
              </div>
              <div class="text-sm font-extrabold" :class="dark ? 'text-white' : 'text-gray-900'">
                {{ podium[0].firstName || podium[0].name }}
              </div>
              <div v-if="podium[0].prize" class="text-xs text-green-400 font-bold">
                {{ podium[0].prize.amount }} {{ podium[0].prize.currency }}
              </div>
            </div>
            <!-- 3rd -->
            <div v-if="podium[2]" class="text-center">
              <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1"
                :class="dark ? 'bg-orange-500/30' : 'bg-orange-200'">
                <span class="text-base font-black" :class="dark ? 'text-orange-300' : 'text-orange-700'">3</span>
              </div>
              <div class="text-xs font-bold truncate max-w-[80px]" :class="dark ? 'text-gray-300' : 'text-gray-700'">
                {{ podium[2].firstName || podium[2].name }}
              </div>
              <div v-if="podium[2].prize" class="text-[10px] text-green-400 font-medium">
                {{ podium[2].prize.amount }} {{ podium[2].prize.currency }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BracketParticipant {
  _id: string;
  name: string;
  establishment?: string;
  score: number;
  maxScore: number;
  percentage: number;
  duration?: string;
  status: string;
}

interface BracketRound {
  order: number;
  label: string;
  status: string;
  promoteTopX: number;
  participants: BracketParticipant[];
}

interface PodiumEntry {
  rank: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  prize?: { amount: number; currency: string };
}

const props = withDefaults(defineProps<{
  bracket: BracketRound[];
  podium?: PodiumEntry[] | null;
  dark?: boolean;
}>(), {
  podium: null,
  dark: false,
});

function roundCircleClass(status: string) {
  if (status === 'completed') return props.dark ? 'bg-green-500/30 text-green-300' : 'bg-green-100 text-green-700';
  if (status === 'active') return props.dark ? 'bg-amber-500/30 text-amber-300 animate-pulse' : 'bg-amber-100 text-amber-700 animate-pulse';
  return props.dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500';
}

function participantRowClass(p: BracketParticipant, index: number, round: BracketRound) {
  if (p.status === 'qualified') return props.dark ? 'bg-green-500/5' : 'bg-green-50/50';
  if (p.status === 'eliminated') return props.dark ? 'bg-red-500/5 opacity-60' : 'bg-red-50/30 opacity-60';
  return '';
}

function rankClass(index: number, status: string) {
  if (status === 'eliminated') return props.dark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-500';
  if (index === 0) return props.dark ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
  if (index === 1) return props.dark ? 'bg-gray-500/30 text-gray-300' : 'bg-gray-200 text-gray-600';
  if (index === 2) return props.dark ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-100 text-orange-700';
  return props.dark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400';
}

function scoreColor(p: BracketParticipant) {
  if (p.status === 'eliminated') return props.dark ? 'text-red-400' : 'text-red-500';
  if (p.status === 'qualified') return props.dark ? 'text-green-400' : 'text-green-600';
  return props.dark ? 'text-white' : 'text-gray-900';
}

function formatDuration(iso: string) {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return iso;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = Math.round(parseFloat(match[3] || '0'));
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
</script>
