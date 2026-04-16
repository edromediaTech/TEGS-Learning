<template>
  <div>
    <NuxtLayout name="admin">
      <div v-if="loading && !moduleData" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <div v-else-if="moduleData">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <NuxtLink :to="`/admin/modules/${moduleId}/settings`" class="text-sm text-primary-600 hover:text-primary-800 mb-1 inline-block">
              &larr; Retour au module
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Live Classroom : {{ moduleData.title }}</h1>
            <p class="text-sm text-gray-500 mt-1">Surveillance en temps reel des participants</p>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
              :class="connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
            >
              <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
              {{ connected ? 'Connecte' : 'Deconnecte' }}
            </span>
            <span class="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold">
              {{ onlineCount }} en ligne
            </span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="flex border-b border-gray-200 mb-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-5 py-3 text-sm font-medium border-b-2 transition"
            :class="activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- TAB: MONITORING -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'monitoring'">
          <!-- Stats Row -->
          <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Connectes</p>
              <p class="text-2xl font-bold text-blue-600">{{ onlineCount }}</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Soumis</p>
              <p class="text-2xl font-bold text-green-600">{{ submittedCount }}</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Deconnectes</p>
              <p class="text-2xl font-bold text-red-600">{{ disconnectedCount }}</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Elimines</p>
              <p class="text-2xl font-bold text-red-700">{{ eliminatedCount }}</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Score Moyen</p>
              <p class="text-2xl font-bold text-purple-600">{{ avgScore }}%</p>
            </div>
            <div class="bg-white rounded-xl shadow p-4 text-center">
              <p class="text-xs text-gray-500">Alertes</p>
              <p class="text-2xl font-bold text-amber-600">{{ totalBlurs }}</p>
            </div>
          </div>

          <!-- Student Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <div
              v-for="student in sortedStudents"
              :key="student.sessionKey"
              class="bg-white rounded-xl shadow-sm border-2 p-4 transition-all duration-300"
              :class="studentCardClass(student)"
            >
              <!-- Header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    :class="student.status === 'online' ? 'bg-blue-500' : student.status === 'submitted' ? 'bg-green-500' : 'bg-gray-400'"
                  >
                    {{ initials(student.studentName) }}
                  </div>
                  <div>
                    <p class="font-semibold text-sm text-gray-900 truncate max-w-[120px]">{{ student.studentName || 'Anonyme' }}</p>
                    <p class="text-[10px] text-gray-400">{{ statusLabel(student.status) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <span
                    v-if="student.audioAlert"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 animate-pulse"
                    title="Bruit detecte"
                  >
                    BRUIT
                  </span>
                  <span
                    v-if="student.status === 'eliminated'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"
                  >
                    ELIMINE
                  </span>
                  <span
                    v-else-if="student.blurCount > 0"
                    class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"
                    :class="{ 'animate-pulse': student.blurCount >= 3 }"
                  >
                    SORTIE x{{ student.blurCount }}
                  </span>
                </div>
              </div>

              <!-- Snapshot thumbnail -->
              <div v-if="student.lastSnapshot" class="mb-2">
                <img
                  :src="student.lastSnapshot"
                  class="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                  @click="selectedSnapshot = student"
                  title="Cliquer pour agrandir"
                />
              </div>

              <!-- Score -->
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-gray-500">Score</span>
                <span class="font-bold font-mono" :class="scoreColor(student)">
                  {{ student.totalScore }}/{{ student.totalMaxScore }}
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  :class="student.status === 'submitted' ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: progressPct(student) + '%' }"
                ></div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-400">{{ student.answeredCount }} rep.</span>
                <span
                  v-if="student.status === 'online'"
                  class="inline-flex items-center gap-1 text-blue-600 font-medium"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Ecran {{ student.currentScreen }}
                </span>
                <span v-else-if="student.status === 'submitted'" class="text-green-600 font-medium">Termine</span>
                <span v-else class="text-red-500 font-medium">Hors ligne</span>
              </div>

              <!-- Proctor & WebRTC buttons -->
              <div class="mt-2 flex gap-1">
                <button
                  v-if="moduleData.proctoring !== 'none'"
                  @click="requestSnapshot(student.sessionKey)"
                  class="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1 rounded transition"
                >
                  Photo
                </button>
                <button
                  v-if="moduleData.proctoring === 'video' && student.status === 'online'"
                  @click="requestMedia(student.sessionKey, student.studentName, 'both')"
                  class="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 py-1 rounded transition"
                >
                  Camera
                </button>
                <button
                  v-if="moduleData.contestMode && student.status === 'online'"
                  @click="spotlightActive && spotlightStudent?.sessionKey === student.sessionKey
                    ? spotlightStop()
                    : spotlightStart(student.sessionKey, student.studentName)"
                  class="flex-1 text-xs py-1 rounded transition font-bold"
                  :class="spotlightActive && spotlightStudent?.sessionKey === student.sessionKey
                    ? 'bg-amber-400 text-amber-900 hover:bg-amber-500'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-600'"
                >
                  {{ spotlightActive && spotlightStudent?.sessionKey === student.sessionKey ? 'Stop' : 'Spotlight' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="studentList.length === 0" class="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p class="text-lg mb-2">Aucun eleve connecte</p>
            <p class="text-sm">Les eleves apparaitront ici des qu'ils rejoindront l'examen.</p>
          </div>

          <!-- Alerts Log -->
          <div v-if="alerts.length > 0" class="bg-white rounded-xl shadow overflow-hidden">
            <div class="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-semibold text-gray-700 text-sm">Journal d'alertes</h3>
              <span class="text-xs text-gray-400">{{ alerts.length }} alerte(s)</span>
            </div>
            <div class="max-h-60 overflow-y-auto divide-y divide-gray-50">
              <div
                v-for="(alert, i) in alerts.slice(0, 20)"
                :key="i"
                class="px-6 py-2 flex items-center gap-3 text-sm"
              >
                <span
                  class="font-bold text-xs"
                  :class="alert.type === 'eliminated' ? 'text-red-600' : alert.type === 'audio' ? 'text-purple-600' : 'text-amber-500'"
                >
                  {{ alert.type === 'eliminated' ? 'ELIMINE' : alert.type === 'audio' ? 'BRUIT' : 'SORTIE' }}
                </span>
                <span class="text-gray-700 flex-1">{{ alert.message }}</span>
                <span class="text-xs text-gray-400">{{ formatTime(alert.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- TAB: CONTEST MODE -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'contest'">
          <!-- COUNTDOWN OVERLAY -->
          <div v-if="contestState?.status === 'countdown'" class="max-w-md mx-auto text-center py-20">
            <div class="text-9xl font-black text-red-600 animate-pulse tabular-nums">
              {{ contestCountdown || '...' }}
            </div>
            <p class="text-lg text-gray-500 mt-4">Le concours demarre...</p>
          </div>

          <!-- Contest not active -->
          <div v-else-if="!contestState || contestState.status === 'lobby' || contestState.status === 'finished'" class="max-w-2xl mx-auto">
            <!-- Start panel -->
            <div class="bg-white rounded-xl shadow p-8 text-center">
              <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Mode Concours</h2>
              <p class="text-gray-500 mb-6">
                Le serveur dicte la cadence. Chaque question apparait simultanement sur tous les ecrans
                avec un chronometre impitoyable. A la fin du temps, la question est verrouillee.
              </p>
              <div class="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-left">
                <p class="font-bold text-gray-700 mb-2">Avant de lancer :</p>
                <ul class="space-y-1 text-gray-600">
                  <li>- {{ onlineCount }} eleve(s) connecte(s)</li>
                  <li>- Chaque question utilise sa duree individuelle (champ "duration" du bloc)</li>
                  <li>- Les eleves ne peuvent pas naviguer librement</li>
                  <li>- Soumission automatique a la fin du concours</li>
                </ul>
              </div>
              <button
                @click="contestStart"
                :disabled="onlineCount === 0"
                class="bg-red-600 text-white px-8 py-3 rounded-xl text-lg font-bold hover:bg-red-700 disabled:opacity-50 transition"
              >
                Lancer le Concours
              </button>
            </div>

            <!-- Previous results -->
            <div v-if="contestResults.length > 0" class="mt-6 bg-white rounded-xl shadow overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-700">Resultats du dernier concours</h3>
              </div>
              <div class="divide-y divide-gray-50">
                <div
                  v-for="(stat, i) in contestResults"
                  :key="i"
                  class="px-6 py-3 flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {{ i + 1 }}
                    </span>
                    <span class="text-sm text-gray-700 truncate max-w-xs">{{ stat.questionText || 'Question ' + (i + 1) }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-500">{{ stat.correct }}/{{ stat.total }}</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-bold"
                      :class="stat.percentage >= 60 ? 'bg-green-100 text-green-700' : stat.percentage >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'"
                    >
                      {{ stat.percentage }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contest RUNNING -->
          <div v-else class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- LEFT: Timer + Question + Controls -->
              <div class="lg:col-span-2 space-y-6">
                <!-- Giant Timer -->
                <div class="bg-slate-900 rounded-2xl p-8 text-center text-white relative overflow-hidden">
                  <!-- Timer progress bar -->
                  <div
                    class="absolute top-0 left-0 h-1.5 transition-all duration-900"
                    :class="timerBarColor"
                    :style="{ width: timerBarPct + '%' }"
                  ></div>

                  <div class="text-sm opacity-60 mb-2">
                    {{ contestState.status === 'paused' ? 'EN PAUSE' : revealData ? 'CORRECTION' : 'QUESTION EN COURS' }}
                  </div>
                  <div class="text-8xl font-black font-mono tabular-nums mb-3" :class="revealData ? 'text-purple-400' : timerTextColor">
                    {{ revealData ? '\u2714' : contestTick }}
                  </div>
                  <div class="text-lg opacity-70 mb-4">
                    Question {{ (contestState.currentIndex || 0) + 1 }} / {{ contestState.totalQuestions }}
                  </div>

                  <!-- Current question info -->
                  <div v-if="contestState.currentQuestion" class="bg-white/10 rounded-xl p-4 backdrop-blur mb-4">
                    <div class="flex items-center justify-center gap-2 mb-2">
                      <span class="bg-blue-500 px-3 py-0.5 rounded-full text-xs font-bold">
                        {{ contestState.currentQuestion.type?.toUpperCase().replace('_', ' ') }}
                      </span>
                      <span class="bg-amber-500 px-3 py-0.5 rounded-full text-xs font-bold">
                        {{ contestState.currentQuestion.points }} pts
                      </span>
                    </div>
                    <p class="text-lg font-semibold">{{ contestState.currentQuestion.text }}</p>
                  </div>

                  <!-- REVEAL OVERLAY (Moment de Verite) -->
                  <div v-if="revealData" class="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-4 animate-pulse-once">
                    <div class="text-xs uppercase tracking-widest text-gray-400 mb-2">Bonne reponse</div>
                    <div class="text-3xl font-black text-green-400 mb-3">{{ revealData.correctAnswer }}</div>
                    <p v-if="revealData.explanation" class="text-sm text-gray-400 mb-3">{{ revealData.explanation }}</p>
                    <div class="flex items-center justify-center gap-6 text-sm">
                      <div>
                        <span class="text-green-400 font-bold text-2xl">{{ revealData.stats.percentage }}%</span>
                        <span class="opacity-60 ml-1">reussite</span>
                      </div>
                      <div>
                        <span class="font-bold">{{ revealData.stats.correct }}/{{ revealData.stats.total }}</span>
                        <span class="opacity-60 ml-1">correct</span>
                      </div>
                    </div>
                    <!-- Distribution bars -->
                    <div v-if="revealData.distribution?.length" class="mt-4 space-y-2 text-left max-w-md mx-auto">
                      <div
                        v-for="d in revealData.distribution"
                        :key="d.answer"
                        class="flex items-center gap-2 text-sm"
                      >
                        <span class="w-3 h-3 rounded-full flex-shrink-0" :class="d.isCorrect ? 'bg-green-400' : 'bg-gray-500'"></span>
                        <span class="flex-1 truncate" :class="d.isCorrect ? 'text-green-400 font-bold' : 'text-gray-400'">{{ d.answer }}</span>
                        <div class="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-700"
                            :class="d.isCorrect ? 'bg-green-400' : 'bg-gray-500'"
                            :style="{ width: d.percentage + '%' }"
                          ></div>
                        </div>
                        <span class="text-xs tabular-nums w-12 text-right" :class="d.isCorrect ? 'text-green-400' : 'text-gray-500'">{{ d.percentage }}%</span>
                      </div>
                    </div>
                  </div>

                  <!-- Live stats for current question (when NOT in reveal) -->
                  <div v-else-if="currentQuestionStats" class="flex items-center justify-center gap-6 text-sm">
                    <div>
                      <span class="opacity-60">Reponses :</span>
                      <span class="font-bold ml-1">{{ currentQuestionStats.total }}</span>
                    </div>
                    <div>
                      <span class="opacity-60">Correct :</span>
                      <span class="font-bold text-green-400 ml-1">{{ currentQuestionStats.correct }}</span>
                    </div>
                    <div>
                      <span class="opacity-60">Taux :</span>
                      <span class="font-bold ml-1" :class="currentQuestionStats.percentage >= 60 ? 'text-green-400' : 'text-red-400'">
                        {{ currentQuestionStats.percentage }}%
                      </span>
                    </div>
                  </div>

                  <!-- Elimination & participant count -->
                  <div class="flex items-center justify-center gap-6 text-sm mt-3">
                    <div>
                      <span class="opacity-60">Participants :</span>
                      <span class="font-bold ml-1">{{ contestState.participantCount || 0 }}</span>
                    </div>
                    <div v-if="contestState.eliminatedCount > 0">
                      <span class="opacity-60">Elimines :</span>
                      <span class="font-bold text-red-400 ml-1">{{ contestState.eliminatedCount }}</span>
                    </div>
                  </div>

                  <!-- Controls -->
                  <div class="flex items-center justify-center gap-3 mt-6">
                    <button
                      v-if="contestState.status === 'running'"
                      @click="contestPause"
                      class="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold transition"
                    >
                      Pause
                    </button>
                    <button
                      v-if="contestState.status === 'paused'"
                      @click="contestResume"
                      class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition"
                    >
                      Reprendre
                    </button>
                    <button
                      @click="contestSkip"
                      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold transition"
                    >
                      Question Suivante
                    </button>
                    <button
                      @click="contestStop"
                      class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition"
                    >
                      Arreter
                    </button>
                  </div>
                </div>

                <!-- Per-question stats history -->
                <div v-if="questionStats.size > 0" class="bg-white rounded-xl shadow overflow-hidden">
                  <div class="px-6 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700 text-sm">Statistiques par question</h3>
                  </div>
                  <div class="divide-y divide-gray-50">
                    <div
                      v-for="[qi, stat] in questionStats"
                      :key="qi"
                      class="px-6 py-2 flex items-center justify-between"
                    >
                      <span class="text-sm text-gray-600">Q{{ qi + 1 }}</span>
                      <div class="flex-1 mx-4">
                        <div class="w-full bg-gray-100 rounded-full h-2">
                          <div
                            class="h-2 rounded-full transition-all"
                            :class="stat.percentage >= 60 ? 'bg-green-500' : stat.percentage >= 30 ? 'bg-amber-500' : 'bg-red-500'"
                            :style="{ width: stat.percentage + '%' }"
                          ></div>
                        </div>
                      </div>
                      <span class="text-sm font-bold" :class="stat.percentage >= 60 ? 'text-green-600' : 'text-red-600'">
                        {{ stat.percentage }}%
                      </span>
                      <span class="text-xs text-gray-400 ml-2">({{ stat.correct }}/{{ stat.total }})</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT: Live Leaderboard -->
              <div class="lg:col-span-1">
                <div class="bg-slate-900 rounded-2xl overflow-hidden" style="height: calc(100vh - 220px); min-height: 500px;">
                  <BlocksLiveLeaderboard
                    ref="leaderboardRef"
                    :rankings="rankings"
                    :max-display="30"
                    @leader-change="() => {}"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- TAB: PROCTORING -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'proctoring'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Surveillance Camera</h2>
              <p class="text-sm text-gray-500">
                {{ moduleData.proctoring === 'snapshot' ? 'Captures toutes les ' + (moduleData.snapshotInterval || 30) + 's' : 'Mode desactive' }}
              </p>
            </div>
            <button
              v-if="moduleData.proctoring === 'snapshot'"
              @click="requestAllSnapshots"
              class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition"
            >
              Capturer tous les eleves
            </button>
          </div>

          <div v-if="moduleData.proctoring === 'none'" class="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p class="text-lg mb-2">Proctoring desactive</p>
            <p class="text-sm">Activez le proctoring dans les parametres du module (onglet Mode evaluation).</p>
          </div>

          <!-- Snapshot Grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div
              v-for="student in studentList"
              :key="student.sessionKey"
              class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div v-if="student.lastSnapshot" class="relative">
                <img
                  :src="student.lastSnapshot"
                  class="w-full h-32 object-cover cursor-pointer"
                  @click="selectedSnapshot = student"
                />
                <span class="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                  {{ student.lastSnapshotAt ? formatTime(student.lastSnapshotAt) : '' }}
                </span>
              </div>
              <div v-else class="h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                Pas de capture
              </div>
              <div class="p-2">
                <p class="text-xs font-semibold text-gray-700 truncate">{{ student.studentName || 'Anonyme' }}</p>
                <div class="flex items-center justify-between mt-1">
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    :class="student.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ statusLabel(student.status) }}
                  </span>
                  <button
                    @click="requestSnapshot(student.sessionKey)"
                    class="text-[10px] text-red-600 hover:text-red-700 font-medium"
                  >
                    Capturer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- WebRTC Video Viewer -->
        <div
          v-if="webrtcState.sessionKey"
          class="fixed bottom-4 right-4 z-40 bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
          style="width: 360px;"
        >
          <div class="flex items-center justify-between px-4 py-2 bg-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full animate-pulse" :class="webrtcState.stream ? 'bg-red-500' : 'bg-yellow-500'"></span>
              <span class="text-white text-sm font-bold truncate">{{ webrtcState.studentName || 'Eleve' }}</span>
            </div>
            <button @click="stopMedia" class="text-gray-400 hover:text-white text-lg">&times;</button>
          </div>
          <div class="relative bg-black" style="height: 240px;">
            <video
              ref="webrtcVideoRef"
              autoplay
              playsinline
              class="w-full h-full object-cover"
            ></video>
            <div v-if="!webrtcState.stream" class="absolute inset-0 flex items-center justify-center">
              <p class="text-gray-500 text-sm animate-pulse">Connexion en cours...</p>
            </div>
          </div>
        </div>

        <!-- Snapshot Lightbox -->
        <div
          v-if="selectedSnapshot"
          class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          @click="selectedSnapshot = null"
        >
          <div class="bg-white rounded-xl p-4 max-w-lg w-full mx-4" @click.stop>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-gray-900">{{ selectedSnapshot.studentName || 'Anonyme' }}</h3>
              <button @click="selectedSnapshot = null" class="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <img
              v-if="selectedSnapshot.lastSnapshot"
              :src="selectedSnapshot.lastSnapshot"
              class="w-full rounded-lg"
            />
            <p class="text-xs text-gray-400 mt-2">
              Capture : {{ selectedSnapshot.lastSnapshotAt ? formatTime(selectedSnapshot.lastSnapshotAt) : 'N/A' }}
            </p>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { apiFetch } = useApi()
const moduleId = route.params.id as string

const loading = ref(true)
const moduleData = ref<any>(null)
const activeTab = ref('monitoring')
const selectedSnapshot = ref<any>(null)

const tabs = computed(() => {
  const t = [
    { id: 'monitoring', label: 'Monitoring' },
  ]
  if (moduleData.value?.contestMode) {
    t.push({ id: 'contest', label: 'Mode Concours' })
  }
  t.push({ id: 'proctoring', label: 'Proctoring' })
  return t
})

const {
  connected, studentList, alerts,
  contestState, contestTick, contestCountdown, questionStats, contestResults, rankings,
  breakingNews, revealData,
  snapshots,
  contestStart, contestPause, contestResume, contestSkip, contestStop,
  requestSnapshot, requestAllSnapshots,
  webrtcState, requestMedia, stopMedia,
  spotlightActive, spotlightStudent, spotlightStart, spotlightStop,
  connect,
} = useLiveSocket(moduleId)

const leaderboardRef = ref<any>(null)

// Push breaking news to leaderboard component
watch(breakingNews, (events) => {
  if (events.length > 0 && leaderboardRef.value) {
    leaderboardRef.value.pushBreakingNews(events)
  }
})

const webrtcVideoRef = ref<HTMLVideoElement | null>(null)

watch(() => webrtcState.value.stream, (stream) => {
  if (webrtcVideoRef.value && stream) {
    webrtcVideoRef.value.srcObject = stream
  }
})

// Computed stats
const onlineCount = computed(() => studentList.value.filter(s => s.status === 'online').length)
const submittedCount = computed(() => studentList.value.filter(s => s.status === 'submitted').length)
const disconnectedCount = computed(() => studentList.value.filter(s => s.status === 'disconnected').length)
const totalBlurs = computed(() => studentList.value.reduce((sum, s) => sum + (s.blurCount || 0), 0))
const avgScore = computed(() => {
  const withScore = studentList.value.filter(s => s.totalMaxScore > 0)
  if (withScore.length === 0) return 0
  const avg = withScore.reduce((sum, s) => sum + (s.totalScore / s.totalMaxScore) * 100, 0) / withScore.length
  return Math.round(avg)
})

const eliminatedCount = computed(() => studentList.value.filter(s => s.status === 'eliminated').length)

const sortedStudents = computed(() => {
  return [...studentList.value].sort((a, b) => {
    const order: Record<string, number> = { online: 0, submitted: 1, eliminated: 2, disconnected: 3 }
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
    if (diff !== 0) return diff
    return (b.blurCount || 0) - (a.blurCount || 0)
  })
})

// Contest computed
const currentQuestionStats = computed(() => {
  if (!contestState.value) return null
  return questionStats.value.get(contestState.value.currentIndex) || null
})

const timerBarPct = computed(() => {
  if (!contestState.value?.currentQuestion) return 100
  const total = contestState.value.currentQuestion.duration
  return total > 0 ? (contestTick.value / total) * 100 : 0
})

const timerBarColor = computed(() => {
  const pct = timerBarPct.value
  if (pct <= 10) return 'bg-red-500'
  if (pct <= 25) return 'bg-amber-500'
  return 'bg-blue-500'
})

const timerTextColor = computed(() => {
  const pct = timerBarPct.value
  if (pct <= 10) return 'text-red-400'
  if (pct <= 25) return 'text-amber-400'
  return 'text-white'
})

function initials(name: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function statusLabel(status: string) {
  if (status === 'online') return 'En ligne'
  if (status === 'submitted') return 'Soumis'
  if (status === 'eliminated') return 'Elimine'
  return 'Deconnecte'
}

function studentCardClass(student: any) {
  if (student.status === 'eliminated') return 'border-red-400 bg-red-50/30 opacity-60'
  if (student.blurCount >= 3) return 'border-amber-400 bg-amber-50/30'
  if (student.audioAlert) return 'border-purple-400 bg-purple-50/30'
  if (student.status === 'submitted') return 'border-green-200'
  if (student.status === 'disconnected') return 'border-red-200 opacity-60'
  return 'border-gray-100'
}

function scoreColor(student: any) {
  if (student.totalMaxScore === 0) return 'text-gray-500'
  const pct = (student.totalScore / student.totalMaxScore) * 100
  if (pct >= 60) return 'text-green-600'
  if (pct >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function progressPct(student: any) {
  if (student.totalMaxScore === 0) return 0
  return Math.min(100, Math.round((student.totalScore / student.totalMaxScore) * 100))
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function loadModule() {
  loading.value = true
  try {
    const res = await apiFetch(`/modules/${moduleId}`)
    moduleData.value = (res.data as any)
  } catch (e) {
    console.error('Load error', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadModule()
  connect()
})
</script>
