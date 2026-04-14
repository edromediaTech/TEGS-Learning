<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Creer et configurer un tournoi</h1>
    <p class="text-gray-500 mb-8">Guide complet pour mettre en place un concours de A a Z.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Procedure de creation</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">1. Preparer les modules de questions</h3>
    <p class="text-gray-600 text-sm mb-3">Allez dans <strong>Studio</strong>, creez un module par round avec les questions quiz.</p>
    <DocImage
      src="/screenshots/admin-modules-list.png"
      alt="Liste des modules dans le Studio"
      caption="Chaque module contient les questions d'un round. Creez-en un par etape eliminatoire."
      placeholder="Capture de la page Studio avec la liste des modules" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">2. Creer le tournoi</h3>
    <p class="text-gray-600 text-sm mb-3">Allez dans <strong>Tournois > Nouveau Tournoi</strong>. Definissez le titre, la description et les frais.</p>
    <DocImage
      src="/screenshots/admin-tournament-new.png"
      alt="Formulaire de creation de tournoi"
      caption="Remplissez les informations generales : titre, frais d'inscription, devise et capacite."
      placeholder="Capture du formulaire nouveau tournoi avec les champs titre et frais" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">3. Configurer les rounds</h3>
    <p class="text-gray-600 text-sm mb-3">Ajoutez chaque round : label, module de questions, nombre de qualifies (Top X).</p>
    <DocImage
      src="/screenshots/admin-tournament-rounds.png"
      alt="Configuration des rounds eliminatoires"
      caption="Chaque round est lie a un module. Le Top X definit combien de candidats passent au round suivant."
      placeholder="Capture de la section rounds avec les dropdowns module et Top X" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">4. Definir les primes</h3>
    <p class="text-gray-600 text-sm mb-3">Ajoutez la dotation : 1er prix, 2e prix, etc. avec les montants.</p>
    <DocImage
      src="/screenshots/admin-tournament-prizes.png"
      alt="Configuration des primes du podium"
      caption="Les primes apparaitront dans le reglement public et sur les certificats des gagnants."
      placeholder="Capture de la section primes avec rang, label et montant" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">5. Ouvrir les inscriptions</h3>
    <p class="text-gray-600 text-sm mb-3">Changez le statut du tournoi de <strong>draft</strong> a <strong>registration</strong>. Le lien public est genere automatiquement.</p>
    <DocImage
      src="/screenshots/admin-tournament-status.png"
      alt="Changement de statut du tournoi"
      caption="Passez en mode inscription pour rendre le tournoi visible sur le Lobby public."
      placeholder="Capture du menu statut avec les options draft / registration / active" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">6. Ajouter les sponsors</h3>
    <p class="text-gray-600 text-sm mb-3">Dans le detail du tournoi, ajoutez les sponsors avec leur logo et tier.</p>
    <DocImage
      src="/screenshots/admin-sponsors.png"
      alt="Gestion des sponsors du tournoi"
      caption="Les sponsors Diamant apparaissent sur les cartes du Lobby, le live et les certificats."
      placeholder="Capture de la liste des sponsors avec tiers et logos" />

    <Callout type="tip" title="Lien de partage">
      Chaque tournoi a un lien public unique. Partagez-le sur les reseaux sociaux — les balises OpenGraph generent automatiquement une belle carte de previsualisation.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Configuration des rounds</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Champ</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Label</td><td class="py-2 text-gray-500">Nom du round (ex: Eliminatoire, Demi-finale)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Module</td><td class="py-2 text-gray-500">Le module de questions a utiliser pour ce round</td></tr>
          <tr><td class="py-2 font-medium">Top X</td><td class="py-2 text-gray-500">Nombre de candidats qualifies pour le round suivant</td></tr>
        </tbody>
      </table>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Creer un tournoi | Guide Admin | TEGS-Arena' });
</script>
