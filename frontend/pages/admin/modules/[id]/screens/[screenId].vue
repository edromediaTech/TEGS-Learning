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
            <!-- Undo / Redo -->
            <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                @click="undo"
                :disabled="!canUndo"
                class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
                title="Annuler (Ctrl+Z)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4"/></svg>
              </button>
              <button
                @click="redo"
                :disabled="!canRedo"
                class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
                title="Retablir (Ctrl+Y)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"/></svg>
              </button>
            </div>
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
            <!-- Save with auto-save indicator -->
            <div class="flex items-center space-x-2">
              <span v-if="autoSaveStatus === 'saving'" class="text-xs text-amber-500 animate-pulse">Sauvegarde auto...</span>
              <span v-else-if="autoSaveStatus === 'saved'" class="text-xs text-green-500">Sauvegarde</span>
              <span v-else-if="isDirty" class="text-xs text-amber-500">Non sauvegarde</span>
              <button
                @click="save"
                :disabled="saving"
                class="bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Toast Notifications -->
        <Teleport to="body">
          <TransitionGroup name="toast" tag="div" class="fixed top-4 right-4 z-[60] flex flex-col gap-2">
            <div
              v-for="t in toasts"
              :key="t.id"
              class="px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 min-w-[200px] max-w-[360px] backdrop-blur"
              :class="{
                'bg-green-600 text-white': t.type === 'success',
                'bg-red-600 text-white': t.type === 'error',
                'bg-blue-600 text-white': t.type === 'info',
              }"
            >
              <span v-if="t.type === 'success'">&#10003;</span>
              <span v-else-if="t.type === 'error'">&#10007;</span>
              <span v-else>&#8505;</span>
              <span class="flex-1">{{ t.message }}</span>
            </div>
          </TransitionGroup>
        </Teleport>

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

        <!-- Error bar (toast for success) -->
        <div v-if="store.error" class="mx-4 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex-shrink-0">
          {{ store.error }}
        </div>

        <!-- ===== MODE EDITEUR : Layout 3 colonnes ===== -->
        <div v-if="mode === 'edit'" class="flex flex-1 overflow-hidden mt-2">
          <!-- COLONNE GAUCHE : Arborescence Module > Chapitres > Ecrans -->
          <div class="w-60 bg-gradient-to-b from-slate-100 to-slate-50 border-r border-gray-200 flex flex-col flex-shrink-0">
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
          <div
            class="flex-1 overflow-y-auto p-4 bg-gray-100"
            @dragover.prevent
            @drop.prevent="onCanvasDrop"
          >
            <div class="max-w-3xl mx-auto space-y-1">
              <!-- Blocs existants avec drag-and-drop -->
              <TransitionGroup name="block-list" tag="div" class="space-y-1">
                <div
                  v-for="(block, idx) in blocks"
                  :key="block._uid"
                  class="group/block transition-all duration-200"
                  :class="{
                    'ring-2 ring-primary-400 ring-offset-1 rounded-xl': selectedBlockIdx === idx,
                    'opacity-40 scale-[0.98]': dragIdx === idx,
                  }"
                  draggable="true"
                  @dragstart="onDragStart(idx, $event)"
                  @dragend="onDragEnd"
                  @dragover.prevent="onDragOver(idx, $event)"
                  @drop.prevent="onDrop(idx)"
                  @click="selectedBlockIdx = idx"
                >
                  <!-- Drop indicator line above -->
                  <div
                    v-if="dropTargetIdx === idx && dragIdx !== idx && dragIdx !== idx - 1"
                    class="h-1 bg-primary-500 rounded-full mx-4 -mb-0.5 animate-pulse"
                  ></div>

                  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <!-- Header du bloc -->
                    <div
                      class="px-3 py-1.5 flex items-center justify-between border-b border-gray-200 cursor-grab active:cursor-grabbing select-none"
                      :class="selectedBlockIdx === idx ? 'bg-primary-50' : 'bg-gray-50'"
                    >
                      <div class="flex items-center space-x-2">
                        <!-- Drag handle -->
                        <span class="text-gray-300 group-hover/block:text-gray-400 cursor-grab" title="Glisser pour reordonner">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                        </span>
                        <span
                          class="px-2 py-0.5 text-xs font-bold rounded"
                          :class="blockTypeClass(block.type)"
                        >
                          {{ blockTypeLabel(block.type) }}
                        </span>
                        <span class="text-xs text-gray-400">{{ idx + 1 }}</span>
                      </div>
                      <div class="flex items-center space-x-0.5">
                        <!-- Collapse toggle -->
                        <button
                          @click.stop="toggleCollapse(idx)"
                          class="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                          :title="collapsedBlocks.has(idx) ? 'Deplier' : 'Replier'"
                        >
                          <svg class="w-3.5 h-3.5 transition-transform" :class="collapsedBlocks.has(idx) ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                        </button>
                        <!-- Move up -->
                        <button
                          v-if="idx > 0"
                          @click.stop="moveBlock(idx, -1)"
                          class="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                          title="Monter"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                        </button>
                        <!-- Move down -->
                        <button
                          v-if="idx < blocks.length - 1"
                          @click.stop="moveBlock(idx, 1)"
                          class="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                          title="Descendre"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <!-- Duplicate -->
                        <button
                          @click.stop="duplicateBlock(idx)"
                          class="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50 transition"
                          title="Dupliquer le bloc"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </button>
                        <!-- Delete -->
                        <button
                          @click.stop="removeBlock(idx)"
                          class="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                          title="Supprimer"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>

                    <!-- Editeur du bloc (collapsible) -->
                    <div v-show="!collapsedBlocks.has(idx)" class="p-4">
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
                      <BlocksOpenAnswerBlockEdit v-if="block.type === 'open_answer'" v-model="block.data" />
                      <BlocksCalloutBlockEdit v-if="block.type === 'callout'" v-model="block.data" />
                    </div>

                    <!-- Collapsed preview -->
                    <div v-if="collapsedBlocks.has(idx)" class="px-4 py-2 text-xs text-gray-400 italic truncate">
                      {{ blockSummary(block) }}
                    </div>
                  </div>
                </div>
              </TransitionGroup>

              <!-- Drop zone at end -->
              <div
                v-if="dragIdx !== null"
                class="border-2 border-dashed border-primary-300 rounded-xl py-4 text-center text-primary-400 text-sm transition-all"
                @dragover.prevent="dropTargetIdx = blocks.length"
                @drop.prevent="onDrop(blocks.length)"
              >
                Deposer ici (fin)
              </div>

              <!-- Zone de depot vide -->
              <div v-if="blocks.length === 0" class="border-2 border-dashed border-gray-300 rounded-xl py-16 text-center text-gray-400">
                <p class="text-lg mb-2">Glissez un bloc depuis la palette</p>
                <p class="text-sm">ou cliquez sur un bloc dans la palette a droite</p>
                <p class="text-xs text-gray-300 mt-2">Ctrl+S pour sauvegarder | Ctrl+Z pour annuler</p>
              </div>
            </div>
          </div>

          <!-- COLONNE DROITE : Palette -->
          <div class="w-64 bg-gradient-to-b from-slate-100 to-slate-50 border-l border-gray-200 flex flex-col flex-shrink-0">
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
                @click="paletteTab = 'ia'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'ia' ? 'border-violet-600 text-violet-700 bg-violet-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                IA
              </button>
              <button
                @click="paletteTab = 'aide'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'aide' ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                ?
              </button>
            </div>

            <!-- Palette search -->
            <div v-if="paletteTab === 'blocs' || paletteTab === 'questions'" class="px-3 pt-3 pb-1">
              <input
                v-model="paletteSearch"
                type="text"
                placeholder="Rechercher un bloc..."
                class="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div class="flex-1 overflow-y-auto p-3">
              <!-- Blocs contenu -->
              <div v-if="paletteTab === 'blocs'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in filteredContentBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  draggable="true"
                  @dragstart="onPaletteDragStart(b.type, $event)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-primary-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
                <div v-if="filteredContentBlocks.length === 0" class="col-span-2 text-center text-xs text-gray-400 py-4">
                  Aucun bloc ne correspond
                </div>
              </div>

              <!-- Blocs questions -->
              <div v-if="paletteTab === 'questions'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in filteredQuestionBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  draggable="true"
                  @dragstart="onPaletteDragStart(b.type, $event)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-green-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
                <div v-if="filteredQuestionBlocks.length === 0" class="col-span-2 text-center text-xs text-gray-400 py-4">
                  Aucune question ne correspond
                </div>
              </div>

              <!-- IA Generator -->
              <div v-if="paletteTab === 'ia'" class="space-y-3">
                <div class="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-3">
                  <h4 class="font-bold text-violet-800 text-xs mb-2 flex items-center gap-1">
                    <span class="text-base">&#9733;</span> Generateur IA
                  </h4>
                  <div class="space-y-2">
                    <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase">Sujet / Theme</label>
                      <textarea
                        v-model="aiTopic"
                        rows="2"
                        placeholder="Ex: L'independance d'Haiti, les volcans, les fractions..."
                        class="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
                      ></textarea>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="text-[10px] font-bold text-gray-500 uppercase">Questions</label>
                        <select v-model="aiCount" class="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                          <option :value="3">3</option>
                          <option :value="5">5</option>
                          <option :value="10">10</option>
                          <option :value="15">15</option>
                          <option :value="20">20</option>
                          <option :value="30">30</option>
                          <option :value="40">40</option>
                          <option :value="50">50</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] font-bold text-gray-500 uppercase">Difficulte</label>
                        <select v-model="aiDifficulty" class="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                          <option value="facile">Facile</option>
                          <option value="moyen">Moyen</option>
                          <option value="difficile">Difficile</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] font-bold text-gray-500 uppercase">Langue</label>
                        <select v-model="aiLanguage" class="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                          <option value="francais">Francais</option>
                          <option value="creole">Creole</option>
                          <option value="anglais">Anglais</option>
                          <option value="espagnol">Espagnol</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Types de questions</label>
                      <div class="flex flex-wrap gap-1.5">
                        <label v-for="qt in aiQuestionTypes" :key="qt.value" class="flex items-center gap-1 text-[11px] cursor-pointer">
                          <input type="checkbox" v-model="aiSelectedTypes" :value="qt.value" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500 w-3 h-3" />
                          <span>{{ qt.label }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    @click="generateAI"
                    :disabled="aiGenerating || !aiTopic.trim()"
                    class="mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                    :class="aiGenerating || !aiTopic.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm'"
                  >
                    <span v-if="aiGenerating" class="animate-spin">&#9696;</span>
                    <span v-else>&#9733;</span>
                    {{ aiGenerating ? 'Generation en cours...' : 'Generer avec l\'IA' }}
                  </button>
                </div>

                <!-- AI Results Preview -->
                <div v-if="aiResults.length > 0" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-500 uppercase">{{ aiResults.length }} questions generees</span>
                    <button
                      @click="insertAllAI"
                      class="text-[10px] font-bold text-violet-600 hover:text-violet-800 underline"
                    >
                      Tout inserer
                    </button>
                  </div>
                  <div
                    v-for="(q, qi) in aiResults"
                    :key="qi"
                    class="bg-white border border-gray-200 rounded-lg p-2.5 hover:border-violet-300 hover:shadow-sm transition cursor-pointer group"
                    @click="insertAIBlock(qi)"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] font-bold uppercase" :class="blockTypeClass(q.type)">{{ blockTypeLabel(q.type) }}</span>
                      <span class="text-[10px] text-gray-400 group-hover:text-violet-600">+ Inserer</span>
                    </div>
                    <p class="text-xs text-gray-700 line-clamp-2">{{ q.data?.question || q.data?.statement || q.data?.text || q.data?.instruction || '' }}</p>
                  </div>
                </div>

                <!-- AI Error -->
                <div v-if="aiError" class="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                  {{ aiError }}
                </div>
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
                  <BlocksOpenAnswerBlockPreview v-if="block.type === 'open_answer'" :data="block.data" />
                  <BlocksCalloutBlockPreview v-if="block.type === 'callout'" :data="block.data" />
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
const isDirty = ref(false);
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Toast system
interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string }
const toasts = ref<Toast[]>([]);
let toastCounter = 0;
function showToast(type: Toast['type'], message: string, duration = 3000) {
  const id = ++toastCounter;
  toasts.value.push({ id, type, message });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, duration);
}

