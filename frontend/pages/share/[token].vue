<template>
  <div :style="pageStyle">
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Chargement du module...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center">
      <div class="text-center max-w-md mx-auto p-8">
        <div class="text-6xl mb-4">&#128683;</div>
        <h1 class="text-2xl font-bold text-gray-800 mb-2">Module inaccessible</h1>
        <p class="text-gray-500">{{ error }}</p>
      </div>
    </div>

    <!-- Module Content -->
    <div v-else-if="moduleData" class="min-h-screen">
      <!-- Header -->
      <header :style="headerStyle" class="sticky top-0 z-50 shadow-md">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold">{{ moduleData.title }}</h1>
            <p v-if="moduleData.description" class="text-sm opacity-80 mt-0.5">{{ moduleData.description }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Screen counter -->
            <span class="text-sm opacity-70">
              {{ currentScreenIdx + 1 }} / {{ allScreens.length }}
            </span>
          </div>
        </div>
      </header>

      <div class="max-w-5xl mx-auto flex gap-0 md:gap-6 min-h-[calc(100vh-72px)]">
        <!-- Sidebar Navigation -->
        <nav :style="sidebarStyle" class="hidden md:block w-56 flex-shrink-0 py-4 overflow-y-auto sticky top-[72px] self-start max-h-[calc(100vh-72px)]">
          <template v-for="(section, si) in moduleData.sections" :key="si">
            <div class="px-4 py-2 text-xs font-bold uppercase opacity-60" :style="{ color: theme.headerText }">
              {{ section.title }}
            </div>
            <button
              v-for="(screen, sci) in section.screens"
              :key="`${si}_${sci}`"
              @click="goToScreen(si, sci)"
              class="block w-full text-left px-4 py-2 mx-1 rounded-md text-sm transition-colors"
              :style="navItemStyle(si, sci)"
            >
              {{ screen.title }}
            </button>
          </template>
        </nav>

        <!-- Main Content -->
        <main class="flex-1 py-6 px-4 md:px-8">
          <!-- Mobile nav -->
          <div class="md:hidden mb-4">
            <select
              :value="currentScreenKey"
              @change="onMobileNavChange($event)"
              class="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <template v-for="(section, si) in moduleData.sections" :key="si">
                <option v-for="(screen, sci) in section.screens" :key="`${si}_${sci}`" :value="`${si}_${sci}`">
                  {{ section.title }} &gt; {{ screen.title }}
                </option>
              </template>
            </select>
          </div>

          <!-- Screen title -->
          <h2 class="text-xl font-bold mb-6" :style="{ color: theme.bodyText }">
            {{ currentScreen?.title }}
          </h2>

          <!-- Content Blocks -->
          <div v-if="currentScreen" class="space-y-4">
            <template v-for="(block, bi) in sortedBlocks" :key="bi">
              <!-- Heading -->
              <component
                v-if="block.type === 'heading'"
                :is="'h' + (block.data.level || 1)"
                class="font-bold"
                :style="{ color: theme.bodyText, fontSize: headingSize(block.data.level) }"
              >
                {{ block.data.text }}
              </component>

              <!-- Text -->
              <div v-else-if="block.type === 'text'" class="prose max-w-none leading-relaxed" v-html="sanitizeHtml(block.data.content)"></div>

              <!-- Separator -->
              <div v-else-if="block.type === 'separator'">
                <div v-if="block.data.style === 'space'" class="h-8"></div>
                <hr v-else class="border-gray-300 my-4" :style="{ borderStyle: block.data.style || 'solid' }">
              </div>

              <!-- Image -->
              <figure v-else-if="block.type === 'image' && block.data.url" :style="{ maxWidth: imgSize(block.data.size) }" class="mx-auto">
                <img :src="block.data.url" :alt="block.data.alt || ''" class="w-full rounded-lg" loading="lazy">
                <figcaption v-if="block.data.caption" class="text-center text-sm text-gray-500 mt-2">{{ block.data.caption }}</figcaption>
              </figure>

              <!-- Text + Image -->
              <div v-else-if="block.type === 'text_image'" class="flex gap-6 items-start" :class="block.data.layout === 'text-right' ? 'flex-row-reverse' : ''">
                <div class="flex-1 whitespace-pre-wrap">{{ block.data.text }}</div>
                <div class="flex-1">
                  <img v-if="block.data.imageUrl" :src="block.data.imageUrl" class="w-full rounded-lg">
                </div>
              </div>

              <!-- Video -->
              <div v-else-if="block.type === 'video' && block.data.url">
                <div v-if="youtubeId(block.data.url)" class="relative pb-[56.25%] h-0">
                  <iframe :src="`https://www.youtube.com/embed/${youtubeId(block.data.url)}`" class="absolute top-0 left-0 w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe>
                </div>
                <video v-else :src="block.data.url" controls class="w-full rounded-lg"></video>
              </div>

              <!-- Audio -->
              <div v-else-if="block.type === 'audio' && block.data.url" class="bg-gray-50 rounded-lg p-4">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <audio :src="block.data.url" controls class="w-full"></audio>
              </div>

              <!-- PDF -->
              <div v-else-if="block.type === 'pdf' && block.data.url">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <iframe :src="block.data.url" class="w-full border rounded-lg" :style="{ height: (block.data.height || 500) + 'px' }" frameborder="0"></iframe>
              </div>

              <!-- Embed -->
              <div v-else-if="block.type === 'embed' && block.data.url" class="mx-auto" :style="{ maxWidth: (block.data.width || 800) + 'px' }">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <iframe :src="block.data.url" class="w-full border rounded-lg" :style="{ height: (block.data.height || 500) + 'px' }" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
              </div>

              <!-- Quiz (QCM) -->
              <ShareQuiz v-else-if="block.type === 'quiz'" :block="block" :theme="theme" />

              <!-- True/False -->
              <ShareTrueFalse v-else-if="block.type === 'true_false'" :block="block" :theme="theme" />

              <!-- Numeric -->
              <ShareNumeric v-else-if="block.type === 'numeric'" :block="block" :theme="theme" />

              <!-- Fill blank -->
              <ShareFillBlank v-else-if="block.type === 'fill_blank'" :block="block" :theme="theme" />

              <!-- Matching -->
              <ShareMatching v-else-if="block.type === 'matching'" :block="block" :theme="theme" />

              <!-- Sequence -->
              <ShareSequence v-else-if="block.type === 'sequence'" :block="block" :theme="theme" />

              <!-- Open Answer -->
              <ShareOpenAnswer v-else-if="block.type === 'open_answer'" :block="block" :theme="theme" />

              <!-- Likert -->
              <ShareLikert v-else-if="block.type === 'likert'" :block="block" :theme="theme" />

              <!-- Callout -->
              <div v-else-if="block.type === 'callout'" class="rounded-lg p-4 border-l-4" :style="calloutStyle(block.data)">
                <p v-if="block.data.title" class="font-bold mb-1">{{ block.data.title }}</p>
                <p>{{ block.data.content }}</p>
              </div>

              <!-- Media (legacy) -->
              <div v-else-if="block.type === 'media' && block.data.url">
                <video v-if="block.data.mediaType === 'video'" :src="block.data.url" controls class="w-full rounded-lg"></video>
                <img v-else :src="block.data.url" :alt="block.data.caption || ''" class="max-w-full rounded-lg">
              </div>
            </template>

            <p v-if="!sortedBlocks.length" class="text-center text-gray-400 py-8">Cet ecran est vide.</p>
          </div>

          <!-- Navigation buttons -->
          <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              @click="prevScreen"
              :disabled="currentScreenIdx === 0"
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30"
              :style="{ background: theme.primary, color: theme.headerText }"
            >
              &larr; Precedent
            </button>
            <span class="text-sm text-gray-500">{{ currentScreenIdx + 1 }} / {{ allScreens.length }}</span>
            <button
              @click="nextScreen"
              :disabled="currentScreenIdx >= allScreens.length - 1"
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30"
              :style="{ background: theme.primary, color: theme.headerText }"
            >
              Suivant &rarr;
            </button>
          </div>
        </main>
      </div>

      <!-- Footer -->
      <footer class="text-center py-4 text-xs text-gray-400 border-t">
        TEGS-Learning &mdash; DDENE
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()

const loading = ref(true)
const error = ref('')
const moduleData = ref<any>(null)
const currentSectionIdx = ref(0)
const currentScreenInSection = ref(0)

const THEMES: Record<string, any> = {
  ddene: { primary: '#1e40af', primaryLight: '#3b82f6', headerBg: '#1e40af', headerText: '#ffffff', bodyBg: '#f8fafc', bodyText: '#1e293b', cardBg: '#ffffff' },
  nature: { primary: '#166534', primaryLight: '#22c55e', headerBg: '#166534', headerText: '#ffffff', bodyBg: '#fefce8', bodyText: '#1c1917', cardBg: '#ffffff' },
  contrast: { primary: '#fbbf24', primaryLight: '#fde68a', headerBg: '#0f172a', headerText: '#fbbf24', bodyBg: '#1e293b', bodyText: '#f1f5f9', cardBg: '#334155' },
  ocean: { primary: '#0891b2', primaryLight: '#22d3ee', headerBg: '#164e63', headerText: '#ffffff', bodyBg: '#ecfeff', bodyText: '#134e4a', cardBg: '#ffffff' },
  sunset: { primary: '#dc2626', primaryLight: '#f87171', headerBg: '#7c2d12', headerText: '#ffffff', bodyBg: '#fff7ed', bodyText: '#1c1917', cardBg: '#ffffff' },
}

const theme = computed(() => THEMES[moduleData.value?.theme] || THEMES.ddene)

const pageStyle = computed(() => ({
  background: theme.value.bodyBg,
  color: theme.value.bodyText,
  minHeight: '100vh',
}))

const headerStyle = computed(() => ({
  background: theme.value.headerBg,
  color: theme.value.headerText,
}))

const sidebarStyle = computed(() => ({
  background: theme.value.headerBg,
  borderRadius: '0 0 12px 0',
}))

const allScreens = computed(() => {
  if (!moduleData.value) return []
  const screens: { si: number; sci: number; title: string; screen: any }[] = []
  for (const [si, section] of (moduleData.value.sections || []).entries()) {
    for (const [sci, screen] of (section.screens || []).entries()) {
      screens.push({ si, sci, title: screen.title, screen })
    }
  }
  return screens
})

const currentScreenIdx = computed(() => {
  let idx = 0
  for (const [si, section] of (moduleData.value?.sections || []).entries()) {
    for (const [sci] of (section.screens || []).entries()) {
      if (si === currentSectionIdx.value && sci === currentScreenInSection.value) return idx
      idx++
    }
  }
  return 0
})

const currentScreenKey = computed(() => `${currentSectionIdx.value}_${currentScreenInSection.value}`)

const currentScreen = computed(() => {
  return moduleData.value?.sections?.[currentSectionIdx.value]?.screens?.[currentScreenInSection.value] || null
})

const sortedBlocks = computed(() => {
  if (!currentScreen.value) return []
  return [...(currentScreen.value.contentBlocks || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
})

function goToScreen(si: number, sci: number) {
  currentSectionIdx.value = si
  currentScreenInSection.value = sci
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onMobileNavChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  const [si, sci] = val.split('_').map(Number)
  goToScreen(si, sci)
}

function prevScreen() {
  const idx = currentScreenIdx.value
  if (idx > 0) {
    const target = allScreens.value[idx - 1]
    goToScreen(target.si, target.sci)
  }
}

function nextScreen() {
  const idx = currentScreenIdx.value
  if (idx < allScreens.value.length - 1) {
    const target = allScreens.value[idx + 1]
    goToScreen(target.si, target.sci)
  }
}

function navItemStyle(si: number, sci: number) {
  const active = si === currentSectionIdx.value && sci === currentScreenInSection.value
  return {
    color: theme.value.headerText,
    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    fontWeight: active ? '600' : '400',
  }
}

function headingSize(level: number) {
  return { 1: '28px', 2: '22px', 3: '18px' }[level] || '18px'
}

function imgSize(size: string) {
  return { small: '50%', medium: '75%', large: '100%' }[size] || '100%'
}

function youtubeId(url: string) {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function sanitizeHtml(html: string) {
  if (!html) return ''
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<\/?\w+:[^>]*>/gi, '')
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|base)[^>]*>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
}

function calloutStyle(data: any) {
  const colors: Record<string, { bg: string; border: string }> = {
    info: { bg: '#eff6ff', border: '#3b82f6' },
    warning: { bg: '#fffbeb', border: '#f59e0b' },
    success: { bg: '#f0fdf4', border: '#22c55e' },
    error: { bg: '#fef2f2', border: '#ef4444' },
  }
  const c = colors[data.type] || colors.info
  return { background: c.bg, borderLeftColor: c.border }
}

// Fetch module data
onMounted(async () => {
  try {
    const apiBase = config.public.apiBase as string
    const res = await $fetch<any>(`${apiBase}/share/public/${route.params.token}/json`)
    moduleData.value = res
  } catch (err: any) {
    const msg = err?.data?.error || err?.response?._data?.error || 'Module introuvable ou partage desactive'
    error.value = msg
  } finally {
    loading.value = false
  }
})

useHead({
  title: computed(() => moduleData.value?.title ? `${moduleData.value.title} | TEGS-Learning` : 'TEGS-Learning'),
})
</script>
