<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navbar -->
    <nav class="bg-primary-800 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-6">
            <NuxtLink to="/admin/modules" class="flex items-center space-x-2 text-xl font-bold">
              <img src="/logo.png" alt="TEGS" class="h-8 w-8 rounded" />
              <span>TEGS-Learning</span>
            </NuxtLink>
            <span class="text-primary-200 text-sm">| LCMS</span>
            <div class="hidden md:flex items-center space-x-4 ml-4">
              <NuxtLink
                v-if="auth.isSuperAdmin"
                to="/admin/tenants"
                class="text-sm text-primary-200 hover:text-white transition"
                active-class="text-white font-semibold"
              >
                Ecoles
              </NuxtLink>
              <NuxtLink
                v-if="auth.isSuperAdmin || auth.isAdmin"
                to="/admin/users"
                class="text-sm text-primary-200 hover:text-white transition"
                active-class="text-white font-semibold"
              >
                Utilisateurs
              </NuxtLink>
              <NuxtLink
                to="/admin/modules"
                class="text-sm text-primary-200 hover:text-white transition"
                active-class="text-white font-semibold"
              >
                Modules
              </NuxtLink>
              <NuxtLink
                to="/admin/analytics"
                class="text-sm text-primary-200 hover:text-white transition"
                active-class="text-white font-semibold"
              >
                Analytics
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-primary-200">{{ auth.fullName }}</span>
            <span :class="auth.isSuperAdmin ? 'bg-purple-600' : 'bg-primary-600'" class="px-2 py-1 text-xs rounded">{{ roleLabel }}</span>
            <button
              @click="auth.logout()"
              class="text-sm text-primary-200 hover:text-white transition"
            >
              Deconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Contenu -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const roleLabels: Record<string, string> = {
  superadmin: 'SuperAdmin',
  admin_ddene: 'Admin DDENE',
  teacher: 'Enseignant',
  student: 'Eleve',
};
const roleLabel = computed(() => roleLabels[auth.user?.role || ''] || auth.user?.role);
</script>
