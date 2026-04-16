<template>
  <div class="min-h-screen bg-white">
    <!-- ═══ Hero Section ═══ -->
    <section class="relative bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-10 w-72 h-72 bg-teal-400 rounded-full blur-3xl" />
        <div class="absolute bottom-10 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
      </div>
      <div class="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
        <div class="inline-block px-4 py-1.5 bg-teal-500/20 border border-teal-400/30 rounded-full text-teal-300 text-xs font-semibold mb-6">
          DDENE &middot; Nord-Est d'Haiti
        </div>
        <h1 class="text-4xl md:text-6xl font-black leading-tight mb-6">
          Redefinir le merite,<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">numeriser l'avenir.</span>
        </h1>
        <p class="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          TEGS-Arena modernise les concours academiques en Haiti : transparence totale, correction instantanee, equite garantie. Parce que chaque talent merite sa chance.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink to="/" class="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm hover:from-teal-400 hover:to-emerald-400 transition shadow-xl shadow-teal-500/25">
            Voir les Concours Actifs
          </NuxtLink>
          <a href="#impact" class="px-8 py-3.5 bg-white/10 border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 transition backdrop-blur-sm">
            Decouvrir l'Impact
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ 3 Pillars of Impact ═══ -->
    <section id="impact" class="max-w-6xl mx-auto px-6 py-20">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-black text-gray-900">Les 3 Piliers de l'Impact</h2>
        <p class="text-gray-500 mt-3 max-w-xl mx-auto">Comment TEGS-Arena transforme l'education dans le Nord-Est et au-dela.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="pillar in pillars" :key="pillar.title" class="bg-gradient-to-br from-gray-50 to-white border rounded-2xl p-8 hover:shadow-xl transition-shadow">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5" :class="pillar.bgClass">
            {{ pillar.icon }}
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-3">{{ pillar.title }}</h3>
          <p class="text-sm text-gray-600 leading-relaxed">{{ pillar.description }}</p>
          <ul class="mt-4 space-y-2">
            <li v-for="item in pillar.features" :key="item" class="flex items-start gap-2 text-sm text-gray-600">
              <span class="text-teal-500 mt-0.5 flex-shrink-0">&#x2713;</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ═══ Capabilities ═══ -->
    <section class="bg-gradient-to-br from-gray-50 to-blue-50/50 py-20">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-black text-gray-900">Nos Capacites</h2>
          <p class="text-gray-500 mt-3">La force d'une plateforme pensee pour Haiti.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="cap in capabilities" :key="cap.title" class="bg-white rounded-2xl p-6 border hover:border-teal-200 transition">
            <div class="text-3xl mb-4">{{ cap.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-2">{{ cap.title }}</h3>
            <p class="text-sm text-gray-600 leading-relaxed">{{ cap.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CTA Section ═══ -->
    <section class="max-w-4xl mx-auto px-6 py-20 text-center">
      <h2 class="text-3xl font-black text-gray-900 mb-4">Rejoignez le mouvement</h2>
      <p class="text-gray-500 mb-10 max-w-xl mx-auto">Que vous soyez educateur, sponsor ou candidat, vous avez un role a jouer dans la modernisation de l'education haitienne.</p>
      <div class="flex flex-wrap justify-center gap-4">
        <NuxtLink to="/" class="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition">
          Voir les Concours Actifs
        </NuxtLink>
        <a href="mailto:contact@tegslearning.com" class="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition">
          Devenir Partenaire
        </a>
        <NuxtLink to="/" class="px-8 py-3.5 border-2 border-teal-500 text-teal-600 rounded-xl font-bold text-sm hover:bg-teal-50 transition">
          Soutenir un Candidat
        </NuxtLink>
      </div>
    </section>

    <!-- ═══ Public Agent (auto-open) ═══ -->
    <AgentBubble />
    <AgentChatPanel />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useHead({
  title: 'Vision & Impact | TEGS-Arena — Redefinir le merite, numeriser l\'avenir',
  meta: [
    { name: 'description', content: 'TEGS-Arena modernise les concours academiques en Haiti : transparence, correction instantanee, equite garantie. Decouvrez notre impact sur l\'education.' },
    { property: 'og:title', content: 'TEGS-Arena — Redefinir le merite, numeriser l\'avenir' },
    { property: 'og:description', content: 'Plateforme de concours academiques pour Haiti. Transparence totale, anti-triche, primes au merite.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/og-vision.png' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
});

const agentStore = useAgentStore();

// Auto-open agent with ambassador message on this page
onMounted(() => {
  setTimeout(() => {
    if (agentStore.enabled && agentStore.messages.length === 0) {
      agentStore.addAgentMessage(
        'Bonjour ! Je suis l\'ambassadeur de TEGS-Arena. Posez-moi vos questions sur l\'impact de notre plateforme sur l\'education en Haiti.\n\nJe peux vous expliquer :\n- Comment fonctionnent les concours\n- Comment garantir l\'equite\n- Comment participer ou sponsoriser'
      );
      agentStore.openPanel();
    }
  }, 3000);
});

const pillars = [
  {
    icon: '\uD83D\uDCDA',
    title: 'Pour l\'Apprentissage',
    description: 'Des banques de questions intelligentes et une gamification qui motive les eleves a se depasser.',
    bgClass: 'bg-blue-100',
    features: [
      'Questions generees par IA',
      'Feedback instantane sur chaque reponse',
      'Progression visible entre les rounds',
    ],
  },
  {
    icon: '\uD83D\uDEE1\uFE0F',
    title: 'Pour l\'Evaluation',
    description: 'Zero erreur humaine, correction automatique et surveillance anti-triche pour garantir l\'equite.',
    bgClass: 'bg-teal-100',
    features: [
      'Correction 100% automatique',
      'Proctoring camera et fullscreen',
      'Classements en temps reel',
    ],
  },
  {
    icon: '\uD83C\uDF10',
    title: 'Pour le Secteur Educatif',
    description: 'Digitalisation des archives, statistiques temps reel et decentralisation des concours dans tout le departement.',
    bgClass: 'bg-emerald-100',
    features: [
      'Tableau de bord DDENE',
      'Rapports PDF/Excel automatiques',
      'Certificats numeriques verifiables',
    ],
  },
];

const capabilities = [
  {
    icon: '\uD83D\uDCB5',
    title: 'Accessibilite',
    description: 'Paiement en gourdes via MonCash et Natcash. Agents de collecte locaux pour les zones sans Internet stable.',
  },
  {
    icon: '\uD83C\uDFC6',
    title: 'Transparence',
    description: 'Classements en direct, double podium (Academique & Public), resultats consultables par tous.',
  },
  {
    icon: '\u2764\uFE0F',
    title: 'Inclusion',
    description: 'Systeme de bourses (BOURSE-XXX) finance par des sponsors pour ne laisser aucun talent de cote.',
  },
  {
    icon: '\uD83E\uDD16',
    title: 'Intelligence Artificielle',
    description: 'Generation automatique de questions, analyse des performances, remediation personnalisee.',
  },
  {
    icon: '\uD83D\uDCF1',
    title: 'Mobile-First',
    description: 'Accessible sur telephone, tablette ou ordinateur. Compatible avec les connexions lentes.',
  },
  {
    icon: '\uD83D\uDD12',
    title: 'Securite',
    description: 'Anti-triche multi-niveaux, donnees chiffrees, isolation par organisation.',
  },
];
</script>