// Undo/Redo system
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);
let lastSnapshot = '';

function pushUndo() {
  const snap = JSON.stringify(blocks.value);
  if (snap === lastSnapshot) return;
  undoStack.value.push(lastSnapshot);
  if (undoStack.value.length > 50) undoStack.value.shift();
  redoStack.value = [];
  lastSnapshot = snap;
  isDirty.value = true;
  scheduleAutoSave();
}

function undo() {
  if (!canUndo.value) return;
  redoStack.value.push(JSON.stringify(blocks.value));
  const prev = undoStack.value.pop()!;
  blocks.value = JSON.parse(prev);
  assignUids();
  lastSnapshot = prev;
  isDirty.value = true;
}

function redo() {
  if (!canRedo.value) return;
  undoStack.value.push(JSON.stringify(blocks.value));
  const next = redoStack.value.pop()!;
  blocks.value = JSON.parse(next);
  assignUids();
  lastSnapshot = next;
  isDirty.value = true;
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    if (!isDirty.value) return;
    autoSaveStatus.value = 'saving';
    try {
      const payload = blocks.value.map((b, i) => ({ type: b.type, order: i, data: b.data }));
      await store.saveScreenContent(moduleId, screenId, payload);
      isDirty.value = false;
      autoSaveStatus.value = 'saved';
      setTimeout(() => { if (autoSaveStatus.value === 'saved') autoSaveStatus.value = 'idle'; }, 2000);
    } catch {
      autoSaveStatus.value = 'idle';
    }
  }, 5000);
}

