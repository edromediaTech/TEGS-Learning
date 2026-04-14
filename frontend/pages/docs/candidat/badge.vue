<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Recuperer son badge TKT perdu</h1>
    <p class="text-gray-500 mb-8">Vous avez perdu votre code de competition ? Voici comment le recuperer.</p>

    <Callout type="tip" title="Bonne nouvelle">
      Le systeme detecte automatiquement les inscriptions existantes par email. Vous ne perdrez pas votre place.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Procedure de recuperation</h2>
    <StepByStep :steps="[
      { title: 'Retourner sur la page d\'inscription', description: 'Accedez au tournoi via le lien ou le Lobby et cliquez sur S\'inscrire.' },
      { title: 'Remplir avec le meme email', description: 'Utilisez exactement le meme email que lors de votre premiere inscription.' },
      { title: 'Recuperation automatique', description: 'Le systeme detectera que vous etes deja inscrit(e) et affichera votre badge TKT-XXX et QR code.' },
    ]" />

    <Callout type="warning" title="Email different ?">
      Si vous ne vous souvenez plus de l'email utilise, contactez l'administrateur du concours ou un agent collecteur sur place.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Recuperer son badge | Guide Candidat | TEGS-Arena' });
</script>
