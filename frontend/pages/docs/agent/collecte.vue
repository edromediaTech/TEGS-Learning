<template>
  <DocsLayout role="agent">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Guide agent collecteur</h1>
    <p class="text-gray-500 mb-8">Comment collecter les paiements en especes et generer les badges.</p>

    <Callout type="info" title="Conditions">
      Vous devez etre un agent autorise avec un contrat accepte et un quota actif pour collecter des paiements.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Processus de collecte</h2>
    <StepByStep :steps="[
      { title: 'Rechercher le participant', description: 'Utilisez la barre de recherche pour trouver le candidat par nom, email ou token TKT-XXX.' },
      { title: 'Verifier l\'inscription', description: 'Confirmez le nom, l\'email et l\'etablissement du candidat.' },
      { title: 'Collecter le paiement', description: 'Recevez le montant en especes du candidat. Le systeme affiche le montant exact a collecter.' },
      { title: 'Confirmer dans l\'application', description: 'Cliquez sur Confirmer le paiement. Le systeme genere automatiquement le recu et le badge QR.' },
      { title: 'Remettre le badge', description: 'Le candidat recoit son code TKT-XXX et QR code. Imprimez ou envoyez par SMS/WhatsApp.' },
    ]" />

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Commission</h2>
    <p class="text-gray-600 mb-4">Votre commission est calculee automatiquement selon votre taux configure par l'administrateur. Elle est visible dans le recu de chaque transaction.</p>

    <Callout type="warning" title="Quota">
      Chaque agent a un quota maximum de paiements. Une fois atteint, vous ne pouvez plus collecter. Demandez une reinitialisation a votre admin.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Guide agent collecteur | TEGS-Arena' });
</script>