// Drag-and-drop state
const dragIdx = ref<number | null>(null);
const dropTargetIdx = ref<number | null>(null);
const paletteDragType = ref<BlockType | null>(null);

// Block selection & collapse
const selectedBlockIdx = ref<number | null>(null);
const collapsedBlocks = ref(new Set<number>());

// Palette search
const paletteSearch = ref('');

// Unique IDs for blocks (for TransitionGroup keys)
let uidCounter = 0;
function assignUids() {
  blocks.value.forEach(b => { if (!(b as any)._uid) (b as any)._uid = ++uidCounter; });
}

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
  _uid?: number;
}

const blocks = ref<EditableBlock[]>([]);
const paletteTab = ref<'blocs' | 'questions' | 'ia' | 'aide'>('blocs');

// AI Generator state
const aiTopic = ref('');
const aiCount = ref(5);
const aiDifficulty = ref('moyen');
const aiLanguage = ref('francais');
const aiSelectedTypes = ref(['quiz', 'true_false', 'fill_blank']);
const aiGenerating = ref(false);
const aiResults = ref<Array<{ type: string; order: number; data: any }>>([]);
const aiError = ref('');
const aiQuestionTypes = [
  { value: 'quiz', label: 'QCM' },
  { value: 'true_false', label: 'Vrai/Faux' },
  { value: 'numeric', label: 'Numerique' },
  { value: 'fill_blank', label: 'Texte a trous' },
  { value: 'matching', label: 'Appariement' },
  { value: 'sequence', label: 'Sequence' },
];

