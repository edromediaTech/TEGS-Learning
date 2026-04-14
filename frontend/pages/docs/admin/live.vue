<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Piloter le live d'un concours</h1>
    <p class="text-gray-500 mb-8">Demarrer les rounds, suivre le bracket et generer les certificats.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Jour du concours</h2>
    <StepByStep :steps="[
      { title: 'Verifier les inscriptions', description: 'Consultez l\'onglet Participants pour verifier les inscrits et les paiements confirmes.' },
      { title: 'Demarrer le Round 1', description: 'Dans l\'onglet Bracket, cliquez Demarrer Round 1. Le statut passe a LIVE.' },
      { title: 'Suivre en direct', description: 'Le bracket se met a jour en temps reel via WebSocket. Projetez /live-tournament/[token] sur un ecran.' },
      { title: 'Attendre les soumissions', description: 'Les candidats passent le quiz. Leurs scores apparaissent au fur et a mesure.' },
      { title: 'Cloturer et qualifier', description: 'Cliquez Cloturer & Qualifier. Le systeme classe automatiquement et qualifie les Top X.' },
      { title: 'Repeter pour chaque round', description: 'Demarrez le round suivant. Les elimines ne peuvent plus participer.' },
      { title: 'Podium et certificats', description: 'Apres le dernier round, le podium s\'affiche. Telechargez les certificats PDF pour les gagnants.' },
    ]" />

    <Callout type="tip" title="Ecran de diffusion">
      Utilisez l'URL <code>/live-tournament/[token]</code> sur un projecteur ou ecran TV pour que le public suive le bracket en direct avec les animations de qualification.
    </Callout>

    <Callout type="warning" title="Irreversible">
      La cloture d'un round et la qualification sont irreversibles. Assurez-vous que tous les candidats ont soumis leurs reponses avant de cloturer.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Piloter le live | Guide Admin | TEGS-Arena' });
</script>
