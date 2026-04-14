<template>
  <DocsLayout role="faq">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Questions Frequentes (FAQ)</h1>
    <p class="text-gray-500 mb-8">Trouvez des reponses aux questions les plus courantes.</p>

    <!-- Search -->
    <div class="relative mb-8">
      <input v-model="search" type="text" placeholder="Filtrer les questions..."
        class="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
      <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <!-- FAQ Sections -->
    <div v-for="section in filteredSections" :key="section.id" class="mb-8">
      <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center" :id="section.id">
        <span class="text-xl mr-2" v-html="section.icon"></span>
        {{ section.title }}
        <a :href="`#${section.id}`" class="ml-2 text-gray-300 hover:text-amber-500 text-sm">#</a>
      </h2>

      <div class="space-y-2">
        <div v-for="q in section.questions" :key="q.id"
          class="bg-white border border-gray-100 rounded-xl overflow-hidden"
          :id="q.id">

          <!-- Question header -->
          <button @click="toggle(q.id)"
            class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
            <span class="font-medium text-sm text-gray-800 pr-4" v-html="highlightText(q.question)"></span>
            <svg class="w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': openIds.has(q.id) }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Answer -->
          <div v-if="openIds.has(q.id)" class="px-5 pb-4 text-sm text-gray-600 border-t border-gray-50 pt-3 leading-relaxed"
            v-html="highlightText(q.answer)">
          </div>

          <!-- Anchor link -->
          <div v-if="openIds.has(q.id)" class="px-5 pb-3">
            <button @click="copyLink(q.id)" class="text-[10px] text-gray-400 hover:text-amber-500 transition">
              {{ copied === q.id ? 'Lien copie !' : 'Copier le lien direct' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No results -->
    <div v-if="filteredSections.length === 0 && search" class="text-center py-12 text-gray-400">
      <div class="text-3xl mb-3">&#128533;</div>
      <p>Aucune question ne correspond a "{{ search }}"</p>
      <p class="text-xs mt-2">Essayez des termes differents ou contactez le support.</p>
    </div>

  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';

const search = ref('');
const openIds = ref(new Set<string>());
const copied = ref('');

const sections = [
  {
    id: 'paiement', title: 'Paiement', icon: '&#128179;',
    questions: [
      { id: 'paiement-echoue', question: 'Mon paiement a echoue mais j\'ai ete debite, que faire ?', answer: 'Patientez <strong>5 minutes</strong> puis verifiez le statut de votre inscription. Les paiements MonCash/Natcash peuvent prendre quelques minutes a se confirmer. Si apres 10 minutes votre inscription n\'est toujours pas confirmee, contactez le support avec votre <strong>numero de transaction</strong> et votre <strong>email d\'inscription</strong>.' },
      { id: 'paiement-methodes', question: 'Quelles methodes de paiement sont acceptees ?', answer: '<strong>MonCash</strong> (Digicel) et <strong>Natcash</strong> (Natcom) sont les deux methodes de paiement mobile supportees. Pour les paiements en especes, un agent collecteur autorise peut confirmer votre inscription sur place.' },
      { id: 'paiement-remboursement', question: 'Puis-je etre rembourse apres inscription ?', answer: 'Les frais d\'inscription ne sont generalement <strong>pas remboursables</strong> sauf en cas d\'annulation du concours par l\'organisateur. Consultez le reglement du concours pour les conditions specifiques.' },
      { id: 'paiement-gratuit', question: 'Le concours est gratuit, dois-je payer ?', answer: 'Non ! Si les frais d\'inscription sont a <strong>0 HTG</strong>, votre badge est genere immediatement apres le formulaire, sans passer par l\'etape de paiement.' },
    ],
  },
  {
    id: 'acces', title: 'Acces & Badge', icon: '&#127915;',
    questions: [
      { id: 'tkt-perdu', question: 'J\'ai perdu mon TKT-XXX, comment le recuperer ?', answer: 'Retournez sur la page d\'inscription du concours et remplissez le formulaire avec <strong>le meme email</strong>. Le systeme detectera votre inscription existante et vous renverra votre code <strong>TKT-XXX</strong> et votre QR code.' },
      { id: 'qr-marche-pas', question: 'Mon QR code ne fonctionne pas', answer: 'Assurez-vous que l\'image est <strong>nette et bien eclairee</strong>. Si le QR ne scanne pas, utilisez votre code <strong>TKT-XXX</strong> manuellement. Ce code est l\'equivalent textuel de votre QR.' },
      { id: 'quiz-acces', question: 'Comment acceder au quiz le jour du concours ?', answer: 'Rendez-vous sur la page du concours et cliquez <strong>Acceder au Quiz</strong> (visible uniquement quand le concours est LIVE). Entrez votre code <strong>TKT-XXX</strong>, lisez le briefing, puis commencez le quiz.' },
      { id: 'quiz-deja-soumis', question: 'Le systeme dit que j\'ai deja soumis mes reponses', answer: 'Chaque candidat ne peut soumettre qu\'<strong>une seule fois</strong> par round. Si vous avez deja soumis, vos reponses sont enregistrees et vous ne pouvez pas les modifier.' },
    ],
  },
  {
    id: 'agent-faq', title: 'Agent Collecteur', icon: '&#128188;',
    questions: [
      { id: 'quota-agent', question: 'Mon quota est bloque, comment le reinitialiser ?', answer: 'Contactez votre <strong>administrateur de tournoi</strong>. Lui seul peut reinitialiser votre quota de collecte depuis le panneau d\'administration.' },
      { id: 'agent-commission', question: 'Comment est calculee ma commission ?', answer: 'Votre commission est un <strong>pourcentage fixe</strong> du montant collecte, configure par l\'administrateur. Elle est calculee et affichee automatiquement sur chaque recu de transaction.' },
      { id: 'agent-desactive', question: 'Mon compte agent est desactive', answer: 'Un compte agent peut etre desactive par l\'administrateur. Contactez-le pour comprendre la raison et demander la reactivation.' },
    ],
  },
  {
    id: 'sponsor-faq', title: 'Sponsor & Bourses', icon: '&#127942;',
    questions: [
      { id: 'sponsor-validation', question: 'Quand mon logo sera-t-il visible ?', answer: 'Votre logo apparait <strong>immediatement</strong> apres validation par l\'administrateur. Il sera visible sur le live arena, les tickets et/ou les certificats selon votre pack choisi.' },
      { id: 'bourse-expiration', question: 'Mon code BOURSE-XXX a expire, que faire ?', answer: 'Contactez l\'administrateur du concours pour demander une <strong>prolongation</strong> ou un nouveau code. Les codes expirent a la date configuree lors de la creation.' },
      { id: 'bourse-suivi', question: 'Comment suivre les utilisations de mon code BOURSE ?', answer: 'L\'administrateur peut vous fournir les statistiques d\'utilisation : nombre de codes utilises, restants, et la liste des candidats parraines.' },
    ],
  },
];

const filteredSections = computed(() => {
  if (!search.value.trim()) return sections;
  const q = search.value.toLowerCase();
  return sections
    .map(s => ({
      ...s,
      questions: s.questions.filter(
        fq => fq.question.toLowerCase().includes(q) || fq.answer.toLowerCase().includes(q)
      ),
    }))
    .filter(s => s.questions.length > 0);
});

function toggle(id: string) {
  if (openIds.value.has(id)) {
    openIds.value.delete(id);
  } else {
    openIds.value.add(id);
  }
}

function highlightText(text: string) {
  if (!search.value.trim()) return text;
  const words = search.value.trim().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return text;
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.replace(regex, '<mark class="bg-amber-200 rounded px-0.5">$1</mark>');
}

function copyLink(id: string) {
  const url = `${window.location.origin}/docs/faq#${id}`;
  navigator.clipboard.writeText(url);
  copied.value = id;
  setTimeout(() => { copied.value = ''; }, 2000);
}

// Auto-open question from anchor
onMounted(() => {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    openIds.value.add(hash);
    nextTick(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});

useHead({
  title: 'FAQ | Centre d\'Aide | TEGS-Arena',
  meta: [{ name: 'description', content: 'Questions frequentes sur les paiements, l\'acces, les agents et les sponsors TEGS-Arena.' }],
});
</script>