async function generateAI() {
  if (!aiTopic.value.trim() || aiGenerating.value) return;
  aiGenerating.value = true;
  aiError.value = '';
  aiResults.value = [];
  try {
    const { apiFetch } = useApi();
    const { data } = await apiFetch(`/modules/${moduleId}/ai-generate`, {
      method: 'POST',
      body: JSON.stringify({
        topic: aiTopic.value,
        count: aiCount.value,
        types: aiSelectedTypes.value,
        difficulty: aiDifficulty.value,
        language: aiLanguage.value,
      }),
    });
    if (data.blocks && data.blocks.length > 0) {
      aiResults.value = data.blocks;
      showToast('success', data.message || `${data.blocks.length} questions generees`);
    } else {
      aiError.value = data.error || 'Aucune question generee';
    }
  } catch (err: any) {
    aiError.value = err?.data?.error || err?.message || 'Erreur de generation IA';
  } finally {
    aiGenerating.value = false;
  }
}

function insertAIBlock(idx: number) {
  const q = aiResults.value[idx];
  if (!q) return;
  pushUndo();
  const newBlock: EditableBlock = {
    type: q.type as BlockType,
    order: blocks.value.length,
    data: JSON.parse(JSON.stringify(q.data)),
    _uid: ++uidCounter,
  };
  blocks.value.push(newBlock);
  reorder();
  selectedBlockIdx.value = blocks.value.length - 1;
  aiResults.value.splice(idx, 1);
  showToast('success', `Question ${blockTypeLabel(q.type)} inseree`);
}

