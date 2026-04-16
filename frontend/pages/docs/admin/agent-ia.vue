<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Assistant — Guide Administrateur</h1>
    <p class="text-gray-500 mb-8">Configurez, surveillez et controlez l'assistant intelligent de TEGS-Arena.</p>

    <Callout type="info" title="Prerequis">
      L'assistant doit etre active par le SuperAdmin et votre organisation doit avoir un plan Individual, Etablissement ou Pro.
    </Callout>

    <!-- ═══ Section 1: Presentation ═══ -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Qu'est-ce que l'Assistant TEGS ?</h2>
    <p class="text-gray-600 text-sm mb-3">
      L'Assistant est un aide intelligent integre a TEGS-Arena. Il permet aux utilisateurs de poser des questions et d'effectuer des actions via un chat en langage naturel.
    </p>
    <DocImage
      src="/screenshots/docs-admin-agent-chat.png"
      alt="Chat panel de l'assistant avec bulle verte et conversation"
      caption="L'assistant apparait sous forme d'une bulle verte en bas a droite. Le panel s'ouvre au clic."
      placeholder="Capture du chat assistant ouvert avec une conversation exemple" />

    <p class="text-gray-600 text-sm mb-6">
      L'agent fonctionne avec <strong>3 profils</strong> selon le role de l'utilisateur :
    </p>

    <div class="grid md:grid-cols-3 gap-4 mb-8">
      <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p class="font-bold text-blue-800 text-sm mb-1">Assistant Candidat</p>
        <p class="text-xs text-blue-600">FAQ, inscriptions, tournois. Lecture seule.</p>
      </div>
      <div class="bg-green-50 rounded-xl p-4 border border-green-100">
        <p class="font-bold text-green-800 text-sm mb-1">Comptable Agent</p>
        <p class="text-xs text-green-600">Commissions, quotas, bordereaux. Lecture + documents.</p>
      </div>
      <div class="bg-purple-50 rounded-xl p-4 border border-purple-100">
        <p class="font-bold text-purple-800 text-sm mb-1">Architecte Admin</p>
        <p class="text-xs text-purple-600">Tournois, rapports, analytics. Actions avec confirmation.</p>
      </div>
    </div>

    <!-- ═══ Section 2: Panneau de controle ═══ -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Panneau de controle</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">Surveillance (Assistant)</h3>
    <DocImage
      src="/screenshots/docs-admin-agent-dashboard.png"
      alt="Dashboard Assistant avec sessions actives et audit logs"
      caption="Le dashboard montre les sessions actives, requetes recentes et le bouton Panic Mode."
      placeholder="Capture du dashboard Assistant — Administration > Assistant" />
    <p class="text-gray-600 text-sm mb-3">
      Rendez-vous dans <strong>Administration &gt; Assistant</strong> pour voir :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-6">
      <li>Le nombre de sessions actives en temps reel</li>
      <li>Les requetes de la derniere heure et des 24 dernieres heures</li>
      <li>Le journal d'audit complet (qui a demande quoi, statut, temps de reponse)</li>
      <li>Le bouton <strong>Panic Mode</strong> pour couper l'agent instantanement</li>
    </ul>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">Configuration (Config Agent)</h3>
    <DocImage
      src="/screenshots/docs-admin-agent-settings.png"
      alt="Page de configuration Assistant avec rate limits et tool toggling"
      caption="Reglez les limites par role, activez/desactivez les outils et choisissez le moteur de reponse."
      placeholder="Capture de la page Config Agent — Administration > Config Agent" />
    <p class="text-gray-600 text-sm mb-3">
      Rendez-vous dans <strong>Administration &gt; Config Agent</strong> pour regler :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-6">
      <li><strong>Activation</strong> — activer/desactiver l'agent pour votre organisation</li>
      <li><strong>Agent public</strong> — autoriser les visiteurs non connectes a utiliser l'agent</li>
      <li><strong>Moteur de reponse</strong> — choisir entre le mode Rapide (economique) et le mode Precision (plus intelligent)</li>
      <li><strong>Limites de debit</strong> — nombre max de messages par heure pour chaque role</li>
      <li><strong>Gestion des outils</strong> — activer/desactiver des fonctions specifiques par role</li>
      <li><strong>Consommation</strong> — voir le nombre de tokens utilises et le cout estime du mois</li>
    </ul>

    <Callout type="warning" title="Conseil">
      Si votre facture IA augmente, basculez sur le modele Flash et reduisez les limites de debit des roles non-prioritaires.
    </Callout>

    <!-- ═══ Section 3: Panic Mode ═══ -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Panic Mode (arret d'urgence)</h2>
    <DocImage
      src="/screenshots/docs-admin-agent-panic.png"
      alt="Bouton Panic Mode rouge et indicateur actif"
      caption="Le bouton Panic Mode coupe instantanement toutes les sessions agentiques."
      placeholder="Capture du bouton Panic Mode (rouge) en haut du dashboard Assistant" />
    <p class="text-gray-600 text-sm mb-3">
      Le Panic Mode coupe <strong>immediatement</strong> toutes les sessions agentiques actives. Utilisez-le si :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-4">
      <li>Vous detectez un comportement anormal de l'agent</li>
      <li>La facture IA explose (trop de requetes)</li>
      <li>Un utilisateur signale une reponse inappropriee</li>
    </ul>
    <p class="text-gray-600 text-sm mb-6">
      Le Panic Mode s'active aussi <strong>automatiquement</strong> si plus de 100 requetes sont detectees en 1 minute (protection anti-abus).
    </p>

    <StepByStep :steps="panicSteps" />

    <!-- ═══ Section 4: Securite ═══ -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Securite et cloisonnement</h2>
    <p class="text-gray-600 text-sm mb-3">
      L'Assistant est protege par <strong>9 couches de securite</strong> :
    </p>
    <div class="space-y-2 mb-6">
      <div v-for="layer in securityLayers" :key="layer.name" class="flex items-start gap-3 text-sm">
        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{{ layer.num }}</span>
        <div>
          <span class="font-semibold text-gray-800">{{ layer.name }}</span>
          <span class="text-gray-500"> — {{ layer.description }}</span>
        </div>
      </div>
    </div>

    <Callout type="success" title="Cloisonnement Public/Prive">
      Les visiteurs non connectes ne voient que les informations publiques (inscriptions, tarifs, tournois). Ils n'ont aucun acces aux donnees internes, meme s'ils essaient de tromper l'agent.
    </Callout>

    <!-- ═══ Section 5: Outils disponibles ═══ -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Liste des outils de l'agent</h2>
    <DocImage
      src="/screenshots/docs-admin-agent-proposal.png"
      alt="Carte de confirmation d'action dans le chat Assistant"
      caption="Quand l'agent propose une action (ex: creer un tournoi), une carte de confirmation s'affiche avec les boutons Confirmer/Annuler."
      placeholder="Capture d'une carte de proposition (jaune) avec boutons Confirmer et Annuler" />
    <div class="overflow-x-auto mb-8">
      <table class="w-full text-sm border rounded-xl overflow-hidden">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-gray-500 text-xs uppercase">Outil</th>
            <th class="px-4 py-2 text-left text-gray-500 text-xs uppercase">Description</th>
            <th class="px-4 py-2 text-center text-gray-500 text-xs uppercase">Type</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="tool in toolList" :key="tool.id">
            <td class="px-4 py-2 font-medium text-gray-800">{{ tool.name }}</td>
            <td class="px-4 py-2 text-gray-600">{{ tool.desc }}</td>
            <td class="px-4 py-2 text-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="tool.mutation ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'">
                {{ tool.mutation ? 'Action' : 'Lecture' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
const panicSteps = [
  { title: 'Ouvrir le dashboard Assistant', description: 'Allez dans Administration > Assistant.' },
  { title: 'Cliquer sur "COUPER L\'AGENT"', description: 'Le bouton rouge en haut a droite. Un premier clic demande confirmation.' },
  { title: 'Confirmer', description: 'Cliquez a nouveau dans les 5 secondes pour confirmer. Toutes les sessions seront coupees.' },
  { title: 'Reactiver', description: 'Quand le probleme est resolu, cliquez sur le bouton vert "Reactiver l\'Agent".' },
];

const securityLayers = [
  { num: '1', name: 'Kill Switch', description: 'Variable d\'environnement pour desactiver completement l\'agent.' },
  { num: '2', name: 'Panic Mode', description: 'Arret d\'urgence instantane depuis le dashboard admin.' },
  { num: '3', name: 'Tenant Toggle', description: 'Chaque organisation peut activer/desactiver l\'agent independamment.' },
  { num: '4', name: 'Plan requis', description: 'Seuls les plans Individual, Etablissement et Pro ont acces.' },
  { num: '5', name: 'Rate Limiting', description: 'Nombre max de messages par heure par utilisateur.' },
  { num: '6', name: 'Controle par role', description: 'Chaque role n\'a acces qu\'a ses outils autorises.' },
  { num: '7', name: 'Mutation Lock', description: 'Toute action de modification necessite une confirmation humaine.' },
  { num: '8', name: 'Isolation Tenant', description: 'L\'agent ne peut acceder qu\'aux donnees de l\'organisation de l\'utilisateur.' },
  { num: '9', name: 'Audit Trail', description: 'Chaque interaction est enregistree dans le journal d\'audit.' },
];

const toolList = [
  { id: 'searchDocumentation', name: 'Recherche Documentation', desc: 'Consulte la base de connaissances TEGS', mutation: false },
  { id: 'faq', name: 'FAQ', desc: 'Repond aux questions frequentes', mutation: false },
  { id: 'tournamentList', name: 'Liste Tournois', desc: 'Affiche les tournois disponibles', mutation: false },
  { id: 'tournamentDetail', name: 'Detail Tournoi', desc: 'Informations completes d\'un tournoi', mutation: false },
  { id: 'tournamentCreate', name: 'Creer Tournoi', desc: 'Prepare la creation d\'un tournoi (admin)', mutation: true },
  { id: 'participantSearch', name: 'Recherche Participants', desc: 'Trouve des participants inscrits', mutation: false },
  { id: 'moduleList', name: 'Liste Modules', desc: 'Liste les modules quiz du Studio', mutation: false },
  { id: 'analyticsOverview', name: 'Analytics', desc: 'KPIs du dashboard (admin)', mutation: false },
  { id: 'commissionCalc', name: 'Calcul Commission', desc: 'Calcule la commission d\'un agent POS', mutation: false },
  { id: 'quotaStatus', name: 'Statut Quota', desc: 'Quota et garantie d\'un agent POS', mutation: false },
  { id: 'reportGenerate', name: 'Generer Rapport', desc: 'Prepare un rapport PDF (admin/agent)', mutation: true },
  { id: 'userSearch', name: 'Recherche Utilisateurs', desc: 'Trouve des utilisateurs (admin)', mutation: false },
  { id: 'agentAdmin', name: 'Admin Agent', desc: 'Logs et stats du systeme (superadmin)', mutation: false },
];

useHead({
  title: 'Assistant — Guide Admin | Centre d\'Aide | TEGS-Arena',
  meta: [{ name: 'description', content: 'Guide complet pour configurer et surveiller l\'Assistant TEGS-Arena : panneau de controle, Panic Mode, securite, outils disponibles.' }],
});
</script>
