<template>
  <div class="min-h-screen bg-gray-50">
    <CommandPalette ref="paletteRef" />

    <!-- Header -->
    <header class="bg-white border-b sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <NuxtLink to="/" class="text-amber-600 font-black text-lg">TEGS</NuxtLink>
          <span class="text-gray-300">/</span>
          <NuxtLink to="/docs" class="text-gray-500 hover:text-gray-700 text-sm font-medium">Centre d'Aide</NuxtLink>
          <span class="text-gray-300">/</span>
          <span class="text-sm font-bold" :class="roleColor">{{ roleLabel }}</span>
        </div>
        <button @click="paletteRef!.open = true"
          class="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-500 transition">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span>Ctrl+K</span>
        </button>
      </div>
    </header>

    <div class="max-w-7xl mx-auto flex">
      <!-- Sidebar -->
      <aside class="w-64 shrink-0 border-r bg-white min-h-[calc(100vh-57px)] hidden md:block">
        <nav class="p-4 space-y-6 sticky top-[57px]">
          <div v-for="section in sidebarSections" :key="section.role">
            <div class="text-[10px] font-bold uppercase tracking-wider mb-2 px-2"
              :class="sectionColor(section.role)">
              {{ section.label }}
            </div>
            <div class="space-y-0.5">
              <NuxtLink v-for="item in section.items" :key="item.path" :to="item.path"
                class="block px-3 py-2 rounded-lg text-sm transition-colors"
                :class="isActive(item.path) ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'">
                {{ item.label }}
              </NuxtLink>
            </div>
          </div>
        </nav>
      </aside>

      <!-- Content -->
      <main class="flex-1 min-w-0 px-6 md:px-12 py-8 max-w-4xl">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommandPalette from '~/components/docs/CommandPalette.vue';

const props = withDefaults(defineProps<{
  role?: string;
}>(), { role: 'candidat' });

const route = useRoute();
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null);

const roleLabel = computed(() => ({
  candidat: 'Candidat', agent: 'Agent', sponsor: 'Sponsor', admin: 'Admin', faq: 'FAQ',
}[props.role] || props.role));

const roleColor = computed(() => ({
  candidat: 'text-blue-600', agent: 'text-green-600', sponsor: 'text-amber-600', admin: 'text-purple-600', faq: 'text-gray-600',
}[props.role] || 'text-gray-600'));

function sectionColor(role: string) {
  return { candidat: 'text-blue-500', agent: 'text-green-500', sponsor: 'text-amber-500', admin: 'text-purple-500' }[role] || 'text-gray-500';
}

function isActive(path: string) {
  return route.path === path;
}

const sidebarSections = [
  {
    role: 'candidat', label: 'Candidat',
    items: [
      { label: 'Comment s\'inscrire', path: '/docs/candidat/inscription' },
      { label: 'Passer le quiz', path: '/docs/candidat/quiz' },
      { label: 'Resultats & classement', path: '/docs/candidat/resultats' },
      { label: 'Recuperer son badge', path: '/docs/candidat/badge' },
    ],
  },
  {
    role: 'agent', label: 'Agent',
    items: [
      { label: 'Collecter un paiement', path: '/docs/agent/collecte' },
      { label: 'Gerer son quota', path: '/docs/agent/quota' },
    ],
  },
  {
    role: 'sponsor', label: 'Sponsor',
    items: [
      { label: 'Packs de visibilite', path: '/docs/sponsor/packs' },
      { label: 'Offrir des bourses', path: '/docs/sponsor/bourses' },
    ],
  },
  {
    role: 'admin', label: 'Administrateur',
    items: [
      { label: 'Creer un tournoi', path: '/docs/admin/tournois' },
      { label: 'Gerer les utilisateurs', path: '/docs/admin/users' },
      { label: 'Piloter le live', path: '/docs/admin/live' },
    ],
  },
];
</script>