function insertAllAI() {
  if (aiResults.value.length === 0) return;
  pushUndo();
  for (const q of aiResults.value) {
    blocks.value.push({
      type: q.type as BlockType,
      order: blocks.value.length,
      data: JSON.parse(JSON.stringify(q.data)),
      _uid: ++uidCounter,
    });
  }
  reorder();
  selectedBlockIdx.value = blocks.value.length - 1;
  showToast('success', `${aiResults.value.length} questions inserees`);
  aiResults.value = [];
}

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
  { type: 'callout' as BlockType, icon: '\uD83D\uDCDD', label: 'Boite de texte' },
];

const questionBlocks = [
  { type: 'quiz' as BlockType, icon: '\u2611', label: 'QCM / QCU' },
  { type: 'true_false' as BlockType, icon: '\u2713\u2717', label: 'Vrai / Faux' },
  { type: 'numeric' as BlockType, icon: '#', label: 'Numerique' },
  { type: 'fill_blank' as BlockType, icon: '_\u2026', label: 'Texte a trous' },
  { type: 'matching' as BlockType, icon: '\u21C4', label: 'Appariement' },
  { type: 'sequence' as BlockType, icon: '1\u20262\u20263', label: 'Sequence' },
  { type: 'likert' as BlockType, icon: '\u2605', label: 'Likert' },
  { type: 'open_answer' as BlockType, icon: '\u270D', label: 'Reponse courte' },
];

// Filtered palette blocks
const filteredContentBlocks = computed(() => {
  if (!paletteSearch.value) return contentBlocks;
  const q = paletteSearch.value.toLowerCase();
  return contentBlocks.filter(b => b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q));
});
const filteredQuestionBlocks = computed(() => {
  if (!paletteSearch.value) return questionBlocks;
  const q = paletteSearch.value.toLowerCase();
  return questionBlocks.filter(b => b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q));
});

// Drag-and-drop handlers
function onDragStart(idx: number, e: DragEvent) {
  dragIdx.value = idx;
  dropTargetIdx.value = null;
  e.dataTransfer!.effectAllowed = 'move';
  e.dataTransfer!.setData('text/plain', String(idx));
}
function onDragEnd() {
  dragIdx.value = null;
  dropTargetIdx.value = null;
}
function onDragOver(idx: number, e: DragEvent) {
  e.dataTransfer!.dropEffect = paletteDragType.value ? 'copy' : 'move';
  dropTargetIdx.value = idx;
}
function onDrop(targetIdx: number) {
  // Drop from palette
  if (paletteDragType.value) {
    pushUndo();
    const newBlock: EditableBlock = {
      type: paletteDragType.value,
      order: targetIdx,
      data: defaultData(paletteDragType.value),
      _uid: ++uidCounter,
    };
    blocks.value.splice(targetIdx, 0, newBlock);
    reorder();
    selectedBlockIdx.value = targetIdx;
    paletteDragType.value = null;
    showToast('info', `Bloc ${blockTypeLabel(newBlock.type)} ajoute`);
  }
  // Drop from canvas (reorder)
  else if (dragIdx.value !== null && dragIdx.value !== targetIdx) {
    pushUndo();
    const item = blocks.value.splice(dragIdx.value, 1)[0];
    const insertAt = targetIdx > dragIdx.value ? targetIdx - 1 : targetIdx;
    blocks.value.splice(insertAt, 0, item);
    reorder();
    selectedBlockIdx.value = insertAt;
  }
  dragIdx.value = null;
  dropTargetIdx.value = null;
}
function onPaletteDragStart(type: BlockType, e: DragEvent) {
  paletteDragType.value = type;
  e.dataTransfer!.effectAllowed = 'copy';
  e.dataTransfer!.setData('text/plain', type);
}
function onCanvasDrop() {
  if (paletteDragType.value) {
    onDrop(blocks.value.length);
  }
}

// Block collapse
function toggleCollapse(idx: number) {
  if (collapsedBlocks.value.has(idx)) {
    collapsedBlocks.value.delete(idx);
  } else {
    collapsedBlocks.value.add(idx);
  }
  collapsedBlocks.value = new Set(collapsedBlocks.value);
}

// Block summary for collapsed view
function blockSummary(block: EditableBlock): string {
  const d = block.data || {};
  if (d.question) return d.question.substring(0, 80);
  if (d.content) return d.content.substring(0, 80);
  if (d.text) return d.text.substring(0, 80);
  if (d.statement) return d.statement.substring(0, 80);
  if (d.instruction) return d.instruction.substring(0, 80);
  if (d.title) return d.title.substring(0, 80);
  if (d.url) return d.url.substring(0, 60);
  return '(vide)';
}

