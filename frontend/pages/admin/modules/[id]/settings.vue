<template>
  <div>
    <NuxtLayout name="admin">
      <div v-if="store.loading && !store.current" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <div v-else-if="store.current">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <NuxtLink to="/admin/modules" class="text-sm text-primary-600 hover:text-primary-800 mb-1 inline-block">
              &larr; Retour aux modules
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Configuration : {{ store.current.title }}</h1>
          </div>
        </div>

        <!-- Onglets -->
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

        <!-- Messages -->
        <div v-if="successMsg" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {{ successMsg }}
        </div>
        <div v-if="store.error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {{ store.error }}
        </div>

        <!-- Onglet Proprietes -->
        <div v-if="activeTab === 'properties'" class="max-w-2xl space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input v-model="editForm.title" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Langue</label>
            <select v-model="editForm.language" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="fr">Francais</option>
              <option value="ht">Creole Haitien</option>
              <option value="en">Anglais</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select v-model="editForm.status" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="draft">Brouillon</option>
              <option value="published">Publie</option>
            </select>
          </div>
          <button @click="saveProperties" :disabled="saving" class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
            {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
          </button>
        </div>

        <!-- Onglet Theme -->
        <div v-if="activeTab === 'theme'" class="max-w-3xl">
          <p class="text-sm text-gray-500 mb-4">Choisissez l'habillage graphique de votre module</p>
          <div class="grid grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              v-for="t in themes"
              :key="t.id"
              @click="selectTheme(t.id)"
              class="rounded-xl border-2 overflow-hidden transition hover:shadow-md"
              :class="editForm.theme === t.id ? 'border-primary-500 ring-2 ring-primary-200 shadow-md' : 'border-gray-200'"
            >
              <div class="h-10" :style="{ background: t.headerBg }"></div>
              <div class="p-3 h-16" :style="{ background: t.bodyBg }">
                <div class="h-2 rounded-full mb-2" :style="{ background: t.primary, width: '70%' }"></div>
                <div class="h-1.5 rounded-full mb-1" :style="{ background: t.bodyText + '33', width: '100%' }"></div>
                <div class="h-1.5 rounded-full" :style="{ background: t.bodyText + '22', width: '60%' }"></div>
              </div>
              <div class="px-3 py-2 text-xs font-bold text-center" :class="editForm.theme === t.id ? 'text-primary-700 bg-primary-50' : 'text-gray-600 bg-gray-50'">
                {{ t.name }}
              </div>
            </button>
          </div>
        </div>

        <!-- Onglet Partager -->
        <div v-if="activeTab === 'share'" class="max-w-2xl space-y-6">
          <!-- Live mode time window info -->
          <div v-if="evalForm.evaluationType === 'live' && evalForm.liveStartTime && evalForm.liveEndTime" class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <span class="font-bold">Examen Live programme :</span>
            Du {{ new Date(evalForm.liveStartTime).toLocaleString('fr-FR') }}
            au {{ new Date(evalForm.liveEndTime).toLocaleString('fr-FR') }}.
            Le lien ne sera accessible qu'entre ces horaires.
          </div>
          <!-- Activer/Desactiver -->
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-gray-900">Partager ce module</h3>
                <p class="text-sm text-gray-500 mt-1">Rendre le module accessible publiquement via un lien securise</p>
              </div>
              <button
                @click="toggleShare(!shareInfo.shareEnabled)"
                :disabled="sharingLoading"
                class="px-4 py-2 rounded-lg font-medium text-sm transition"
                :class="shareInfo.shareEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-600 text-white hover:bg-green-700'"
              >
                {{ shareInfo.shareEnabled ? 'Desactiver' : 'Activer le partage' }}
              </button>
            </div>
          </div>

          <!-- URL publique -->
          <div v-if="shareInfo.shareEnabled && shareInfo.shareUrl" class="space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-xl p-5">
              <h4 class="font-bold text-green-800 mb-2">URL publique de la formation</h4>
              <div class="flex items-center space-x-2">
                <input
                  :value="shareInfo.shareUrl"
                  readonly
                  class="flex-1 px-3 py-2 border border-green-300 rounded-lg bg-white text-sm font-mono"
                />
                <button
                  @click="copyToClipboard(shareInfo.shareUrl)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {{ copied === 'url' ? 'Copie !' : 'Copier' }}
                </button>
              </div>
            </div>

            <!-- Code Iframe -->
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 class="font-bold text-blue-800 mb-2">Integrer dans votre site Web</h4>
              <p class="text-sm text-blue-600 mb-3">Code a inclure dans votre site :</p>
              <div class="bg-white border border-blue-200 rounded-lg p-3 font-mono text-xs break-all">
                {{ iframeCode }}
              </div>
              <div class="flex items-center space-x-4 mt-3">
                <div>
                  <label class="text-xs text-blue-600 font-medium">Largeur</label>
                  <input v-model.number="embedWidth" type="number" min="300" max="1400" class="w-20 px-2 py-1 border border-blue-300 rounded text-sm ml-1" />
                </div>
                <div>
                  <label class="text-xs text-blue-600 font-medium">Hauteur</label>
                  <input v-model.number="embedHeight" type="number" min="300" max="1000" class="w-20 px-2 py-1 border border-blue-300 rounded text-sm ml-1" />
                </div>
                <button
                  @click="copyToClipboard(iframeCode, 'iframe')"
                  class="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-auto"
                >
                  {{ copied === 'iframe' ? 'Copie !' : 'Copier le code' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Onglet QR Code -->
        <div v-if="activeTab === 'qrcode'" class="max-w-2xl space-y-6">
          <!-- QR Module -->
          <div class="bg-white border border-gray-200 rounded-xl p-6">
            <h3 class="font-bold text-gray-900 mb-1">QR Code du Module</h3>
            <p class="text-sm text-gray-500 mb-4">Generez un QR code pour partager ce module. Les eleves peuvent le scanner pour acceder directement au contenu.</p>

            <div class="flex items-start gap-6">
              <!-- QR Preview -->
              <div class="flex-shrink-0">
                <div v-if="qrLoading" class="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span class="text-gray-400 text-sm">Chargement...</span>
                </div>
                <img v-else-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="w-48 h-48 rounded-xl border border-gray-200 shadow-sm" />
                <div v-else class="w-48 h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <button @click="loadQrCode" class="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    Generer le QR
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex-1 space-y-3">
                <div v-if="qrShareUrl" class="text-sm">
                  <p class="font-medium text-gray-700 mb-1">URL encodee :</p>
                  <div class="flex items-center gap-2">
                    <input :value="qrShareUrl" readonly class="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono" />
                    <button @click="copyToClipboard(qrShareUrl, 'qr-url')" class="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs font-medium whitespace-nowrap">
                      {{ copied === 'qr-url' ? 'Copie !' : 'Copier' }}
                    </button>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 pt-2">
                  <button @click="loadQrCode" :disabled="qrLoading" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50">
                    {{ qrDataUrl ? 'Regenerer' : 'Generer' }}
                  </button>
                  <a v-if="qrDataUrl" :href="qrDataUrl" :download="`qr-module-${route.params.id}.png`" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-block">
                    Telecharger PNG
                  </a>
                </div>

                <div class="pt-2">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Taille (px)</label>
                  <select v-model.number="qrSize" @change="loadQrCode" class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                    <option :value="200">200 x 200</option>
                    <option :value="300">300 x 300</option>
                    <option :value="500">500 x 500</option>
                    <option :value="800">800 x 800 (impression)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- QR Badge (info) -->
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h4 class="font-bold text-purple-800 mb-2">QR Badges Eleves</h4>
            <p class="text-sm text-purple-700">
              Les badges QR individuels sont generes automatiquement apres evaluation.
              Un inspecteur peut scanner le badge d'un eleve avec Inspect-mobile pour voir ses resultats.
            </p>
            <p class="text-xs text-purple-500 mt-2">
              Endpoint API : GET /api/qr/badge/:moduleId/:userId
            </p>
          </div>
        </div>

        <!-- Onglet Surveillance -->
        <div v-if="activeTab === 'surveillance'" class="max-w-2xl space-y-6">
          <!-- Live mode override notice -->
          <div v-if="evalForm.evaluationType === 'live'" class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <span class="font-bold">Mode Live actif :</span> La surveillance stricte est forcee automatiquement (plein ecran, anti-copie, detection d'onglet, soumission auto). Les options ci-dessous ne s'appliquent qu'en mode Personnalise.
          </div>
          <!-- Mode selector -->
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <h3 class="font-bold text-gray-900 mb-1">Mode de surveillance</h3>
            <p class="text-sm text-gray-500 mb-4">Definir le niveau de controle lors du passage du module par les eleves</p>
            <div class="grid grid-cols-2 gap-4">
              <button
                @click="survForm.surveillanceMode = 'light'"
                class="p-4 rounded-xl border-2 text-left transition"
                :class="survForm.surveillanceMode === 'light' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="text-lg font-bold mb-1" :class="survForm.surveillanceMode === 'light' ? 'text-green-700' : 'text-gray-700'">Leger</div>
                <p class="text-xs text-gray-500">Pas de restriction. Chronometre indicatif. L'eleve peut naviguer librement.</p>
              </button>
              <button
                @click="survForm.surveillanceMode = 'strict'"
                class="p-4 rounded-xl border-2 text-left transition"
                :class="survForm.surveillanceMode === 'strict' ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="text-lg font-bold mb-1" :class="survForm.surveillanceMode === 'strict' ? 'text-red-700' : 'text-gray-700'">Strict</div>
                <p class="text-xs text-gray-500">Plein ecran force, copie desactivee, detection de changement d'onglet.</p>
              </button>
            </div>
          </div>

          <!-- Strict settings (visible only in strict mode) -->
          <div v-if="survForm.surveillanceMode === 'strict'" class="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
            <h3 class="font-bold text-orange-800 mb-1">Options du mode strict</h3>

            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-medium text-gray-700">Plein ecran force</span>
                <p class="text-xs text-gray-500">Le module se ferme si l'eleve quitte le plein ecran</p>
              </div>
              <input type="checkbox" v-model="survForm.strictSettings.fullscreen" class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-medium text-gray-700">Anti-copie</span>
                <p class="text-xs text-gray-500">Desactive le clic droit, copier et coller</p>
              </div>
              <input type="checkbox" v-model="survForm.strictSettings.antiCopy" class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="font-medium text-gray-700">Detection de changement d'onglet</span>
                <p class="text-xs text-gray-500">Alerte si l'eleve quitte l'onglet du module</p>
              </div>
              <input type="checkbox" v-model="survForm.strictSettings.blurDetection" class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
            </label>

            <div v-if="survForm.strictSettings.blurDetection" class="pl-4 border-l-2 border-orange-200 space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre max de sorties d'onglet tolerees</label>
                <input
                  type="number" v-model.number="survForm.strictSettings.maxBlurCount"
                  min="1" max="20"
                  class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <span class="font-medium text-gray-700">Soumission automatique au depassement</span>
                  <p class="text-xs text-gray-500">Soumettre automatiquement le quiz si le seuil est depasse</p>
                </div>
                <input type="checkbox" v-model="survForm.strictSettings.autoSubmitOnExceed" class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
              </label>
            </div>
          </div>

          <button @click="saveSurveillance" :disabled="saving" class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
            {{ saving ? 'Sauvegarde...' : 'Sauvegarder la surveillance' }}
          </button>
        </div>

        <!-- Onglet Mode evaluation -->
        <div v-if="activeTab === 'evaluation'" class="max-w-2xl space-y-6">
          <!-- Mode selector -->
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <h3 class="font-bold text-gray-900 mb-1">Type d'evaluation</h3>
            <p class="text-sm text-gray-500 mb-4">Choisir entre un examen synchrone (Live) ou un exercice en autonomie (Personnalise)</p>
            <div class="grid grid-cols-2 gap-4">
              <button
                @click="evalForm.evaluationType = 'personalized'"
                class="p-4 rounded-xl border-2 text-left transition"
                :class="evalForm.evaluationType === 'personalized' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg">&#x1F7E2;</span>
                  <span class="font-bold" :class="evalForm.evaluationType === 'personalized' ? 'text-green-700' : 'text-gray-700'">Personnalise</span>
                </div>
                <p class="text-xs text-gray-500">Accessible apres publication. Chronometre individuel. Surveillance personnalisable.</p>
                <div class="mt-2 space-y-1 text-xs text-gray-400">
                  <div>&#10003; Devoirs a la maison</div>
                  <div>&#10003; Exercices d'entrainement</div>
                  <div>&#10003; Modules de remediation IA</div>
                </div>
              </button>
              <button
                @click="evalForm.evaluationType = 'live'"
                class="p-4 rounded-xl border-2 text-left transition"
                :class="evalForm.evaluationType === 'live' ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg">&#x1F534;</span>
                  <span class="font-bold" :class="evalForm.evaluationType === 'live' ? 'text-red-700' : 'text-gray-700'">En direct (Live)</span>
                </div>
                <p class="text-xs text-gray-500">Heure fixe de debut/fin. Surveillance stricte forcee. Monitoring en temps reel.</p>
                <div class="mt-2 space-y-1 text-xs text-gray-400">
                  <div>&#10003; Examens officiels DDENE</div>
                  <div>&#10003; Evaluations synchrones</div>
                  <div>&#10003; Competitions de groupe</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Live mode settings -->
          <div v-if="evalForm.evaluationType === 'live'" class="bg-white border border-red-200 rounded-xl p-5 space-y-4">
            <h3 class="font-bold text-red-800 mb-1">Programmation de l'examen</h3>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date et heure de debut</label>
                <input
                  v-model="evalForm.liveStartTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date et heure de fin</label>
                <input
                  v-model="evalForm.liveEndTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <!-- Computed duration -->
            <div v-if="evalForm.liveStartTime && evalForm.liveEndTime" class="bg-red-50 rounded-lg p-3 text-sm">
              <span class="font-medium text-red-800">Duree de l'examen : </span>
              <span class="font-bold text-red-900">
                {{ Math.max(0, Math.round((new Date(evalForm.liveEndTime).getTime() - new Date(evalForm.liveStartTime).getTime()) / 60000)) }} minutes
              </span>
            </div>

            <!-- Info box -->
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p class="font-bold mb-1">En mode Live :</p>
              <ul class="space-y-1 text-xs">
                <li>&#8226; L'examen ne sera accessible qu'entre les deux horaires definis</li>
                <li>&#8226; Le chronometre sera calcule automatiquement (temps restant jusqu'a la fin)</li>
                <li>&#8226; La surveillance stricte sera forcee (plein ecran, anti-copie, detection d'onglet)</li>
                <li>&#8226; Soumission automatique a l'expiration du temps</li>
              </ul>
            </div>
          </div>

          <!-- Contest Mode (Live only) -->
          <div v-if="evalForm.evaluationType === 'live'" class="bg-white border border-purple-200 rounded-xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-purple-800 mb-1">Mode Concours</h3>
                <p class="text-xs text-gray-500">Le serveur dicte la cadence. Les questions apparaissent simultanement avec un chronometre par question.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="evalForm.contestMode" class="sr-only peer" />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            <div v-if="evalForm.contestMode" class="bg-purple-50 rounded-lg p-3 text-xs text-purple-700 space-y-1">
              <p>&#8226; Chaque question utilise sa duree individuelle (champ "duration")</p>
              <p>&#8226; La question disparait a la fin du temps, meme sans reponse</p>
              <p>&#8226; Tous les candidats voient la meme question au meme instant</p>
              <p>&#8226; Le professeur controle le demarrage depuis le Live Dashboard</p>
            </div>
          </div>

          <!-- Proctoring (Live only) -->
          <div v-if="evalForm.evaluationType === 'live'" class="bg-white border border-red-200 rounded-xl p-5 space-y-4">
            <h3 class="font-bold text-red-800 mb-1">Surveillance Biometrique (Proctoring)</h3>
            <p class="text-xs text-gray-500 mb-3">Capture camera des eleves pendant l'examen pour detecter la fraude.</p>
            <div class="grid grid-cols-3 gap-3">
              <button
                @click="evalForm.proctoring = 'none'"
                class="p-3 rounded-lg border-2 text-center text-sm transition"
                :class="evalForm.proctoring === 'none' ? 'border-gray-500 bg-gray-50' : 'border-gray-200'"
              >
                <div class="font-bold text-gray-700">Desactive</div>
                <p class="text-[10px] text-gray-400 mt-1">Pas de camera</p>
              </button>
              <button
                @click="evalForm.proctoring = 'snapshot'"
                class="p-3 rounded-lg border-2 text-center text-sm transition"
                :class="evalForm.proctoring === 'snapshot' ? 'border-red-500 bg-red-50' : 'border-gray-200'"
              >
                <div class="font-bold text-red-700">Captures</div>
                <p class="text-[10px] text-gray-400 mt-1">Photos periodiques</p>
              </button>
              <button
                @click="evalForm.proctoring = 'video'"
                class="p-3 rounded-lg border-2 text-center text-sm transition"
                :class="evalForm.proctoring === 'video' ? 'border-red-500 bg-red-50' : 'border-gray-200'"
              >
                <div class="font-bold text-red-700">Video</div>
                <p class="text-[10px] text-gray-400 mt-1">Flux continu (WebRTC)</p>
              </button>
            </div>
            <div v-if="evalForm.proctoring === 'snapshot'" class="flex items-center gap-3">
              <label class="text-sm text-gray-700">Intervalle de capture :</label>
              <select v-model.number="evalForm.snapshotInterval" class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                <option :value="10">10 secondes</option>
                <option :value="15">15 secondes</option>
                <option :value="30">30 secondes</option>
                <option :value="60">60 secondes</option>
                <option :value="120">2 minutes</option>
              </select>
              <span class="text-xs text-gray-400">Recommande: 30s pour Haiti (economie bande passante)</span>
            </div>
            <div v-if="evalForm.proctoring === 'video'" class="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
              Le mode video (WebRTC) necessite une bonne bande passante. Pour les zones reculees d'Haiti, preferez le mode "Captures" (photos toutes les 30s).
            </div>
          </div>

          <!-- Personalized mode info -->
          <div v-if="evalForm.evaluationType === 'personalized'" class="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-green-800">
            <p class="font-bold mb-1">En mode Personnalise :</p>
            <ul class="space-y-1 text-xs">
              <li>&#8226; Le module est accessible a tout moment apres publication</li>
              <li>&#8226; Le chronometre individuel est configure dans l'onglet "Chronometre"</li>
              <li>&#8226; Le mode de surveillance est configurable dans l'onglet "Surveillance"</li>
            </ul>
          </div>

          <div class="flex items-center gap-3">
            <button @click="saveEvaluation" :disabled="saving" class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder le mode' }}
            </button>
            <NuxtLink
              v-if="evalForm.evaluationType === 'live'"
              :to="`/admin/modules/${route.params.id}/live`"
              class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium text-sm inline-flex items-center gap-2"
            >
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Live Dashboard
            </NuxtLink>
          </div>
        </div>

        <!-- Onglet Chronometre -->
        <div v-if="activeTab === 'timer'" class="max-w-2xl space-y-6">
          <!-- Live mode override notice -->
          <div v-if="evalForm.evaluationType === 'live'" class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <span class="font-bold">Mode Live actif :</span> Le chronometre est calcule automatiquement a partir de la fenetre horaire de l'examen. Le parametre ci-dessous ne s'applique qu'en mode Personnalise.
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <h3 class="font-bold text-gray-900 mb-1">Compte a rebours global</h3>
            <p class="text-sm text-gray-500 mb-4">
              Definir une duree globale pour le module, ou laisser a 0 pour calculer automatiquement
              la somme des durees individuelles de chaque question.
            </p>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Duree globale (minutes)</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="timerForm.globalTimeLimit"
                    type="number"
                    min="0"
                    max="600"
                    class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <span class="text-sm text-gray-500">minutes (0 = somme automatique des questions)</span>
                </div>
              </div>

              <!-- Computed timer info -->
              <div v-if="computedTimer" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">&#9201;</span>
                  <span class="font-bold text-blue-800">
                    {{ timerForm.globalTimeLimit > 0 ? timerForm.globalTimeLimit : computedTimer.totalMinutes }} minutes
                  </span>
                  <span class="text-xs text-blue-500">
                    ({{ timerForm.globalTimeLimit > 0 ? 'duree globale' : 'calculee automatiquement' }})
                  </span>
                </div>
                <div v-if="computedTimer.breakdown && computedTimer.breakdown.length > 0" class="text-xs text-blue-600 space-y-1">
                  <p class="font-medium">Detail par question :</p>
                  <div v-for="(b, i) in computedTimer.breakdown" :key="i" class="flex items-center gap-2">
                    <span class="bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">{{ b.type }}</span>
                    <span class="text-blue-600 truncate flex-1">{{ b.question || '(sans titre)' }}</span>
                    <span class="font-mono font-bold">{{ b.duration }}min</span>
                  </div>
                </div>
              </div>
            </div>

            <button @click="saveTimer" :disabled="saving" class="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder le chronometre' }}
            </button>
          </div>

          <!-- Link to reporting -->
          <NuxtLink
            :to="`/admin/modules/${moduleId}/reporting`"
            class="block bg-purple-50 border border-purple-200 rounded-xl p-5 hover:bg-purple-100 transition"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-purple-800">Reporting et Resultats</h3>
                <p class="text-sm text-purple-600 mt-1">Voir les rapports PDF, export Excel, commentaires IA et remediation</p>
              </div>
              <span class="text-purple-400 text-2xl">&rarr;</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Onglet Exporter -->
        <div v-if="activeTab === 'export'" class="max-w-2xl">
          <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl text-gray-400">&#8681;</span>
            </div>
            <h3 class="font-bold text-gray-700 mb-2">Export cmi5</h3>
            <p class="text-sm text-gray-500 mb-4">Telecharger le manifeste cmi5.xml pour integration LMS</p>
            <a
              :href="`${apiBase}/cmi5/manifest/${store.current._id}`"
              target="_blank"
              class="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium"
            >
              Telecharger cmi5.xml
            </a>
          </div>

          <!-- Reporting shortcut -->
          <NuxtLink
            :to="`/admin/modules/${moduleId}/reporting`"
            class="mt-4 block bg-purple-50 border border-purple-200 rounded-xl p-5 hover:bg-purple-100 transition"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-purple-800">Export PDF / Excel des notes</h3>
                <p class="text-sm text-purple-600 mt-1">Rapports individuels et fichier de notes global</p>
              </div>
              <span class="text-purple-400 text-2xl">&rarr;</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Onglet Supprimer -->
        <div v-if="activeTab === 'delete'" class="max-w-2xl">
          <div class="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 class="font-bold text-red-800 mb-2">Zone dangereuse</h3>
            <p class="text-sm text-red-600 mb-4">La suppression est definitive et irreversible. Tous les chapitres, ecrans et contenus seront perdus.</p>
            <button
              @click="handleDelete"
              class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium"
            >
              Supprimer definitivement ce module
            </button>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { ThemeId, SurveillanceMode, StrictSettings, EvaluationType } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const routerNav = useRouter();
const store = useModulesStore();
const { apiFetch, baseURL: apiBase } = useApi();

const moduleId = route.params.id as string;

const activeTab = ref('properties');
const saving = ref(false);
const successMsg = ref('');
const sharingLoading = ref(false);
const copied = ref('');
const embedWidth = ref(800);
const embedHeight = ref(600);

const tabs = [
  { id: 'properties', label: 'Proprietes' },
  { id: 'theme', label: 'Theme' },
  { id: 'evaluation', label: 'Mode evaluation' },
  { id: 'timer', label: 'Chronometre' },
  { id: 'share', label: 'Partager' },
  { id: 'qrcode', label: 'QR Code' },
  { id: 'surveillance', label: 'Surveillance' },
  { id: 'export', label: 'Exporter' },
  { id: 'delete', label: 'Supprimer' },
];

const themes = [
  { id: 'ddene' as ThemeId, name: 'DDENE Officiel', primary: '#1e40af', headerBg: '#1e40af', bodyBg: '#f8fafc', bodyText: '#1e293b' },
  { id: 'nature' as ThemeId, name: 'Nature', primary: '#166534', headerBg: '#166534', bodyBg: '#fefce8', bodyText: '#1c1917' },
  { id: 'contrast' as ThemeId, name: 'Contraste', primary: '#fbbf24', headerBg: '#0f172a', bodyBg: '#1e293b', bodyText: '#f1f5f9' },
  { id: 'ocean' as ThemeId, name: 'Ocean', primary: '#0891b2', headerBg: '#164e63', bodyBg: '#ecfeff', bodyText: '#134e4a' },
  { id: 'sunset' as ThemeId, name: 'Coucher de soleil', primary: '#dc2626', headerBg: '#7c2d12', bodyBg: '#fff7ed', bodyText: '#1c1917' },
];

const editForm = reactive({
  title: '',
  description: '',
  language: 'fr',
  status: 'draft',
  theme: 'ddene' as ThemeId,
});

const survForm = reactive({
  surveillanceMode: 'light' as SurveillanceMode,
  strictSettings: {
    fullscreen: true,
    antiCopy: true,
    blurDetection: true,
    maxBlurCount: 3,
    autoSubmitOnExceed: false,
  } as StrictSettings,
});

const timerForm = reactive({
  globalTimeLimit: 0,
});
const computedTimer = ref<any>(null);

const evalForm = reactive({
  evaluationType: 'personalized' as EvaluationType,
  liveStartTime: '',
  liveEndTime: '',
  contestMode: false,
  proctoring: 'none' as 'none' | 'snapshot' | 'video',
  snapshotInterval: 30,
});

const shareInfo = reactive({
  shareEnabled: false,
  shareToken: null as string | null,
  shareUrl: null as string | null,
});

// QR Code state
const qrDataUrl = ref('');
const qrShareUrl = ref('');
const qrLoading = ref(false);
const qrSize = ref(300);

async function loadQrCode() {
  qrLoading.value = true;
  try {
    const res = await apiFetch(`/qr/module/${route.params.id}/data?size=${qrSize.value}`);
    const d = res.data as any;
    qrDataUrl.value = d.qrDataUrl;
    qrShareUrl.value = d.shareUrl;
  } catch {
    store.error = 'Impossible de generer le QR code';
  } finally {
    qrLoading.value = false;
  }
}

const iframeCode = computed(() => {
  if (!shareInfo.shareUrl) return '';
  return `<iframe width="${embedWidth.value}" height="${embedHeight.value}" src="${shareInfo.shareUrl}" frameborder="0" allowfullscreen></iframe>`;
});

function loadForm() {
  if (!store.current) return;
  editForm.title = store.current.title;
  editForm.description = store.current.description;
  editForm.language = store.current.language;
  editForm.status = store.current.status;
  editForm.theme = store.current.theme || 'ddene';
  // Surveillance
  survForm.surveillanceMode = store.current.surveillanceMode || 'light';
  if (store.current.strictSettings) {
    Object.assign(survForm.strictSettings, store.current.strictSettings);
  }
  // Timer
  timerForm.globalTimeLimit = (store.current as any).globalTimeLimit || 0;
  // Evaluation mode
  evalForm.evaluationType = (store.current as any).evaluationType || 'personalized';
  evalForm.liveStartTime = (store.current as any).liveStartTime
    ? new Date((store.current as any).liveStartTime).toISOString().slice(0, 16)
    : '';
  evalForm.liveEndTime = (store.current as any).liveEndTime
    ? new Date((store.current as any).liveEndTime).toISOString().slice(0, 16)
    : '';
  evalForm.contestMode = (store.current as any).contestMode || false;
  evalForm.proctoring = (store.current as any).proctoring || 'none';
  evalForm.snapshotInterval = (store.current as any).snapshotInterval || 30;
}

async function loadTimer() {
  try {
    const res = await apiFetch(`/reporting/module-timer/${moduleId}`);
    computedTimer.value = res.data;
  } catch { /* ignore */ }
}

async function saveTimer() {
  saving.value = true;
  successMsg.value = '';
  store.error = null;
  try {
    await store.updateModule(moduleId, {
      globalTimeLimit: timerForm.globalTimeLimit,
    } as any);
    successMsg.value = 'Chronometre sauvegarde !';
    setTimeout(() => { successMsg.value = ''; }, 3000);
    await loadTimer();
  } catch { /* handled in store */ } finally {
    saving.value = false;
  }
}

async function saveEvaluation() {
  if (evalForm.evaluationType === 'live') {
    if (!evalForm.liveStartTime || !evalForm.liveEndTime) {
      store.error = 'Les dates de debut et fin sont requises pour le mode Live';
      return;
    }
    if (new Date(evalForm.liveEndTime) <= new Date(evalForm.liveStartTime)) {
      store.error = 'La date de fin doit etre posterieure a la date de debut';
      return;
    }
  }
  saving.value = true;
  successMsg.value = '';
  store.error = null;
  try {
    await store.updateModule(moduleId, {
      evaluationType: evalForm.evaluationType,
      liveStartTime: evalForm.evaluationType === 'live' ? new Date(evalForm.liveStartTime).toISOString() : null,
      liveEndTime: evalForm.evaluationType === 'live' ? new Date(evalForm.liveEndTime).toISOString() : null,
      contestMode: evalForm.evaluationType === 'live' ? evalForm.contestMode : false,
      proctoring: evalForm.evaluationType === 'live' ? evalForm.proctoring : 'none',
      snapshotInterval: evalForm.snapshotInterval,
    } as any);
    successMsg.value = 'Mode d\'evaluation sauvegarde !';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch { /* handled in store */ } finally {
    saving.value = false;
  }
}

async function saveProperties() {
  saving.value = true;
  successMsg.value = '';
  store.error = null;
  try {
    await store.updateModule(moduleId, {
      title: editForm.title,
      description: editForm.description,
      language: editForm.language,
      status: editForm.status,
      theme: editForm.theme,
    } as any);
    successMsg.value = 'Proprietes sauvegardees !';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch { /* handled in store */ } finally {
    saving.value = false;
  }
}

async function saveSurveillance() {
  saving.value = true;
  successMsg.value = '';
  store.error = null;
  try {
    await store.updateModule(moduleId, {
      surveillanceMode: survForm.surveillanceMode,
      strictSettings: survForm.surveillanceMode === 'strict' ? { ...survForm.strictSettings } : undefined,
    } as any);
    successMsg.value = 'Configuration de surveillance sauvegardee !';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch { /* handled in store */ } finally {
    saving.value = false;
  }
}

async function selectTheme(themeId: ThemeId) {
  editForm.theme = themeId;
  store.error = null;
  try {
    await store.updateModule(moduleId, { theme: themeId } as any);
    successMsg.value = 'Theme applique !';
    setTimeout(() => { successMsg.value = ''; }, 2000);
  } catch { /* handled */ }
}

async function toggleShare(enabled: boolean) {
  sharingLoading.value = true;
  try {
    const res = await store.toggleShare(moduleId, enabled);
    shareInfo.shareEnabled = res.shareEnabled;
    shareInfo.shareToken = res.shareToken;
    shareInfo.shareUrl = res.shareUrl;
  } catch { /* handled */ } finally {
    sharingLoading.value = false;
  }
}

async function loadShareInfo() {
  try {
    const res = await store.getShareInfo(moduleId);
    shareInfo.shareEnabled = res.shareEnabled;
    shareInfo.shareToken = res.shareToken;
    shareInfo.shareUrl = res.shareUrl;
  } catch { /* not shared yet */ }
}

function copyToClipboard(text: string, type = 'url') {
  navigator.clipboard.writeText(text);
  copied.value = type;
  setTimeout(() => { copied.value = ''; }, 2000);
}

async function handleDelete() {
  if (!confirm('Etes-vous certain de vouloir supprimer ce module ? Cette action est irreversible.')) return;
  try {
    await store.deleteModule(moduleId);
    routerNav.push('/admin/modules');
  } catch { /* handled */ }
}

onMounted(async () => {
  await store.fetchModule(moduleId);
  loadForm();
  loadShareInfo();
  loadTimer();
});
</script>
