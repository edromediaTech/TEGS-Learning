<template>
  <div v-if="sponsors.length > 0" class="sponsor-carousel overflow-hidden border rounded-xl px-4 py-2"
    :class="dark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'">
    <div class="flex items-center space-x-2 mb-1" v-if="label">
      <span class="text-[10px] uppercase font-bold" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ label }}</span>
    </div>
    <div class="flex items-center space-x-6 animate-scroll">
      <div v-for="sponsor in displaySponsors" :key="sponsor._id + '-' + sponsor.name"
        class="flex items-center space-x-2 shrink-0">
        <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name"
          class="h-6 w-auto object-contain rounded" />
        <div v-else class="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold"
          :class="tierBg(sponsor.tier)">
          {{ sponsor.name.charAt(0) }}
        </div>
        <span class="text-xs font-medium whitespace-nowrap" :class="dark ? 'text-gray-300' : 'text-gray-600'">
          {{ sponsor.name }}
        </span>
        <span v-if="sponsor.slogan" class="text-[10px] whitespace-nowrap" :class="dark ? 'text-gray-500' : 'text-gray-400'">
          — {{ sponsor.slogan }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Sponsor {
  _id: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  tier: string;
}

const props = withDefaults(defineProps<{
  sponsors: Sponsor[];
  dark?: boolean;
  label?: string;
}>(), {
  dark: true,
  label: 'Partenaires officiels',
});

// Dupliquer pour scroll infini
const displaySponsors = computed(() => {
  if (props.sponsors.length <= 3) return props.sponsors;
  return [...props.sponsors, ...props.sponsors];
});

function tierBg(tier: string) {
  const map: Record<string, string> = {
    diamond: 'bg-blue-500/30 text-blue-300',
    gold: 'bg-yellow-500/30 text-yellow-300',
    silver: 'bg-gray-400/30 text-gray-300',
    bronze: 'bg-orange-500/30 text-orange-300',
  };
  return map[tier] || map.bronze;
}
</script>

<style scoped>
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-scroll {
  animation: scroll 20s linear infinite;
}
.animate-scroll:hover {
  animation-play-state: paused;
}
</style>
