<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    leave-active-class="transition-all duration-300"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="!isOnline"
      class="fixed top-0 left-0 right-0 z-[10000] bg-amber-500 text-amber-950 text-center py-2 text-sm font-semibold shadow-md flex items-center justify-center gap-2"
    >
      <span class="text-lg">📡</span>
      <span>Mode hors-ligne - les simulations en cache restent jouables, les progrès seront synchronisés au retour du réseau.</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isOnline = ref(true);

function onChange() {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine;
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return;
  onChange();
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('online', onChange);
  window.removeEventListener('offline', onChange);
});
</script>
