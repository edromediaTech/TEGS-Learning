<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Loading -->
      <div v-if="store.loading && !store.currentScreen" class="text-center py-12 text-gray-500">
        Chargement de l'ecran...
      </div>

      <!-- Erreur -->
      <div v-else-if="store.error && !store.currentScreen" class="text-center py-12">
        <p class="text-red-500 mb-4">{{ store.error }}</p>
        <NuxtLink :to="`/admin/modules/${moduleId}/structure`" class="text-primary-600 hover:text-primary-800">
          Retour a la structure
        </NuxtLink>
      </div>

      <!-- Studio 3 colonnes -->
      <div v-else-if="store.currentScreen" class="h-[calc(100vh-48px)] flex flex-col">
        <!-- Barre superieure Studio -->
        <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-3">
            <NuxtLink
              :to="`/admin/modules/${moduleId}/structure`"
              class="text-sm text-primary-600 hover:text-primary-800"
            >
              &larr; Retour
            </NuxtLink>
            <div class="h-5 w-px bg-gray-300"></div>
            <h1 class="text-lg font-bold text-gray-900">{{ store.currentScreen.moduleTitle }}</h1>
            <span class="text-gray-400">/</span>
            <span class="text-sm text-gray-600">{{ store.currentScreen.screen.title }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="showShareModal = true"
              class="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
            >
              <span>&#128279;</span>
              <span>Diffuser</span>
            </button>
            <div class="bg-gray-100 rounded-lg p-0.5 flex">
              <button
                @click="mode = 'edit'; clearError()"
                class="px-3 py-1 rounded-md text-xs font-medium transition"
                :class="mode === 'edit' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                Editeur
              </button>
              <button
                @click="mode = 'preview'; clearError()"
                class="px-3 py-1 rounded-md text-xs font-medium transition"
                :class="mode === 'preview' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                Apercu
              </button>
            </div>
            <button
              @click="save"
              :disabled="saving"
              class="bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
          </div>
        </div>

        <!-- Modal Diffuser / Partager -->
        <Teleport to="body">
          <div v-if="showShareModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showShareModal = false">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <!-- Header -->
              <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                <h3 class="text-white font-bold text-lg">Diffuser ce module</h3>
                <button @click="showShareModal = false" class="text-white/70 hover:text-white text-xl">&times;</button>
              </div>

              <div class="p-6 space-y-5">
                <!-- Activer le partage -->
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p class="font-medium text-gray-800 text-sm">Partage public</p>
                    <p class="text-xs text-gray-500">Rendre ce module accessible via un lien</p>
                  </div>
                  <button
                    @click="handleToggleShare(!shareData.shareEnabled)"
                    :disabled="shareLoading"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    :class="shareData.shareEnabled ? 'bg-emerald-500' : 'bg-gray-300'"
                  >
                    <span
                      class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                      :class="shareData.shareEnabled ? 'translate-x-6' : 'translate-x-1'"
                    ></span>
                  </button>
                </div>

                <template v-if="shareData.shareEnabled && shareData.shareUrl">
                  <!-- URL -->
                  <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1.5 block">URL publique</label>
                    <div class="flex items-center space-x-2">
                      <input
                        :value="shareData.shareUrl"
                        readonly
                        class="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono text-gray-700"
                      />
                      <button
                        @click="copyText(shareData.shareUrl!, 'url')"
                        class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium whitespace-nowrap"
                      >
                        {{ shareCopied === 'url' ? 'Copie !' : 'Copier' }}
                      </button>
                    </div>
                  </div>

                  <!-- Iframe -->
                  <div>
                    <label class="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Code Iframe</label>
                    <div class="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs break-all">
                      {{ shareIframeCode }}
                    </div>
                    <div class="flex items-center justify-between mt-2">
                      <div class="flex items-center space-x-3">
                        <div class="flex items-center space-x-1">
                          <label class="text-xs text-gray-500">L:</label>
                          <input v-model.number="shareEmbedW" type="number" min="300" max="1400" class="w-16 px-1.5 py-1 border border-gray-200 rounded text-xs" />
                        </div>
                        <div class="flex items-center space-x-1">
                          <label class="text-xs text-gray-500">H:</label>
                          <input v-model.number="shareEmbedH" type="number" min="300" max="1000" class="w-16 px-1.5 py-1 border border-gray-200 rounded text-xs" />
                        </div>
                      </div>
                      <button
                        @click="copyText(shareIframeCode, 'iframe')"
                        class="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-xs font-medium"
                      >
                        {{ shareCopied === 'iframe' ? 'Copie !' : 'Copier le code' }}
                      </button>
                    </div>
                  </div>
                </template>

                <div v-else-if="!shareData.shareEnabled" class="text-center py-4 text-gray-400 text-sm">
                  Activez le partage pour obtenir l'URL et le code iframe.
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Messages -->
        <div v-if="saved" class="mx-4 mt-2 p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex-shrink-0">
          Contenu sauvegarde avec succes !
        </div>
        <div v-if="store.error" class="mx-4 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex-shrink-0">
          {{ store.error }}
        </div>

        <!-- ===== MODE EDITEUR : Layout 3 colonnes ===== -->
        <div v-if="mode === 'edit'" class="flex flex-1 overflow-hidden mt-2">
          <!-- COLONNE GAUCHE : Arborescence Module > Chapitres > Ecrans -->
          <div class="w-60 bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 flex flex-col flex-shrink-0">
            <!-- Module title -->
            <div class="px-3 py-2.5 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
              <p class="text-[10px] font-bold text-primary-200 uppercase tracking-wider">Module</p>
              <p class="text-sm font-bold text-white truncate">{{ store.currentScreen.moduleTitle }}</p>
            </div>

            <!-- Tree: Chapitres > Ecrans -->
            <div class="flex-1 overflow-y-auto py-2">
              <div v-for="(section, secIdx) in allSections" :key="section._id || secIdx" class="mb-1">
                <!-- Chapitre header -->
                <div class="group flex items-center px-2 py-1.5 mx-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  @click="toggleSection(secIdx)"
                >
                  <span class="text-[10px] mr-1 text-gray-400 transition" :class="expandedSections.has(secIdx) ? 'rotate-90' : ''">&#9654;</span>
                  <span class="w-5 h-5 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[9px] font-bold mr-1.5 flex-shrink-0">
                    {{ secIdx + 1 }}
                  </span>
                  <span class="flex-1 text-xs font-semibold text-gray-700 truncate">{{ section.title }}</span>
                  <button
                    @click.stop="openChapterMenu(secIdx)"
                    class="text-gray-400 hover:text-gray-600 text-xs opacity-0 group-hover:opacity-100 px-1"
                  >&#8942;</button>
                </div>

                <!-- Chapter menu -->
                <div v-if="chapterMenuIdx === secIdx" class="mx-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 relative">
                  <button @click="addScreenToSectionIdx(secIdx)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">+ Ajouter un ecran</button>
                  <button @click="renameChapter(secIdx)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">Renommer</button>
                  <button v-if="secIdx > 0" @click="moveChapter(secIdx, -1)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">Monter</button>
                  <button v-if="secIdx < allSections.length - 1" @click="moveChapter(secIdx, 1)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">Descendre</button>
                  <hr class="my-1 border-gray-100" />
                  <button @click="deleteChapter(secIdx)" class="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600">Supprimer</button>
                </div>

                <!-- Ecrans du chapitre -->
                <div v-if="expandedSections.has(secIdx)" class="ml-4 mt-0.5 space-y-0.5">
                  <div
                    v-for="(screen, sIdx) in section.screens"
                    :key="screen._id"
                    class="group/s relative"
                  >
                    <!-- Rename input -->
                    <div v-if="renamingScreenId === screen._id" class="flex items-center space-x-1 px-1">
                      <input
                        v-model="renameValue"
                        @keyup.enter="confirmRename(screen._id!)"
                        @blur="confirmRename(screen._id!)"
                        @keyup.escape="renamingScreenId = null"
                        class="flex-1 px-2 py-1 border border-primary-300 rounded text-[11px] focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <!-- Screen link -->
                    <NuxtLink
                      v-else
                      :to="`/admin/modules/${moduleId}/screens/${screen._id}`"
                      class="flex items-center px-2 py-1.5 mx-1 rounded-md text-xs transition truncate"
                      :class="screen._id === screenId
                        ? 'bg-primary-100 text-primary-800 font-semibold border border-primary-300 shadow-sm'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-primary-700'"
                    >
                      <span class="w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0"
                        :class="screen._id === screenId ? 'bg-primary-500' : 'bg-gray-300'"
                      ></span>
                      {{ screen.title }}
                    </NuxtLink>

                    <!-- Screen actions - always visible -->
                    <div
                      v-if="renamingScreenId !== screen._id"
                      class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                    >
                      <button @click.prevent="startRename(screen)" class="text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition" title="Renommer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button @click.prevent="duplicateScreen(screen)" class="text-gray-400 hover:text-green-600 p-0.5 rounded hover:bg-green-50 transition" title="Dupliquer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      </button>
                      <template v-if="section.screens.length > 1">
                        <button v-if="sIdx > 0" @click.prevent="moveScreenInSection(sIdx, -1)" class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-amber-50 transition" title="Monter">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                        </button>
                        <button v-if="sIdx < section.screens.length - 1" @click.prevent="moveScreenInSection(sIdx, 1)" class="text-gray-400 hover:text-amber-600 p-0.5 rounded hover:bg-amber-50 transition" title="Descendre">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                      </template>
                      <button @click.prevent="deleteScreen(screen._id!)" class="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition" title="Supprimer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>

                  <!-- Add screen button -->
                  <button
                    @click="addScreenToSectionIdx(secIdx)"
                    class="flex items-center w-full px-3 py-1 mx-1 text-[10px] text-gray-400 hover:text-primary-600 transition"
                  >
                    <span class="mr-1">+</span> Ecran
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer: Add chapter -->
            <div class="p-2 border-t border-gray-200 space-y-1">
              <button
                @click="addChapter"
                class="w-full text-xs border border-dashed border-amber-300 text-amber-600 py-1.5 rounded-lg hover:bg-amber-50 hover:border-amber-400 transition font-medium"
              >
                + Nouveau chapitre
              </button>
            </div>
          </div>

          <!-- COLONNE CENTRALE : Canevas -->
          <div class="flex-1 overflow-y-auto p-4 bg-gray-100">
            <div class="max-w-3xl mx-auto space-y-3">
              <!-- Blocs existants -->
              <div
                v-for="(block, idx) in blocks"
                :key="idx"
                class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <!-- Header du bloc -->
                <div class="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
                  <div class="flex items-center space-x-2">
                    <span
                      class="px-2 py-0.5 text-xs font-bold rounded"
                      :class="blockTypeClass(block.type)"
                    >
                      {{ blockTypeLabel(block.type) }}
                    </span>
                    <span class="text-xs text-gray-400">{{ idx + 1 }}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <button
                      v-if="idx > 0"
                      @click="moveBlock(idx, -1)"
                      class="text-gray-400 hover:text-gray-600 px-1 text-sm"
                      title="Monter"
                    >&uarr;</button>
                    <button
                      v-if="idx < blocks.length - 1"
                      @click="moveBlock(idx, 1)"
                      class="text-gray-400 hover:text-gray-600 px-1 text-sm"
                      title="Descendre"
                    >&darr;</button>
                    <button
                      @click="removeBlock(idx)"
                      class="text-red-400 hover:text-red-600 px-2 text-xs"
                    >Supprimer</button>
                  </div>
                </div>

                <!-- Editeur du bloc -->
                <div class="p-4">
                  <BlocksTextBlockEdit v-if="block.type === 'text'" v-model="block.data" />
                  <BlocksMediaBlockEdit v-if="block.type === 'media'" v-model="block.data" />
                  <BlocksQuizBlockEdit v-if="block.type === 'quiz'" v-model="block.data" :block-id="String(idx)" />
                  <BlocksHeadingBlockEdit v-if="block.type === 'heading'" v-model="block.data" />
                  <BlocksSeparatorBlockEdit v-if="block.type === 'separator'" v-model="block.data" />
                  <BlocksImageBlockEdit v-if="block.type === 'image'" v-model="block.data" />
                  <BlocksTextImageBlockEdit v-if="block.type === 'text_image'" v-model="block.data" />
                  <BlocksVideoBlockEdit v-if="block.type === 'video'" v-model="block.data" />
                  <BlocksAudioBlockEdit v-if="block.type === 'audio'" v-model="block.data" />
                  <BlocksPdfBlockEdit v-if="block.type === 'pdf'" v-model="block.data" />
                  <BlocksEmbedBlockEdit v-if="block.type === 'embed'" v-model="block.data" />
                  <BlocksTrueFalseBlockEdit v-if="block.type === 'true_false'" v-model="block.data" />
                  <BlocksNumericBlockEdit v-if="block.type === 'numeric'" v-model="block.data" />
                  <BlocksFillBlankBlockEdit v-if="block.type === 'fill_blank'" v-model="block.data" />
                  <BlocksMatchingBlockEdit v-if="block.type === 'matching'" v-model="block.data" />
                  <BlocksSequenceBlockEdit v-if="block.type === 'sequence'" v-model="block.data" />
                  <BlocksLikertBlockEdit v-if="block.type === 'likert'" v-model="block.data" />
                </div>
              </div>

              <!-- Zone de depot vide -->
              <div v-if="blocks.length === 0" class="border-2 border-dashed border-gray-300 rounded-xl py-16 text-center text-gray-400">
                <p class="text-lg mb-2">Glissez/deposez un nouveau bloc ici</p>
                <p class="text-sm">ou choisissez un bloc dans la palette a droite</p>
              </div>
            </div>
          </div>

          <!-- COLONNE DROITE : Palette -->
          <div class="w-64 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <!-- Onglets Palette -->
            <div class="flex border-b border-gray-200 flex-shrink-0">
              <button
                @click="paletteTab = 'blocs'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'blocs' ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Blocs
              </button>
              <button
                @click="paletteTab = 'questions'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'questions' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Questions
              </button>
              <button
                @click="paletteTab = 'aide'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'aide' ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Aide
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-3">
              <!-- Blocs contenu -->
              <div v-if="paletteTab === 'blocs'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in contentBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-primary-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
              </div>

              <!-- Blocs questions -->
              <div v-if="paletteTab === 'questions'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in questionBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-green-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
              </div>

              <!-- Aide -->
              <div v-if="paletteTab === 'aide'" class="text-sm text-gray-600 space-y-3">
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Comment utiliser le Studio</h4>
                  <p class="text-xs leading-relaxed">Cliquez sur un bloc dans les onglets <strong>Blocs</strong> ou <strong>Questions</strong> pour l'ajouter a l'ecran.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Reordonner</h4>
                  <p class="text-xs leading-relaxed">Utilisez les fleches haut/bas sur chaque bloc pour changer l'ordre.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Apercu</h4>
                  <p class="text-xs leading-relaxed">Basculez en mode <strong>Apercu</strong> pour voir le rendu eleve.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Types de blocs</h4>
                  <ul class="text-xs space-y-1 ml-3 list-disc">
                    <li><strong>Titre</strong> : H1, H2, H3</li>
                    <li><strong>Paragraphe</strong> : Texte avec markdown</li>
                    <li><strong>Image</strong> : URL avec taille ajustable</li>
                    <li><strong>Texte + Image</strong> : Layout cote a cote</li>
                    <li><strong>Video</strong> : YouTube ou MP4</li>
                    <li><strong>Audio</strong> : Fichier MP3</li>
                    <li><strong>PDF</strong> : Document integre</li>
                    <li><strong>Embed</strong> : Iframe externe</li>
                  </ul>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Types de questions</h4>
                  <ul class="text-xs space-y-1 ml-3 list-disc">
                    <li><strong>QCM/QCU</strong> : Choix multiples</li>
                    <li><strong>Vrai/Faux</strong> : Assertion</li>
                    <li><strong>Numerique</strong> : Reponse chiffree</li>
                    <li><strong>Texte a trous</strong> : Completer le texte</li>
                    <li><strong>Appariement</strong> : Associer des paires</li>
                    <li><strong>Sequence</strong> : Ordonner</li>
                    <li><strong>Likert</strong> : Echelle d'opinion</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== MODE PREVIEW ===== -->
        <div v-if="mode === 'preview'" class="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div class="max-w-3xl mx-auto">
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div class="bg-primary-800 text-white px-6 py-4">
                <p class="text-sm text-primary-200">{{ store.currentScreen.sectionTitle }}</p>
                <h2 class="text-xl font-bold">{{ store.currentScreen.screen.title }}</h2>
              </div>

              <div class="p-6 space-y-6">
                <div v-if="blocks.length === 0" class="text-center py-8 text-gray-400">
                  Cet ecran est vide.
                </div>

                <div v-for="(block, idx) in sortedBlocks" :key="idx">
                  <BlocksTextBlockPreview v-if="block.type === 'text'" :data="block.data" />
                  <BlocksMediaBlockPreview v-if="block.type === 'media'" :data="block.data" />
                  <BlocksQuizBlockPreview v-if="block.type === 'quiz'" :data="block.data" />
                  <BlocksHeadingBlockPreview v-if="block.type === 'heading'" :data="block.data" />
                  <BlocksSeparatorBlockPreview v-if="block.type === 'separator'" :data="block.data" />
                  <BlocksImageBlockPreview v-if="block.type === 'image'" :data="block.data" />
                  <BlocksTextImageBlockPreview v-if="block.type === 'text_image'" :data="block.data" />
                  <BlocksVideoBlockPreview v-if="block.type === 'video'" :data="block.data" />
                  <BlocksAudioBlockPreview v-if="block.type === 'audio'" :data="block.data" />
                  <BlocksPdfBlockPreview v-if="block.type === 'pdf'" :data="block.data" />
                  <BlocksEmbedBlockPreview v-if="block.type === 'embed'" :data="block.data" />
                  <BlocksTrueFalseBlockPreview v-if="block.type === 'true_false'" :data="block.data" />
                  <BlocksNumericBlockPreview v-if="block.type === 'numeric'" :data="block.data" />
                  <BlocksFillBlankBlockPreview v-if="block.type === 'fill_blank'" :data="block.data" />
                  <BlocksMatchingBlockPreview v-if="block.type === 'matching'" :data="block.data" />
                  <BlocksSequenceBlockPreview v-if="block.type === 'sequence'" :data="block.data" />
                  <BlocksLikertBlockPreview v-if="block.type === 'likert'" :data="block.data" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { ContentBlock, BlockType } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useModulesStore();

const moduleId = route.params.id as string;
const screenId = route.params.screenId as string;

const mode = ref<'edit' | 'preview'>('edit');
const saving = ref(false);
const saved = ref(false);

// Share modal
const showShareModal = ref(false);
const shareLoading = ref(false);
const shareCopied = ref('');
const shareEmbedW = ref(800);
const shareEmbedH = ref(600);
const shareData = reactive({
  shareEnabled: false,
  shareToken: null as string | null,
  shareUrl: null as string | null,
});

const shareIframeCode = computed(() => {
  if (!shareData.shareUrl) return '';
  return `<iframe width="${shareEmbedW.value}" height="${shareEmbedH.value}" src="${shareData.shareUrl}" frameborder="0" allowfullscreen></iframe>`;
});

async function handleToggleShare(enabled: boolean) {
  shareLoading.value = true;
  try {
    const res = await store.toggleShare(moduleId, enabled);
    shareData.shareEnabled = res.shareEnabled;
    shareData.shareToken = res.shareToken;
    shareData.shareUrl = res.shareUrl;
  } catch { /* handled */ } finally {
    shareLoading.value = false;
  }
}

async function loadShareInfo() {
  try {
    const res = await store.getShareInfo(moduleId);
    shareData.shareEnabled = res.shareEnabled;
    shareData.shareToken = res.shareToken;
    shareData.shareUrl = res.shareUrl;
  } catch { /* not shared */ }
}

function copyText(text: string, type = 'url') {
  navigator.clipboard.writeText(text);
  shareCopied.value = type;
  setTimeout(() => { shareCopied.value = ''; }, 2000);
}

interface EditableBlock {
  type: BlockType;
  order: number;
  data: any;
}

const blocks = ref<EditableBlock[]>([]);
const paletteTab = ref<'blocs' | 'questions' | 'aide'>('blocs');

const contentBlocks = [
  { type: 'heading' as BlockType, icon: 'H', label: 'Titre' },
  { type: 'text' as BlockType, icon: '\u00B6', label: 'Paragraphe' },
  { type: 'separator' as BlockType, icon: '\u2500', label: 'Separateur' },
  { type: 'image' as BlockType, icon: '\uD83D\uDDBC', label: 'Image' },
  { type: 'text_image' as BlockType, icon: '\uD83D\uDCF0', label: 'Texte + Image' },
  { type: 'video' as BlockType, icon: '\u25B6', label: 'Video' },
  { type: 'audio' as BlockType, icon: '\uD83D\uDD0A', label: 'Audio' },
  { type: 'pdf' as BlockType, icon: '\uD83D\uDCC4', label: 'PDF' },
  { type: 'embed' as BlockType, icon: '\u2699', label: 'Objet integre' },
  { type: 'media' as BlockType, icon: '\uD83C\uDFA5', label: 'Media (legacy)' },
];

const questionBlocks = [
  { type: 'quiz' as BlockType, icon: '\u2611', label: 'QCM / QCU' },
  { type: 'true_false' as BlockType, icon: '\u2713\u2717', label: 'Vrai / Faux' },
  { type: 'numeric' as BlockType, icon: '#', label: 'Numerique' },
  { type: 'fill_blank' as BlockType, icon: '_\u2026', label: 'Texte a trous' },
  { type: 'matching' as BlockType, icon: '\u21C4', label: 'Appariement' },
  { type: 'sequence' as BlockType, icon: '1\u20262\u20263', label: 'Sequence' },
  { type: 'likert' as BlockType, icon: '\u2605', label: 'Likert' },
];

// Toutes les sections du module (arborescence complete)
const allSections = computed(() => store.current?.sections || []);

// Liste des ecrans de la section courante
const sectionScreens = computed(() => {
  if (!store.current?.sections) return [];
  const sectionTitle = store.currentScreen?.sectionTitle;
  const section = store.current.sections.find(s => s.title === sectionTitle);
  return section?.screens || [];
});

// Sections depliees dans le tree
const expandedSections = ref(new Set<number>());
const chapterMenuIdx = ref<number | null>(null);

// Ouvrir automatiquement le chapitre actuel
watch(() => store.currentScreen?.sectionTitle, () => {
  if (!store.current?.sections) return;
  const idx = store.current.sections.findIndex(s => s.title === store.currentScreen?.sectionTitle);
  if (idx >= 0) expandedSections.value.add(idx);
}, { immediate: true });

function toggleSection(idx: number) {
  if (expandedSections.value.has(idx)) {
    expandedSections.value.delete(idx);
  } else {
    expandedSections.value.add(idx);
  }
}

function openChapterMenu(idx: number) {
  chapterMenuIdx.value = chapterMenuIdx.value === idx ? null : idx;
}

async function addChapter() {
  if (!store.current) return;
  const sections = store.current.sections.map(s => ({
    _id: s._id, title: s.title, order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  sections.push({ title: `Chapitre ${sections.length + 1}`, order: sections.length, screens: [] } as any);
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  expandedSections.value.add(sections.length - 1);
}

async function renameChapter(idx: number) {
  chapterMenuIdx.value = null;
  const section = store.current?.sections[idx];
  if (!section) return;
  const newName = prompt('Nouveau nom du chapitre :', section.title);
  if (!newName || !newName.trim() || !store.current) return;
  const sections = store.current.sections.map((s, i) => ({
    _id: s._id, title: i === idx ? newName.trim() : s.title, order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  if (store.currentScreen?.sectionTitle === section.title) {
    await store.fetchScreen(moduleId, screenId);
  }
}

async function moveChapter(idx: number, dir: number) {
  chapterMenuIdx.value = null;
  if (!store.current) return;
  const sections = store.current.sections.map(s => ({
    _id: s._id, title: s.title, order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  const target = idx + dir;
  const temp = sections[idx];
  sections[idx] = sections[target];
  sections[target] = temp;
  sections.forEach((s, i) => { s.order = i; });
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
}

async function deleteChapter(idx: number) {
  chapterMenuIdx.value = null;
  if (!store.current) return;
  const section = store.current.sections[idx];
  if (!confirm(`Supprimer le chapitre "${section.title}" et tous ses ecrans ?`)) return;
  const sections = store.current.sections
    .filter((_, i) => i !== idx)
    .map((s, i) => ({
      _id: s._id, title: s.title, order: i,
      screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
    }));
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  // Si on etait dans ce chapitre, naviguer ailleurs
  if (store.currentScreen?.sectionTitle === section.title) {
    const first = store.current?.sections?.[0]?.screens?.[0];
    if (first?._id) navigateTo(`/admin/modules/${moduleId}/screens/${first._id}`);
    else navigateTo(`/admin/modules/${moduleId}/structure`);
  }
}

async function addScreenToSectionIdx(secIdx: number) {
  chapterMenuIdx.value = null;
  if (!store.current) return;
  const sections = store.current.sections.map(s => ({
    _id: s._id, title: s.title, order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  sections[secIdx].screens.push({ title: `Ecran ${sections[secIdx].screens.length + 1}`, order: sections[secIdx].screens.length } as any);
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  expandedSections.value.add(secIdx);
}

// --- Gestion des ecrans dans la sidebar ---
const screenMenuId = ref<string | null>(null);
const renamingScreenId = ref<string | null>(null);
const renameValue = ref('');

// Fermer le menu au clic ailleurs
function onDocClick(e: Event) {
  if (screenMenuId.value && !(e.target as HTMLElement).closest('[data-screen-menu]')) {
    screenMenuId.value = null;
  }
}
onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

function openScreenMenu(id: string) {
  screenMenuId.value = screenMenuId.value === id ? null : id;
}

function startRename(screen: any) {
  screenMenuId.value = null;
  renamingScreenId.value = screen._id;
  renameValue.value = screen.title;
  nextTick(() => {
    const input = document.querySelector('input[ref="renameInput"]') as HTMLInputElement;
    input?.focus();
  });
}

async function confirmRename(id: string) {
  if (!renameValue.value.trim() || !store.current) {
    renamingScreenId.value = null;
    return;
  }
  // Mettre a jour la structure avec le nouveau titre
  const sections = store.current.sections.map(s => ({
    _id: s._id,
    title: s.title,
    order: s.order,
    screens: s.screens.map(sc => ({
      _id: sc._id,
      title: sc._id === id ? renameValue.value.trim() : sc.title,
      order: sc.order,
    })),
  }));
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  if (id === screenId) {
    await store.fetchScreen(moduleId, screenId);
  }
  renamingScreenId.value = null;
}

function getCurrentSection() {
  if (!store.current?.sections) return null;
  const sectionTitle = store.currentScreen?.sectionTitle;
  return store.current.sections.find(s => s.title === sectionTitle) || null;
}

async function addScreenToSection() {
  if (!store.current) return;
  const section = getCurrentSection();
  if (!section) return;
  const sections = store.current.sections.map(s => ({
    _id: s._id,
    title: s.title,
    order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  const target = sections.find(s => s._id === section._id);
  if (target) {
    target.screens.push({ title: `Ecran ${target.screens.length + 1}`, order: target.screens.length } as any);
  }
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
}

async function deleteScreen(id: string) {
  if (!store.current) return;
  if (sectionScreens.value.length <= 1) {
    alert('Impossible de supprimer le dernier ecran. Supprimez le chapitre depuis la page Structure.');
    return;
  }
  if (!confirm('Supprimer cet ecran et tout son contenu ?')) return;
  const sections = store.current.sections.map(s => ({
    _id: s._id,
    title: s.title,
    order: s.order,
    screens: s.screens
      .filter(sc => sc._id !== id)
      .map((sc, i) => ({ _id: sc._id, title: sc.title, order: i })),
  }));
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
  screenMenuId.value = null;
  // Si on a supprime l'ecran actuel, naviguer vers le premier ecran restant
  if (id === screenId) {
    const remaining = getCurrentSection()?.screens;
    if (remaining?.length) {
      navigateTo(`/admin/modules/${moduleId}/screens/${remaining[0]._id}`);
    } else {
      navigateTo(`/admin/modules/${moduleId}/structure`);
    }
  }
}

async function duplicateScreen(screen: any) {
  if (!store.current) return;
  screenMenuId.value = null;
  // Recuperer le contenu de l'ecran source
  await store.fetchScreen(moduleId, screen._id);
  const sourceBlocks = store.currentScreen?.screen?.contentBlocks || [];

  // Ajouter l'ecran dans la structure
  const sections = store.current.sections.map(s => ({
    _id: s._id,
    title: s.title,
    order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  const section = sections.find(s => s.title === store.currentScreen?.sectionTitle);
  if (!section) return;
  const srcIdx = section.screens.findIndex(sc => sc._id === screen._id);
  section.screens.splice(srcIdx + 1, 0, { title: `${screen.title} (copie)`, order: srcIdx + 1 } as any);
  section.screens.forEach((sc, i) => { sc.order = i; });

  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);

  // Copier le contenu vers le nouvel ecran
  const updatedSection = store.current!.sections.find(s => s._id === section._id);
  const newScreen = updatedSection?.screens[srcIdx + 1];
  if (newScreen?._id && sourceBlocks.length > 0) {
    const blocksCopy = sourceBlocks.map((b, i) => ({
      type: b.type,
      order: i,
      data: JSON.parse(JSON.stringify(b.data)),
    }));
    await store.saveScreenContent(moduleId, newScreen._id!, blocksCopy);
  }

  // Recharger l'ecran actuel
  await store.fetchScreen(moduleId, screenId);
  loadBlocks();
}

async function moveScreenInSection(currentIdx: number, dir: number) {
  if (!store.current) return;
  screenMenuId.value = null;
  const sections = store.current.sections.map(s => ({
    _id: s._id,
    title: s.title,
    order: s.order,
    screens: s.screens.map(sc => ({ _id: sc._id, title: sc.title, order: sc.order })),
  }));
  const section = sections.find(s => s.title === store.currentScreen?.sectionTitle);
  if (!section) return;
  const targetIdx = currentIdx + dir;
  const temp = section.screens[currentIdx];
  section.screens[currentIdx] = section.screens[targetIdx];
  section.screens[targetIdx] = temp;
  section.screens.forEach((sc, i) => { sc.order = i; });
  await store.updateStructure(store.current._id, sections);
  await store.fetchModule(moduleId);
}

const sortedBlocks = computed(() =>
  [...blocks.value].sort((a, b) => a.order - b.order)
);

function loadBlocks() {
  if (!store.currentScreen?.screen) return;
  const existing = store.currentScreen.screen.contentBlocks || [];
  blocks.value = existing.map((b, i) => ({
    type: b.type,
    order: b.order ?? i,
    data: JSON.parse(JSON.stringify(b.data)),
  }));
}

function defaultData(type: string): any {
  const defaults: Record<string, any> = {
    text: { content: '' },
    media: { url: '', mediaType: 'image', caption: '' },
    quiz: { question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }], explanation: '' },
    heading: { text: '', level: 1 },
    separator: { style: 'solid' },
    image: { url: '', alt: '', caption: '', size: 'full' },
    text_image: { text: '', imageUrl: '', layout: 'text-left' },
    video: { url: '', caption: '' },
    audio: { url: '', title: '' },
    pdf: { url: '', title: '', height: 500 },
    embed: { url: '', width: 800, height: 500, title: '' },
    true_false: { statement: '', answer: true, explanation: '' },
    numeric: { question: '', answer: 0, tolerance: 0, unit: '', explanation: '' },
    fill_blank: { text: '', explanation: '' },
    matching: { instruction: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }], explanation: '' },
    sequence: { instruction: '', items: ['', '', ''], explanation: '' },
    likert: { question: '', scale: 'agreement' },
  };
  return defaults[type] || {};
}

function clearError() {
  store.error = null;
}

function addBlock(type: BlockType) {
  clearError();
  blocks.value.push({
    type,
    order: blocks.value.length,
    data: defaultData(type),
  });
}

function removeBlock(idx: number) {
  clearError();
  blocks.value.splice(idx, 1);
  reorder();
}

function moveBlock(idx: number, dir: number) {
  const target = idx + dir;
  const temp = blocks.value[idx];
  blocks.value[idx] = blocks.value[target];
  blocks.value[target] = temp;
  reorder();
}

function reorder() {
  blocks.value.forEach((b, i) => { b.order = i; });
}

function blockTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: 'TEXTE', media: 'MEDIA', quiz: 'QCM',
    heading: 'TITRE', separator: 'SEPARATEUR', image: 'IMAGE',
    text_image: 'TEXTE + IMAGE', video: 'VIDEO', audio: 'AUDIO',
    pdf: 'PDF', embed: 'EMBED',
    true_false: 'VRAI/FAUX', numeric: 'NUMERIQUE', fill_blank: 'TEXTE A TROUS',
    matching: 'APPARIEMENT', sequence: 'SEQUENCE', likert: 'LIKERT',
  };
  return labels[type] || type.toUpperCase();
}

function blockTypeClass(type: string) {
  const classes: Record<string, string> = {
    text: 'bg-blue-100 text-blue-700',
    media: 'bg-purple-100 text-purple-700',
    quiz: 'bg-green-100 text-green-700',
    heading: 'bg-gray-800 text-white',
    separator: 'bg-gray-200 text-gray-600',
    image: 'bg-pink-100 text-pink-700',
    text_image: 'bg-cyan-100 text-cyan-700',
    video: 'bg-red-100 text-red-700',
    audio: 'bg-yellow-100 text-yellow-700',
    pdf: 'bg-orange-100 text-orange-700',
    embed: 'bg-slate-100 text-slate-700',
    true_false: 'bg-amber-100 text-amber-700',
    numeric: 'bg-indigo-100 text-indigo-700',
    fill_blank: 'bg-teal-100 text-teal-700',
    matching: 'bg-violet-100 text-violet-700',
    sequence: 'bg-orange-100 text-orange-700',
    likert: 'bg-pink-100 text-pink-700',
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

async function save() {
  saving.value = true;
  saved.value = false;
  store.error = null;
  try {
    const payload = blocks.value.map((b, i) => ({
      type: b.type,
      order: i,
      data: b.data,
    }));
    await store.saveScreenContent(moduleId, screenId, payload);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch {
    // error in store
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  // Charger le module complet (pour la sidebar des ecrans)
  await Promise.all([
    store.fetchModule(moduleId),
    store.fetchScreen(moduleId, screenId),
  ]);
  loadBlocks();
  loadShareInfo();
});
</script>
