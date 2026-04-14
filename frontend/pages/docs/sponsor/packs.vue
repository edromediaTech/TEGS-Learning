<template>
  <DocsLayout role="sponsor">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Packs de visibilite sponsor</h1>
    <p class="text-gray-500 mb-8">Choisissez votre niveau de visibilite et maximisez votre impact.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Les 4 niveaux de sponsoring</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
        <div class="font-black text-blue-700 text-lg mb-2">Diamant</div>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>&#10003; Logo sur le live arena</li>
          <li>&#10003; Logo sur tous les tickets</li>
          <li>&#10003; Logo sur les certificats</li>
          <li>&#10003; Logo sur l'app mobile</li>
          <li>&#10003; Mention prioritaire partout</li>
        </ul>
      </div>
      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
        <div class="font-black text-yellow-700 text-lg mb-2">Or</div>
        <ul class="text-sm text-yellow-800 space-y-1">
          <li>&#10003; Logo sur le live arena</li>
          <li>&#10003; Logo sur les tickets</li>
          <li>&#10003; Logo sur les certificats</li>
        </ul>
      </div>
      <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-5">
        <div class="font-black text-gray-600 text-lg mb-2">Argent</div>
        <ul class="text-sm text-gray-700 space-y-1">
          <li>&#10003; Logo sur le live arena</li>
          <li>&#10003; Logo sur les tickets</li>
        </ul>
      </div>
      <div class="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
        <div class="font-black text-orange-700 text-lg mb-2">Bronze</div>
        <ul class="text-sm text-orange-800 space-y-1">
          <li>&#10003; Mention partenaire</li>
        </ul>
      </div>
    </div>

    <Callout type="tip" title="ROI mesurable">
      Chaque sponsor dispose d'un tableau de bord analytique montrant le nombre d'impressions, le cout par impression et le nombre de participants exposes a votre marque.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Comment devenir sponsor</h2>
    <StepByStep :steps="[
      { title: 'Choisir un concours', description: 'Sur la page du concours, ouvrez le modal d\'inscription et selectionnez l\'onglet Sponsor.' },
      { title: 'Selectionner votre pack', description: 'Choisissez entre Diamant, Or, Argent ou Bronze selon votre budget et objectifs.' },
      { title: 'Remplir vos informations', description: 'Nom d\'entreprise, logo (URL), slogan, site web, email de contact.' },
      { title: 'Soumettre votre candidature', description: 'Un administrateur validera votre demande et activera votre visibilite.' },
    ]" />
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Packs sponsor | Guide Sponsor | TEGS-Arena' });
</script>
