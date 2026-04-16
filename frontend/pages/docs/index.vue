<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Command Palette -->
    <CommandPalette ref="paletteRef" />

    <!-- Header -->
    <header class="bg-white border-b sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <NuxtLink to="/" class="text-amber-600 font-black text-lg">TEGS</NuxtLink>
          <span class="text-gray-300">|</span>
          <span class="text-gray-700 font-bold">Centre d'Aide</span>
        </div>
        <div class="flex items-center space-x-3">
          <button @click="openSearch"
            class="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-500 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span>Rechercher...</span>
            <kbd class="text-[10px] bg-white px-1.5 py-0.5 rounded border font-mono">Ctrl+K</kbd>
          </button>
          <NuxtLink to="/login" class="text-sm text-gray-400 hover:text-gray-600">Connexion</NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <div class="bg-gradient-to-br from-amber-500 to-orange-500 text-white py-16">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h1 class="text-3xl md:text-4xl font-black mb-4">Comment pouvons-nous vous aider ?</h1>
        <p class="text-amber-100 text-lg mb-8">Guides, tutoriels et reponses a vos questions</p>
        <button @click="openSearch"
          class="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-white transition-all border border-white/30">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Rechercher un article... <kbd class="ml-3 text-xs bg-white/20 px-2 py-0.5 rounded font-mono">Ctrl+K</kbd>
        </button>
      </div>
    </div>

    <!-- Role categories -->
    <div class="max-w-6xl mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <NuxtLink to="/docs/candidat/inscription"
          class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">&#127891;</div>
          <h3 class="font-bold text-gray-900 mb-2">Guide Candidat</h3>
          <p class="text-sm text-gray-500 mb-3">Inscription, paiement, passage du quiz, resultats et certificats.</p>
          <ul class="space-y-1 text-xs text-gray-400">
            <li>&#8594; Comment s'inscrire</li>
            <li>&#8594; Passer le quiz</li>
            <li>&#8594; Comprendre les resultats</li>
          </ul>
        </NuxtLink>

        <NuxtLink to="/docs/agent/collecte"
          class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">&#128188;</div>
          <h3 class="font-bold text-gray-900 mb-2">Guide Agent</h3>
          <p class="text-sm text-gray-500 mb-3">Collecte de paiements, gestion du quota, generation de recus.</p>
          <ul class="space-y-1 text-xs text-gray-400">
            <li>&#8594; Collecter un paiement</li>
            <li>&#8594; Gerer son quota</li>
          </ul>
        </NuxtLink>

        <NuxtLink to="/docs/sponsor/packs"
          class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-amber-200 transition-all">
          <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">&#127942;</div>
          <h3 class="font-bold text-gray-900 mb-2">Guide Sponsor</h3>
          <p class="text-sm text-gray-500 mb-3">Packs de visibilite, offrir des bourses, ROI et analytics.</p>
          <ul class="space-y-1 text-xs text-gray-400">
            <li>&#8594; Choisir un pack sponsor</li>
            <li>&#8594; Offrir des bourses</li>
          </ul>
        </NuxtLink>

        <NuxtLink to="/docs/admin/tournois"
          class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-purple-200 transition-all">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">&#9881;&#65039;</div>
          <h3 class="font-bold text-gray-900 mb-2">Guide Admin</h3>
          <p class="text-sm text-gray-500 mb-3">Tournois, modules, calibrage quiz, generation IA, live et diffusion.</p>
          <ul class="space-y-1 text-xs text-gray-400">
            <li>&#8594; Creer un tournoi</li>
            <li>&#8594; Modules & Studio</li>
            <li>&#8594; Calibrage duree quiz</li>
            <li>&#8594; Generation quiz par IA</li>
            <li>&#8594; Piloter le live & diffusion</li>
          </ul>
        </NuxtLink>

        <NuxtLink to="/docs/admin/agent-ia"
          class="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-teal-200 transition-all">
          <div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">&#129302;</div>
          <h3 class="font-bold text-gray-900 mb-2">Assistant</h3>
          <p class="text-sm text-gray-500 mb-3">Assistant intelligent, chat, aide contextuelle et configuration.</p>
          <ul class="space-y-1 text-xs text-gray-400">
            <li>&#8594; Poser des questions a l'assistant</li>
            <li>&#8594; Actions automatiques</li>
            <li>&#8594; Configuration admin</li>
          </ul>
        </NuxtLink>

      </div>

      <!-- FAQ shortcut -->
      <div class="mt-12">
        <NuxtLink to="/docs/faq"
          class="block bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all text-center">
          <div class="text-3xl mb-3">&#10067;</div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Questions Frequentes (FAQ)</h3>
          <p class="text-gray-500 text-sm">Paiement echoue, badge perdu, quota agent, et plus...</p>
        </NuxtLink>
      </div>
    </div>

    <!-- Vision & Impact -->
    <div class="max-w-6xl mx-auto px-4 mt-12">
      <NuxtLink to="/vision"
        class="block rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
        <img src="/screenshots/vision-hero.png" alt="TEGS-Arena — Vision & Impact" class="w-full object-cover h-48 md:h-56 group-hover:scale-[1.02] transition-transform" />
        <div class="p-6 bg-white text-center">
          <h3 class="text-xl font-bold text-gray-900 mb-2">Vision & Impact</h3>
          <p class="text-gray-500 text-sm">Decouvrez comment TEGS-Arena transforme l'education dans le Nord-Est d'Haiti.</p>
        </div>
      </NuxtLink>
    </div>

    <!-- Footer -->
    <footer class="border-t bg-white py-8 mt-8">
      <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div class="text-sm text-gray-400">TEGS-Arena &mdash; Centre d'Aide</div>
        <NuxtLink to="/" class="text-sm text-amber-500 hover:text-amber-600 font-medium">&#8592; Retour au Lobby</NuxtLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import CommandPalette from '~/components/docs/CommandPalette.vue';

const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null);

function openSearch() {
  if (paletteRef.value) paletteRef.value.open = true;
}

useHead({
  title: 'Centre d\'Aide | TEGS-Arena',
  meta: [
    { name: 'description', content: 'Guides, tutoriels et FAQ pour candidats, agents, sponsors et administrateurs TEGS-Arena.' },
  ],
});
</script>
