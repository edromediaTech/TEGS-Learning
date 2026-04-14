<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" @click.self="close">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" @keydown.escape="close">

          <!-- Search input -->
          <div class="flex items-center border-b px-4">
            <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input ref="inputRef" v-model="query" type="text" autofocus
              class="flex-1 px-3 py-4 text-base outline-none placeholder-gray-400"
              placeholder="Rechercher dans le guide..." />
            <kbd class="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          <!-- Results -->
          <div class="max-h-80 overflow-y-auto">
            <div v-if="query && results.length === 0" class="px-6 py-8 text-center text-gray-400 text-sm">
              Aucun resultat pour "{{ query }}"
            </div>

            <div v-else-if="query">
              <NuxtLink v-for="(r, i) in results" :key="i" :to="r.path"
                class="flex items-center px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-50 cursor-pointer"
                @click="close">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mr-3"
                  :class="roleBg(r.role)">
                  {{ roleIcon(r.role) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-gray-900 truncate" v-html="highlight(r.title)"></div>
                  <div class="text-xs text-gray-500 truncate" v-html="highlight(r.excerpt)"></div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0"
                  :class="roleBg(r.role)">{{ r.role }}</span>
              </NuxtLink>
            </div>

            <!-- Quick links when empty -->
            <div v-else class="px-4 py-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase mb-2 px-2">Acces rapide</div>
              <NuxtLink v-for="link in quickLinks" :key="link.path" :to="link.path"
                class="flex items-center px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                @click="close">
                <span class="text-lg mr-3">{{ link.icon }}</span>
                <span class="text-sm text-gray-700">{{ link.label }}</span>
              </NuxtLink>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const open = ref(false);
const query = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const quickLinks = [
  { path: '/docs/candidat/inscription', label: 'Comment s\'inscrire', icon: '&#128221;' },
  { path: '/docs/candidat/quiz', label: 'Passer le quiz', icon: '&#9997;' },
  { path: '/docs/agent/collecte', label: 'Guide agent collecteur', icon: '&#128188;' },
  { path: '/docs/sponsor/packs', label: 'Devenir sponsor', icon: '&#127942;' },
  { path: '/docs/faq', label: 'Questions frequentes', icon: '&#10067;' },
];

// All guide articles for search
const articles = [
  { title: 'Comment s\'inscrire a un concours', excerpt: 'Rendez-vous sur la page d\'accueil, choisissez un concours avec le statut Inscriptions ouvertes, remplissez le formulaire et completez le paiement.', path: '/docs/candidat/inscription', role: 'candidat', keywords: 'inscription inscrire formulaire paiement moncash natcash email' },
  { title: 'Passer le quiz du concours', excerpt: 'Entrez votre code TKT-XXX sur la page du tournoi, lisez le briefing du round, repondez a toutes les questions dans le temps imparti.', path: '/docs/candidat/quiz', role: 'candidat', keywords: 'quiz questions round token tkt timer chrono repondre' },
  { title: 'Comprendre les resultats et classement', excerpt: 'Le classement est base sur le score puis le temps de reponse. Les meilleurs sont qualifies pour le round suivant.', path: '/docs/candidat/resultats', role: 'candidat', keywords: 'resultats score classement qualifie elimine round podium certificat' },
  { title: 'Recuperer mon badge TKT perdu', excerpt: 'Si vous avez perdu votre code TKT-XXX, reinscrivez-vous avec le meme email pour recuperer votre badge existant.', path: '/docs/candidat/badge', role: 'candidat', keywords: 'badge perdu tkt token qr code recuperer' },
  { title: 'Guide agent collecteur', excerpt: 'Recherchez un participant, confirmez le paiement en especes, generez le recu et le badge QR.', path: '/docs/agent/collecte', role: 'agent', keywords: 'agent collecteur paiement especes recu commission quota' },
  { title: 'Gestion du quota agent', excerpt: 'Votre quota definit le nombre maximum de paiements que vous pouvez collecter. Contactez l\'admin pour le reinitialiser.', path: '/docs/agent/quota', role: 'agent', keywords: 'quota agent limite bloque reinitialiser' },
  { title: 'Devenir sponsor — Packs de visibilite', excerpt: 'Choisissez un pack Diamant, Or, Argent ou Bronze. Votre logo apparait sur le live, les tickets et les certificats.', path: '/docs/sponsor/packs', role: 'sponsor', keywords: 'sponsor pack diamant or argent bronze logo visibilite certificat' },
  { title: 'Offrir des bourses (Code BOURSE)', excerpt: 'Achetez un lot de places pour vos eleves. Le systeme genere un code BOURSE-XXX a distribuer.', path: '/docs/sponsor/bourses', role: 'sponsor', keywords: 'bourse parrainage code places eleves institution mairie' },
  { title: 'Creer et configurer un tournoi', excerpt: 'Definissez le titre, les rounds, les modules de questions, les primes et les frais d\'inscription.', path: '/docs/admin/tournois', role: 'admin', keywords: 'tournoi creer round module questions primes inscription configuration' },
  { title: 'Gerer les utilisateurs et organisations', excerpt: 'Creez des organisations, ajoutez des admins et des enseignants, assignez-les a un tenant.', path: '/docs/admin/users', role: 'admin', keywords: 'utilisateur organisation tenant admin enseignant role' },
  { title: 'Piloter le live d\'un concours', excerpt: 'Demarrez les rounds, suivez le bracket en direct, cloturez et qualifiez les candidats, generez les certificats.', path: '/docs/admin/live', role: 'admin', keywords: 'live demarrer round bracket cloturer qualifier certificat podium' },
  { title: 'FAQ — Paiement echoue', excerpt: 'Si votre paiement a echoue mais que vous avez ete debite, patientez 5 minutes puis verifiez le statut. Contactez le support si le probleme persiste.', path: '/docs/faq#paiement-echoue', role: 'candidat', keywords: 'paiement echoue debite rembourse moncash natcash' },
  { title: 'FAQ — Code TKT perdu', excerpt: 'Reinscrivez-vous avec le meme email. Le systeme detectera votre inscription existante et vous renverra votre badge.', path: '/docs/faq#tkt-perdu', role: 'candidat', keywords: 'tkt perdu code badge recuperer email' },
  { title: 'FAQ — Quota agent bloque', excerpt: 'Contactez votre administrateur pour faire reinitialiser votre quota de collecte.', path: '/docs/faq#quota-agent', role: 'agent', keywords: 'quota agent bloque reinitialiser' },
];

const results = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase().trim();
  const words = q.split(/\s+/);

  return articles
    .filter(a => {
      const text = `${a.title} ${a.excerpt} ${a.keywords}`.toLowerCase();
      return words.every(w => text.includes(w));
    })
    .slice(0, 8);
});

function highlight(text: string) {
  if (!query.value.trim()) return text;
  const words = query.value.trim().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return text;
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.replace(regex, '<mark class="bg-amber-200 rounded px-0.5">$1</mark>');
}

function roleBg(role: string) {
  return { candidat: 'bg-blue-100 text-blue-700', agent: 'bg-green-100 text-green-700', sponsor: 'bg-amber-100 text-amber-700', admin: 'bg-purple-100 text-purple-700' }[role] || 'bg-gray-100 text-gray-600';
}

function roleIcon(role: string) {
  return { candidat: 'C', agent: 'A', sponsor: 'S', admin: 'X' }[role] || '?';
}

function close() { open.value = false; query.value = ''; }

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      open.value = !open.value;
      if (open.value) nextTick(() => inputRef.value?.focus());
    }
    if (e.key === 'Escape' && open.value) close();
  });
});

defineExpose({ open });
</script>

<style scoped>
.palette-enter-active { transition: all 0.2s ease-out; }
.palette-leave-active { transition: all 0.15s ease-in; }
.palette-enter-from, .palette-leave-to { opacity: 0; }
.palette-enter-from .relative { transform: scale(0.95) translateY(-10px); }
</style>
