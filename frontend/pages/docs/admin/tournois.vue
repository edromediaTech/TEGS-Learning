<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Creer et configurer un tournoi</h1>
    <p class="text-gray-500 mb-8">Guide complet pour mettre en place un concours de A a Z.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Procedure de creation</h2>
    <StepByStep :steps="[
      { title: 'Preparer les modules de questions', description: 'Allez dans Modules, creez un module par round avec les questions quiz (QCM, V/F, numerique, etc.).' },
      { title: 'Creer le tournoi', description: 'Allez dans Tournois > Nouveau Tournoi. Definissez le titre, la description et les frais.' },
      { title: 'Configurer les rounds', description: 'Ajoutez chaque round : label, module de questions, nombre de qualifies (Top X).' },
      { title: 'Definir les primes', description: 'Ajoutez la dotation : 1er prix, 2e prix, etc. avec les montants en HTG/USD.' },
      { title: 'Ouvrir les inscriptions', description: 'Changez le statut du tournoi de draft a registration. Le lien public est genere automatiquement.' },
      { title: 'Ajouter les sponsors', description: 'Dans le detail du tournoi, ajoutez les sponsors avec leur logo et tier.' },
      { title: 'Creer les packs de bourses', description: 'Generez les codes BOURSE-XXX pour les institutions partenaires.' },
    ]" />

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
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Creer un tournoi | Guide Admin | TEGS-Arena' });
</script>
