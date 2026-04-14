<template>
  <DocsLayout role="agent">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Gerer son quota agent</h1>
    <p class="text-gray-500 mb-8">Comprendre et gerer votre limite de collecte de paiements.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Qu'est-ce que le quota ?</h2>
    <p class="text-gray-600 mb-4">Le quota definit le nombre maximum de paiements que vous pouvez collecter pour un tournoi. Il est configure par l'administrateur lors de votre activation.</p>

    <Callout type="info">
      Votre quota restant est visible dans votre tableau de bord agent. Surveillez-le regulierement pour eviter un blocage en pleine collecte.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Quota bloque ?</h2>
    <StepByStep :steps="[
      { title: 'Verifier votre quota actuel', description: 'Consultez votre profil agent dans l\'application pour voir le quota restant.' },
      { title: 'Contacter votre administrateur', description: 'Envoyez un message a l\'admin du tournoi pour demander une reinitialisation.' },
      { title: 'Attendre la validation', description: 'L\'admin reinitialise votre quota depuis le panneau d\'administration.' },
    ]" />

    <Callout type="danger" title="Blocage automatique">
      Le systeme bloque automatiquement la collecte si votre quota est atteint ou si votre compte agent est desactive. Aucune transaction ne sera possible tant que l'admin n'intervient pas.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Gerer son quota | Guide Agent | TEGS-Arena' });
</script>
