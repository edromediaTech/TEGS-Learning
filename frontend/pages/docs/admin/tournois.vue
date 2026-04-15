<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Creer et configurer un tournoi</h1>
    <p class="text-gray-500 mb-8">Guide complet pour mettre en place un concours de A a Z : creation, rounds, primes, sponsors et inscriptions.</p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Prerequis</h2>
    <Callout type="warning" title="Avant de creer un tournoi">
      Vous devez avoir cree au moins un <strong>module de questions</strong> dans le Studio (un module par round).
      Consultez le guide <NuxtLink to="/docs/admin/modules" class="text-amber-600 underline">Creer et configurer un module</NuxtLink>.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Procedure de creation</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">1. Preparer les modules de questions</h3>
    <p class="text-gray-600 text-sm mb-3">Allez dans <strong>Admin > Modules</strong>, creez un module par round avec les questions quiz. Utilisez le generateur IA pour accelerer (<NuxtLink to="/docs/admin/ia-quiz" class="text-amber-600 underline">guide IA</NuxtLink>).</p>
    <DocImage
      src="/screenshots/admin-modules-list.png"
      alt="Liste des modules dans le Studio"
      caption="Chaque module contient les questions d'un round. Creez-en un par etape eliminatoire."
      placeholder="Capture de la page Studio avec la liste des modules" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">2. Creer le tournoi</h3>
    <p class="text-gray-600 text-sm mb-3">Allez dans <strong>Admin > Tournois > Nouveau Tournoi</strong>. Remplissez le formulaire de creation.</p>
    <DocImage
      src="/screenshots/admin-tournament-new.png"
      alt="Formulaire de creation de tournoi"
      caption="Remplissez les informations generales : titre, frais d'inscription, devise et capacite."
      placeholder="Capture du formulaire nouveau tournoi avec les champs titre et frais" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Champs du formulaire</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Champ</th><th class="text-left py-2">Description</th><th class="text-left py-2">Exemple</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Titre</td><td class="py-2 text-gray-500">Nom public du concours</td><td class="py-2 text-gray-400 text-xs">Concours National de Culture Generale 2026</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Description</td><td class="py-2 text-gray-500">Presentation du concours (affichee sur le Lobby)</td><td class="py-2 text-gray-400 text-xs">Le plus grand concours academique d'Haiti...</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Frais d'inscription</td><td class="py-2 text-gray-500">Montant a payer (0 = gratuit)</td><td class="py-2 text-gray-400 text-xs">500 HTG</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Devise</td><td class="py-2 text-gray-500">Monnaie utilisee</td><td class="py-2 text-gray-400 text-xs">HTG, USD</td></tr>
          <tr><td class="py-2 font-medium">Capacite max</td><td class="py-2 text-gray-500">Nombre maximum de participants (0 = illimite)</td><td class="py-2 text-gray-400 text-xs">500</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">3. Configurer les rounds</h3>
    <p class="text-gray-600 text-sm mb-3">Ajoutez chaque round eliminatoire : label, module de questions, nombre de qualifies (Top X).</p>
    <DocImage
      src="/screenshots/admin-tournament-rounds.png"
      alt="Configuration des rounds eliminatoires"
      caption="Chaque round est lie a un module. Le Top X definit combien de candidats passent au round suivant."
      placeholder="Capture de la section rounds avec les dropdowns module et Top X" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Champ</th><th class="text-left py-2">Description</th><th class="text-left py-2">Exemple</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Label</td><td class="py-2 text-gray-500">Nom du round (affiche dans le bracket)</td><td class="py-2 text-gray-400 text-xs">Eliminatoire, Quart de finale, Demi-finale, Finale</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Module</td><td class="py-2 text-gray-500">Le module de questions a utiliser pour ce round</td><td class="py-2 text-gray-400 text-xs">Module "Round 1 — Culture Generale"</td></tr>
          <tr><td class="py-2 font-medium">Top X</td><td class="py-2 text-gray-500">Nombre de candidats qualifies pour le round suivant</td><td class="py-2 text-gray-400 text-xs">Top 50 (sur 200 inscrits)</td></tr>
        </tbody>
      </table>
    </div>

    <Callout type="tip" title="Exemple de configuration classique">
      <strong>Round 1</strong> (Eliminatoire) : Top 50 sur 200 inscrits<br/>
      <strong>Round 2</strong> (Demi-finale) : Top 20 sur 50 qualifies<br/>
      <strong>Round 3</strong> (Finale) : Top 3 sur 20 finalistes
    </Callout>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">4. Definir les primes</h3>
    <p class="text-gray-600 text-sm mb-3">Ajoutez la dotation du podium : 1er prix, 2e prix, etc. avec les montants et labels.</p>
    <DocImage
      src="/screenshots/admin-tournament-prizes.png"
      alt="Configuration des primes du podium"
      caption="Les primes apparaitront dans le reglement public et sur les certificats des gagnants."
      placeholder="Capture de la section primes avec rang, label et montant" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Champ</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Rang</td><td class="py-2 text-gray-500">Position dans le classement (1er, 2e, 3e...)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Label</td><td class="py-2 text-gray-500">Description de la prime (ex: "Premier Prix")</td></tr>
          <tr><td class="py-2 font-medium">Montant</td><td class="py-2 text-gray-500">Valeur du prix en devise configuree</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">5. Ouvrir les inscriptions</h3>
    <p class="text-gray-600 text-sm mb-3">Changez le statut du tournoi de <strong>draft</strong> a <strong>registration</strong>. Le lien public est genere automatiquement.</p>
    <DocImage
      src="/screenshots/admin-tournament-status.png"
      alt="Changement de statut du tournoi"
      caption="Passez en mode inscription pour rendre le tournoi visible sur le Lobby public."
      placeholder="Capture du menu statut avec les options draft / registration / active" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Statut</th><th class="text-left py-2">Description</th><th class="text-left py-2">Visible publiquement</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Draft</td><td class="py-2 text-gray-500">Brouillon — en cours de configuration</td><td class="py-2 text-gray-400">Non</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Registration</td><td class="py-2 text-gray-500">Inscriptions ouvertes — les candidats peuvent s'inscrire et payer</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Active</td><td class="py-2 text-gray-500">Concours en cours — les rounds sont lances</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
          <tr><td class="py-2 font-medium">Completed</td><td class="py-2 text-gray-500">Concours termine — podium et certificats disponibles</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">6. Ajouter les sponsors</h3>
    <p class="text-gray-600 text-sm mb-3">Dans le detail du tournoi, ajoutez les sponsors avec leur logo et tier.</p>
    <DocImage
      src="/screenshots/admin-tournament-sponsors.png"
      alt="Gestion des sponsors du tournoi"
      caption="Les sponsors Diamant apparaissent sur les cartes du Lobby, le live et les certificats."
      placeholder="Capture de la liste des sponsors avec tiers et logos" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Tier</th><th class="text-left py-2">Visibilite</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Diamant</td><td class="py-2 text-gray-500">Lobby, live, certificats, toutes les pages</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Or</td><td class="py-2 text-gray-500">Lobby, live, certificats</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Argent</td><td class="py-2 text-gray-500">Lobby et live</td></tr>
          <tr><td class="py-2 font-medium">Bronze</td><td class="py-2 text-gray-500">Page sponsors uniquement</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Lien de partage et inscription</h2>
    <p class="text-gray-600 text-sm mb-4">
      Chaque tournoi en mode <strong>registration</strong> ou <strong>active</strong> a un lien public unique :
    </p>
    <div class="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm text-gray-600">
      https://tegslearning.com/tournament/[token]
    </div>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-4">
      <li>Partagez ce lien sur les reseaux sociaux — les balises OpenGraph generent automatiquement une carte de previsualisation</li>
      <li>Les candidats s'inscrivent, paient via MonCash/Natcash, et recoivent leur badge TKT-XXX avec QR code</li>
      <li>Le reglement du concours est accessible a <code>/tournament/[token]/rules</code></li>
    </ul>

    <Callout type="tip" title="Codes bourses">
      Vous pouvez creer des codes de bourse (BOURSE-XXXXX) pour offrir des inscriptions gratuites.
      Voir le guide <NuxtLink to="/docs/sponsor/bourses" class="text-amber-600 underline">Offrir des bourses</NuxtLink>.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Gestion des participants</h2>
    <p class="text-gray-600 text-sm mb-4">
      L'onglet <strong>Participants</strong> dans le detail du tournoi affiche la liste complete des inscrits :
    </p>
    <DocImage
      src="/screenshots/admin-tournament-participants.png"
      alt="Liste des participants inscrits au tournoi"
      caption="Consultez les inscrits, leur statut de paiement, token TKT et score par round."
      placeholder="Capture de l'onglet Participants avec le tableau des inscrits" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Information</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Nom / Prenom</td><td class="py-2 text-gray-500">Identite du candidat</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Email</td><td class="py-2 text-gray-500">Email d'inscription (unique par tournoi)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Token (TKT-XXX)</td><td class="py-2 text-gray-500">Badge unique d'acces au quiz</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Statut</td><td class="py-2 text-gray-500">registered, qualified, eliminated, winner, disqualified</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Paiement</td><td class="py-2 text-gray-500">Confirme ou en attente</td></tr>
          <tr><td class="py-2 font-medium">Score total</td><td class="py-2 text-gray-500">Score cumule sur tous les rounds joues</td></tr>
        </tbody>
      </table>
    </div>

    <p class="text-gray-600 text-sm mb-4">Filtres disponibles :</p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-4">
      <li><strong>Par statut</strong> — voir uniquement les qualifies, elimines, etc.</li>
      <li><strong>Par round</strong> — voir les participants d'un round specifique</li>
    </ul>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etapes suivantes</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <ul class="space-y-3 text-sm text-gray-600">
        <li>&#8594; <NuxtLink to="/docs/admin/modules" class="text-amber-600 underline">Creer et configurer un module</NuxtLink> — pour preparer vos questions</li>
        <li>&#8594; <NuxtLink to="/docs/admin/calibrage" class="text-amber-600 underline">Calibrer la duree des quiz</NuxtLink> — pour ajuster le timing</li>
        <li>&#8594; <NuxtLink to="/docs/admin/ia-quiz" class="text-amber-600 underline">Generer des quiz par IA</NuxtLink> — pour accelerer la creation</li>
        <li>&#8594; <NuxtLink to="/docs/admin/live" class="text-amber-600 underline">Piloter le live</NuxtLink> — pour le jour du concours</li>
      </ul>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Creer un tournoi | Guide Admin | TEGS-Arena' });
</script>
