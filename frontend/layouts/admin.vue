<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Sidebar Navigation -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-primary-900 text-white transition-all duration-200"
      :class="sidebarOpen ? 'w-56' : 'w-16'"
    >
      <!-- Logo -->
      <div class="flex items-center h-14 px-3 border-b border-primary-700/50">
        <img src="/logo.png" alt="TEGS" class="h-8 w-8 rounded flex-shrink-0" />
        <transition name="fade">
          <span v-if="sidebarOpen" class="ml-2 text-sm font-bold truncate">TEGS-Learning</span>
        </transition>
      </div>

      <!-- Toggle -->
      <button
        @click="sidebarOpen = !sidebarOpen"
        class="absolute -right-3 top-16 w-6 h-6 bg-primary-700 hover:bg-primary-600 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-primary-900"
      >
        {{ sidebarOpen ? '\u2039' : '\u203A' }}
      </button>

      <!-- Navigation -->
      <nav class="flex-1 py-4 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center px-4 py-2.5 text-sm transition group"
          :class="isActive(item.to)
            ? 'bg-primary-700/60 text-white border-r-2 border-white'
            : 'text-primary-200 hover:bg-primary-800 hover:text-white'"
        >
          <span class="text-lg flex-shrink-0 w-6 text-center">{{ item.icon }}</span>
          <transition name="fade">
            <span v-if="sidebarOpen" class="ml-3 truncate">{{ item.label }}</span>
          </transition>
        </NuxtLink>
      </nav>

      <!-- User info -->
      <div class="border-t border-primary-700/50 p-3">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ initials }}
          </div>
          <transition name="fade">
            <div v-if="sidebarOpen" class="ml-2 min-w-0 flex-1">
              <p class="text-xs font-medium truncate">{{ auth.fullName }}</p>
              <p class="text-[10px] text-primary-300">{{ roleLabel }}</p>
            </div>
          </transition>
        </div>
        <button
          @click="auth.logout()"
          class="mt-2 flex items-center text-xs text-primary-300 hover:text-white transition w-full"
          :class="sidebarOpen ? 'px-1' : 'justify-center'"
        >
          <span class="text-sm">&#x2190;</span>
          <transition name="fade">
            <span v-if="sidebarOpen" class="ml-2">Deconnexion</span>
          </transition>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 transition-all duration-200" :class="sidebarOpen ? 'ml-56' : 'ml-16'">
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