// Block duplication
function duplicateBlock(idx: number) {
  pushUndo();
  const source = blocks.value[idx];
  const clone: EditableBlock = {
    type: source.type,
    order: idx + 1,
    data: JSON.parse(JSON.stringify(source.data)),
    _uid: ++uidCounter,
  };
  blocks.value.splice(idx + 1, 0, clone);
  reorder();
  selectedBlockIdx.value = idx + 1;
  showToast('success', 'Bloc duplique');
}

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
// onDocClick is handled in the main onMounted/onUnmounted below

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
    _uid: ++uidCounter,
  }));
  lastSnapshot = JSON.stringify(blocks.value);
  undoStack.value = [];
  redoStack.value = [];
  isDirty.value = false;
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
    open_answer: { question: '', answer: '', autoGrade: false, maxWords: 0, rows: 3, points: 1, duration: 0, explanation: '' },
    callout: { variant: 'info', title: '', content: '', collapsible: false, borderStyle: 'left', bgColor: '#eff6ff', borderColor: '#3b82f6', textColor: '#1e3a5f' },
  };
  return defaults[type] || {};
}

function clearError() {
  store.error = null;
}

function addBlock(type: BlockType) {
  clearError();
  pushUndo();
  const newBlock: EditableBlock = {
    type,
    order: blocks.value.length,
    data: defaultData(type),
    _uid: ++uidCounter,
  };
  blocks.value.push(newBlock);
  selectedBlockIdx.value = blocks.value.length - 1;
  showToast('info', `Bloc ${blockTypeLabel(type)} ajoute`);
}

function removeBlock(idx: number) {
  clearError();
  pushUndo();
  blocks.value.splice(idx, 1);
  reorder();
  if (selectedBlockIdx.value === idx) selectedBlockIdx.value = null;
  showToast('info', 'Bloc supprime');
}

function moveBlock(idx: number, dir: number) {
  pushUndo();
  const target = idx + dir;
  const temp = blocks.value[idx];
  blocks.value[idx] = blocks.value[target];
  blocks.value[target] = temp;
  reorder();
  selectedBlockIdx.value = target;
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
    matching: 'APPARIEMENT', sequence: 'SEQUENCE', likert: 'LIKERT', open_answer: 'REPONSE COURTE',
    callout: 'BOITE DE TEXTE',
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
    open_answer: 'bg-cyan-100 text-cyan-700',
    callout: 'bg-blue-100 text-blue-700',
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

async function save() {
  saving.value = true;
  store.error = null;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  try {
    const payload = blocks.value.map((b, i) => ({
      type: b.type,
      order: i,
      data: b.data,
    }));
    await store.saveScreenContent(moduleId, screenId, payload);
    isDirty.value = false;
    autoSaveStatus.value = 'saved';
    showToast('success', 'Contenu sauvegarde !');
    setTimeout(() => { if (autoSaveStatus.value === 'saved') autoSaveStatus.value = 'idle'; }, 2000);
  } catch {
    showToast('error', 'Erreur de sauvegarde');
  } finally {
    saving.value = false;
  }
}

// Keyboard shortcuts
function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    save();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
  // Delete selected block
  if (e.key === 'Delete' && selectedBlockIdx.value !== null && !(e.target as HTMLElement).closest('input, textarea, [contenteditable]')) {
    e.preventDefault();
    removeBlock(selectedBlockIdx.value);
  }
  // Escape to deselect
  if (e.key === 'Escape') {
    selectedBlockIdx.value = null;
    showShareModal.value = false;
  }
}

// Warn before leaving with unsaved changes
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocClick);
  window.addEventListener('beforeunload', onBeforeUnload);
  // Charger le module complet (pour la sidebar des ecrans)
  await Promise.all([
    store.fetchModule(moduleId),
    store.fetchScreen(moduleId, screenId),
  ]);
  loadBlocks();
  loadShareInfo();
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('beforeunload', onBeforeUnload);
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});
</script>

<style scoped>
/* Block list transitions */
.block-list-enter-active { transition: all 0.3s ease; }
.block-list-leave-active { transition: all 0.2s ease; }
.block-list-enter-from { opacity: 0; transform: translateY(-10px); }
.block-list-leave-to { opacity: 0; transform: translateX(-20px); }
.block-list-move { transition: transform 0.3s ease; }

/* Toast transitions */
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px); }
</style>
