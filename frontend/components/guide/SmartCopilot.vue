<template>
  <!-- ═══════════════════════════════════════════ -->
  <!-- FLOATING BUBBLE (draggable)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div
    v-if="!copilot.panelOpen"
    ref="bubbleRef"
    class="fixed z-50 select-none cursor-grab active:cursor-grabbing"
    :style="bubbleStyle"
    @mousedown.prevent="startDrag"
    @touchstart.prevent="startDrag"
  >
    <button
      @click.stop="openPanel()"
      class="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 ring-4 ring-white/20 cursor-pointer"
      :class="{ 'animate-bounce': showPulse }"
      title="TEGS Copilot"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </button>
  </div>

  <!-- ═══════════════════════════════════════════ -->
  <!-- PANEL (fixed bottom-right, above bubble)     -->
  <!-- ═══════════════════════════════════════════ -->
  <Transition name="copilot-panel">
    <div
      v-if="copilot.panelOpen"
      class="fixed z-50 right-4 bottom-4 w-[380px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
    >
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-sm">TEGS Copilot</h3>
              <p class="text-[10px] text-indigo-200">Guide interactif</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="copilot.activeMissionId"
              @click="copilot.abortMission(); stopHighlight()"
              class="p-1.5 hover:bg-white/20 rounded-lg transition text-xs"
              title="Retour aux missions"
            >
              &#x2190;
            </button>
            <button
              @click="copilot.togglePanel()"
              class="p-1.5 hover:bg-white/20 rounded-lg transition"
              title="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <!-- ── MISSION LIST ── -->
        <div v-if="!copilot.activeMissionId" class="flex-1 overflow-y-auto">
          <!-- Search -->
          <div class="px-4 pt-4 pb-2">
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher une mission..."
                class="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-gray-50"
              />
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>

          <!-- Category tabs -->
          <div class="px-4 flex gap-1.5 flex-wrap pb-2">
            <button
              v-for="cat in availableCategories"
              :key="cat.id"
              @click="selectedCategory = selectedCategory === cat.id ? null : cat.id"
              class="px-2.5 py-1 text-[11px] rounded-full border transition-colors"
              :class="selectedCategory === cat.id
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>

          <!-- Mission cards -->
          <div class="px-4 pb-4 space-y-2">
            <button
              v-for="mission in filteredMissions"
              :key="mission.id"
              @click="copilot.startMission(mission.id)"
              class="w-full text-left p-3.5 rounded-xl border transition-all hover:shadow-md group"
              :class="copilot.isMissionCompleted(mission.id)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-white hover:border-indigo-300'"
            >
              <div class="flex items-start gap-3">
                <span class="text-2xl flex-shrink-0 mt-0.5">{{ mission.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-semibold text-gray-800 truncate">{{ mission.title }}</h4>
                    <span v-if="copilot.isMissionCompleted(mission.id)" class="text-green-500 text-xs flex-shrink-0">&#x2713;</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ mission.description }}</p>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-[10px] text-gray-400">{{ mission.steps.length }} etapes</span>
                    <div v-if="getMissionProgress(mission.id) > 0 && !copilot.isMissionCompleted(mission.id)" class="flex-1 max-w-[80px]">
                      <div class="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: getMissionProgress(mission.id) + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>

            <p v-if="filteredMissions.length === 0" class="text-sm text-gray-400 text-center py-6">
              Aucune mission trouvee.
            </p>
          </div>
        </div>

        <!-- ── STEP VIEW ── -->
        <div v-else class="flex-1 overflow-y-auto">
          <!-- Mission header -->
          <div class="px-5 pt-4 pb-3 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ copilot.activeMission?.icon }}</span>
              <h4 class="text-sm font-bold text-gray-800">{{ copilot.activeMission?.title }}</h4>
            </div>
            <!-- Progress bar -->
            <div class="mt-2.5 flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  :style="{ width: copilot.missionProgress + '%' }"
                ></div>
              </div>
              <span class="text-[10px] text-gray-400 font-medium">{{ copilot.missionProgress }}%</span>
            </div>
          </div>

          <!-- Steps list -->
          <div class="px-4 py-3 space-y-1">
            <button
              v-for="(step, idx) in copilot.activeMission?.steps ?? []"
              :key="step.id"
              @click="copilot.goToStep(idx)"
              class="w-full text-left p-3 rounded-xl transition-all flex items-start gap-3"
              :class="idx === copilot.currentStepIndex
                ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                : copilot.completedSteps.includes(step.id)
                  ? 'bg-green-50 border border-green-100'
                  : 'hover:bg-gray-50 border border-transparent'"
            >
              <!-- Step number / check -->
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                :class="copilot.completedSteps.includes(step.id)
                  ? 'bg-green-500 text-white'
                  : idx === copilot.currentStepIndex
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 text-gray-500'"
              >
                <span v-if="copilot.completedSteps.includes(step.id)">&#x2713;</span>
                <span v-else>{{ idx + 1 }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <p
                  class="text-sm font-medium"
                  :class="copilot.completedSteps.includes(step.id) ? 'text-green-700 line-through' : 'text-gray-800'"
                >
                  {{ step.title }}
                </p>
                <p v-if="idx === copilot.currentStepIndex" class="text-xs text-gray-500 mt-1">
                  {{ step.description }}
                </p>
              </div>
            </button>
          </div>

          <!-- Current step actions -->
          <div v-if="copilot.currentStep" class="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 flex-shrink-0">
            <!-- Navigate button -->
            <button
              v-if="copilot.currentStep.route && !isOnRoute(copilot.currentStep.route)"
              @click="navigateToStep()"
              class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              M'y conduire maintenant
            </button>

            <!-- Highlight button -->
            <button
              v-if="copilot.currentStep.selector && (!copilot.currentStep.route || isOnRoute(copilot.currentStep.route))"
              @click="highlightElement()"
              class="w-full py-2.5 px-4 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Voir l'element
            </button>

            <!-- Navigation + validate -->
            <div class="flex gap-2">
              <button
                v-if="copilot.currentStepIndex > 0"
                @click="copilot.prevStep(); stopHighlight()"
                class="flex-1 py-2 px-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                &#x2190; Precedent
              </button>
              <button
                @click="copilot.completeCurrentStep(); stopHighlight()"
                class="flex-1 py-2 px-3 text-sm font-semibold rounded-xl transition"
                :class="copilot.currentStepIndex === copilot.totalSteps - 1
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'"
              >
                {{ copilot.currentStepIndex === copilot.totalSteps - 1 ? 'Terminer &#x2713;' : 'Suivant &#x2192;' }}
              </button>
            </div>
          </div>

          <!-- Mission complete -->
          <div
            v-if="copilot.activeMission && copilot.missionProgress === 100"
            class="px-4 pb-4 text-center"
          >
            <div class="bg-green-50 border border-green-200 rounded-xl p-4">
              <span class="text-3xl">&#x1F389;</span>
              <p class="text-sm font-bold text-green-700 mt-2">Mission accomplie !</p>
              <button
                @click="copilot.abortMission()"
                class="mt-3 text-xs text-green-600 underline hover:text-green-800"
              >
                Retour aux missions
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span class="text-[10px] text-gray-400">TEGS Copilot v1.0</span>
          <button
            @click="copilot.resetAll()"
            class="text-[10px] text-gray-400 hover:text-red-500 transition"
            title="Reinitialiser la progression"
          >
            Reinitialiser
          </button>
        </div>
      </div>
  </Transition>

</template>

<script setup lang="ts">
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { missions, categories } from '~/config/tours';

const copilot = useCopilotStore();
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// ─── Search & Filter ───
const searchQuery = ref('');
const selectedCategory = ref<string | null>(null);
const showPulse = ref(false);
const bubbleRef = ref<HTMLElement | null>(null);

// Driver.js instance
let driverInstance: ReturnType<typeof driver> | null = null;

const userRole = computed(() => auth.user?.role || '');

const availableCategories = computed(() => {
  const userMissions = copilot.availableMissions(userRole.value);
  const usedCats = new Set(userMissions.map(m => m.category));
  return categories.filter(c => usedCats.has(c.id));
});

const filteredMissions = computed(() => {
  let result = copilot.availableMissions(userRole.value);
  if (selectedCategory.value) {
    result = result.filter(m => m.category === selectedCategory.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    );
  }
  return result;
});

// ─── Bubble position (draggable) ───
const isDragging = ref(false);
const hasDragged = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const bubbleStyle = computed(() => {
  const pos = copilot.position;
  if (pos) {
    return { left: pos.x + 'px', top: pos.y + 'px' };
  }
  return { right: '24px', bottom: '24px' };
});

/** Open panel only if user didn't drag */
function openPanel() {
  if (!hasDragged.value) {
    copilot.togglePanel();
  }
  hasDragged.value = false;
}

function startDrag(e: MouseEvent | TouchEvent) {
  const el = bubbleRef.value;
  if (!el) return;
  hasDragged.value = false;
  const rect = el.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  dragOffset.value = { x: clientX - rect.left, y: clientY - rect.top };
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', stopDrag);
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  e.preventDefault();
  hasDragged.value = true;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const x = Math.max(0, Math.min(window.innerWidth - 60, clientX - dragOffset.value.x));
  const y = Math.max(0, Math.min(window.innerHeight - 60, clientY - dragOffset.value.y));
  copilot.updatePosition(x, y);
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);
}

// ─── Route detection ───
function isOnRoute(targetRoute: string): boolean {
  return route.path === targetRoute || route.path.startsWith(targetRoute + '/');
}

// ─── Navigation ───
function navigateToStep() {
  const step = copilot.currentStep;
  if (step?.route) {
    router.push(step.route);
    // After navigation, try highlight with delay
    setTimeout(() => {
      if (step.selector) highlightElement();
    }, 1500);
  }
}

// ─── Driver.js highlight ───
function highlightElement() {
  const step = copilot.currentStep;
  if (!step?.selector) return;

  stopHighlight();

  // Try to find the element
  const el = document.querySelector(step.selector);
  if (!el) return;

  driverInstance = driver({
    showProgress: false,
    showButtons: ['close'],
    animate: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'copilot-popover',
    steps: [
      {
        element: step.selector,
        popover: {
          title: step.title,
          description: step.description,
          side: step.popoverSide || 'bottom',
          align: 'center',
        },
      },
    ],
    onDestroyed: () => {
      copilot.highlighting = false;
    },
  });

  copilot.highlighting = true;
  driverInstance.drive();
}

function stopHighlight() {
  if (driverInstance) {
    driverInstance.destroy();
    driverInstance = null;
  }
  copilot.highlighting = false;
}

// ─── Mission progress helper ───
function getMissionProgress(missionId: string): number {
  const mission = missions.find(m => m.id === missionId);
  if (!mission) return 0;
  const done = mission.steps.filter(s => copilot.completedSteps.includes(s.id)).length;
  return Math.round((done / mission.steps.length) * 100);
}

// ─── Auto-validate watcher ───
let validateInterval: ReturnType<typeof setInterval> | null = null;

watch(() => copilot.currentStep, (step) => {
  if (validateInterval) clearInterval(validateInterval);
  if (!step?.validate) return;

  validateInterval = setInterval(() => {
    if (step.validate && step.validate()) {
      copilot.validateStep(step.id);
      if (validateInterval) clearInterval(validateInterval);
    }
  }, 1000);
}, { immediate: true });

// ─── Auto-trigger welcome for new users ───
onMounted(() => {
  if (auth.isLoggedIn && !copilot.hasSeenWelcome) {
    setTimeout(() => {
      copilot.markWelcomeSeen();
      copilot.startMission('welcome');
    }, 2000);
  }

  // Pulse animation on first 3 visits
  const visits = parseInt(localStorage.getItem('tegs-copilot-visits') || '0');
  if (visits < 3) {
    showPulse.value = true;
    localStorage.setItem('tegs-copilot-visits', String(visits + 1));
    setTimeout(() => { showPulse.value = false; }, 5000);
  }
});

onUnmounted(() => {
  stopHighlight();
  if (validateInterval) clearInterval(validateInterval);
});
</script>

<style>
/* Panel transition */
.copilot-panel-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.copilot-panel-leave-active {
  transition: all 0.2s ease-in;
}
.copilot-panel-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}
.copilot-panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

/* Driver.js custom theme */
.copilot-popover {
  font-family: inherit !important;
}
.copilot-popover .driver-popover-title {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: #312e81 !important;
}
.copilot-popover .driver-popover-description {
  font-size: 13px !important;
  color: #4b5563 !important;
  line-height: 1.5 !important;
}
.copilot-popover .driver-popover-close-btn {
  color: #6b7280 !important;
}
.copilot-popover .driver-popover-arrow-side-bottom {
  border-top-color: white !important;
}
</style>
