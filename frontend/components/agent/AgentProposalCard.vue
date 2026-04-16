<template>
  <div class="mx-3 mb-3 rounded-xl border-2 overflow-hidden" :class="borderClass">
    <!-- Header -->
    <div class="px-4 py-2.5 text-sm font-semibold flex items-center gap-2" :class="headerClass">
      <span v-if="proposal.status === 'pending'" class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      <span v-else-if="proposal.status === 'confirmed'" class="text-green-600">&#x2713;</span>
      <span v-else class="text-red-500">&#x2717;</span>
      <span>{{ statusLabel }}</span>
    </div>

    <!-- Summary -->
    <div class="px-4 py-3 bg-white text-sm text-gray-700">
      <p class="font-medium mb-1">{{ proposal.summary }}</p>
      <div v-if="proposal.details && typeof proposal.details === 'object'" class="text-xs text-gray-500 mt-2 space-y-0.5">
        <div v-for="(val, key) in displayDetails" :key="key">
          <span class="font-medium capitalize">{{ key }}:</span> {{ val }}
        </div>
      </div>
    </div>

    <!-- Actions (only for pending) -->
    <div v-if="proposal.status === 'pending'" class="px-4 py-3 bg-gray-50 flex gap-2 border-t">
      <button
        @click="$emit('confirm', proposal.confirmationId)"
        class="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
      >
        Confirmer
      </button>
      <button
        @click="$emit('reject', proposal.confirmationId)"
        class="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition border border-red-200"
      >
        Annuler
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Proposal {
  confirmationId: string;
  summary: string;
  toolId: string;
  details: any;
  status: 'pending' | 'confirmed' | 'rejected';
}

const props = defineProps<{ proposal: Proposal }>();
defineEmits<{ confirm: [id: string]; reject: [id: string] }>();

const statusLabel = computed(() => {
  switch (props.proposal.status) {
    case 'pending': return 'Action en attente de confirmation';
    case 'confirmed': return 'Action executee';
    case 'rejected': return 'Action annulee';
    default: return '';
  }
});

const borderClass = computed(() => {
  switch (props.proposal.status) {
    case 'pending': return 'border-yellow-300';
    case 'confirmed': return 'border-green-300';
    case 'rejected': return 'border-red-200';
    default: return 'border-gray-200';
  }
});

const headerClass = computed(() => {
  switch (props.proposal.status) {
    case 'pending': return 'bg-yellow-50 text-yellow-800';
    case 'confirmed': return 'bg-green-50 text-green-800';
    case 'rejected': return 'bg-red-50 text-red-700';
    default: return 'bg-gray-50';
  }
});

const displayDetails = computed(() => {
  const d = props.proposal.details;
  if (!d || typeof d !== 'object') return {};
  // Flatten for display, show only string/number values
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(d)) {
    if (typeof val === 'string' || typeof val === 'number') {
      result[key] = String(val);
    } else if (Array.isArray(val)) {
      result[key] = val.join(', ');
    }
  }
  return result;
});
</script>
