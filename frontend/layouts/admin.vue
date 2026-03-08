<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navbar -->
    <nav class="bg-primary-800 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-6">
            <NuxtLink to="/admin/modules" class="text-xl font-bold">
              TEGS-Learning
            </NuxtLink>
            <span class="text-primary-200 text-sm">| LCMS</span>
            <div class="hidden md:flex items-center space-x-4 ml-4">
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
            <span class="px-2 py-1 text-xs rounded bg-primary-600">{{ auth.user?.role }}</span>
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
</script>
