<template>
  <DocsLayout role="sponsor">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Offrir des bourses (Code BOURSE)</h1>
    <p class="text-gray-500 mb-8">Comment parrainer des candidats en achetant des places en lot.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Principe</h2>
    <p class="text-gray-600 mb-6">Une institution (ecole, mairie, ONG, entreprise) peut acheter un lot de places pour ses membres. Le systeme genere un code unique <strong>BOURSE-XXXXXX</strong> que les candidats utilisent pour s'inscrire gratuitement.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Etapes</h2>
    <StepByStep :steps="[
      { title: 'Ouvrir le modal d\'inscription', description: 'Sur la page du concours, selectionnez l\'onglet Offrir des places.' },
      { title: 'Definir le nombre de places', description: 'Ex: 100 places pour le Lycee National de Ouanaminthe.' },
      { title: 'Voir le calcul de prix', description: 'Le total est affiche : nombre de places x frais d\'inscription.' },
      { title: 'Soumettre la demande', description: 'Un administrateur vous contactera pour le paiement et vous enverra le code BOURSE-XXXXXX.' },
      { title: 'Distribuer le code', description: 'Partagez le code avec vos candidats. Chaque utilisation decremente le compteur.' },
    ]" />

    <Callout type="info" title="Suivi des utilisations">
      Chaque code a un compteur d'utilisations. L'administrateur peut suivre en temps reel combien de candidats ont utilise votre code.
    </Callout>

    <Callout type="warning" title="Expiration">
      Les codes BOURSE peuvent avoir une date d'expiration. Assurez-vous de les distribuer avant la cloture des inscriptions.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Offrir des bourses | Guide Sponsor | TEGS-Arena' });
</script>
