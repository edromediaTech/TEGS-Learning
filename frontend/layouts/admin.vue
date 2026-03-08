<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Sidebar Navigation -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col text-white transition-all duration-300 shadow-xl"
      :class="sidebarOpen ? 'w-56' : 'w-16'"
      style="background: linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)"
    >
      <!-- Logo -->
      <div class="flex items-center h-14 px-3 border-b border-white/10">
        <div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <img src="/logo.png" alt="TEGS" class="h-6 w-6 rounded" />
        </div>
        <transition name="fade">
          <div v-if="sidebarOpen" class="ml-2.5 min-w-0">
            <span class="text-sm font-extrabold tracking-tight">TEGS</span>
            <span class="text-[10px] text-blue-300 block -mt-0.5">Learning LCMS</span>
          </div>
        </transition>
      </div>

      <!-- Toggle -->
      <button
        @click="sidebarOpen = !sidebarOpen"
        class="absolute -right-3 top-16 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 rounded-full flex items-center justify-center text-xs shadow-lg border-2 border-gray-50 text-white"
      >
        {{ sidebarOpen ? '\u2039' : '\u203A' }}
      </button>

      <!-- Navigation -->
      <nav class="flex-1 py-4 space-y-1 overflow-y-auto px-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group"
          :class="isActive(item.to)
            ? 'bg-white/20 text-white shadow-md backdrop-blur-sm font-bold'
            : 'text-blue-200 hover:bg-white/10 hover:text-white'"
        >
          <span class="text-lg flex-shrink-0 w-7 text-center">{{ item.icon }}</span>
          <transition name="fade">
            <span v-if="sidebarOpen" class="ml-2 truncate">{{ item.label }}</span>
          </transition>
          <transition name="fade">
            <span v-if="sidebarOpen && isActive(item.to)" class="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          </transition>
        </NuxtLink>
      </nav>

      <!-- User info -->
      <div class="border-t border-white/10 p-3">
        <div class="flex items-center">
          <div class="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md">
            {{ initials }}
          </div>
          <transition name="fade">
            <div v-if="sidebarOpen" class="ml-2.5 min-w-0 flex-1">
              <p class="text-xs font-bold truncate">{{ auth.fullName }}</p>
              <span class="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/15 text-blue-200 mt-0.5">{{ roleLabel }}</span>
            </div>
          </transition>
        </div>
        <button
          @click="auth.logout()"
          class="mt-2.5 flex items-center text-xs text-blue-300 hover:text-white transition w-full rounded-lg hover:bg-white/10 px-2 py-1.5"
          :class="!sidebarOpen ? 'justify-center' : ''"
        >
          <span class="text-sm">&#x2190;</span>
          <transition name="fade">
            <span v-if="sidebarOpen" class="ml-2">Deconnexion</span>
          </transition>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 transition-all duration-300" :class="sidebarOpen ? 'ml-56' : 'ml-16'">
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();

const sidebarOpen = ref(true);

const roleLabels: Record<string, string> = {
  superadmin: 'SuperAdmin',
  admin_ddene: 'Admin DDENE',
  teacher: 'Enseignant',
  student: 'Eleve',
};
const roleLabel = computed(() => roleLabels[auth.user?.role || ''] || auth.user?.role);

const initials = computed(() => {
  const name = auth.fullName || '';
  return name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
});

const navItems = computed(() => {
  const items = [];
  if (auth.isSuperAdmin) {
    items.push({ to: '/admin/tenants', label: 'Ecoles', icon: '\uD83C\uDFEB' });
  }
  if (auth.isSuperAdmin || auth.isAdmin) {
    items.push({ to: '/admin/users', label: 'Utilisateurs', icon: '\uD83D\uDC65' });
  }
  items.push(
    { to: '/admin/modules', label: 'Studio', icon: '\uD83C\uDFA8' },
    { to: '/admin/media', label: 'Mediatheque', icon: '\uD83D\uDCC1' },
    { to: '/admin/analytics', label: 'Analytics', icon: '\uD83D\uDCCA' },
  );
  return items;
});

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
