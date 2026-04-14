<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Passer le quiz du concours</h1>
    <p class="text-gray-500 mb-8">Comment acceder au quiz, repondre aux questions et soumettre vos reponses.</p>

    <Callout type="warning" title="Avant de commencer">
      Assurez-vous d'avoir une connexion internet stable, votre code TKT-XXX, et un navigateur a jour.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Acceder au quiz</h2>
    <StepByStep :steps="[
      { title: 'Ouvrir la page du concours', description: 'Allez sur la page du tournoi. Si le concours est en cours (badge rouge LIVE), le bouton Acceder au Quiz apparait.' },
      { title: 'Entrer votre code TKT-XXX', description: 'Saisissez le code de competition recu lors de votre inscription.' },
      { title: 'Lire le briefing', description: 'L\'ecran de briefing affiche : votre nom, le round actuel, la duree du quiz, et les instructions.' },
      { title: 'Lancer le quiz', description: 'Cliquez sur Commencer le Quiz. Le chronometre demarre immediatement.' },
      { title: 'Repondre aux questions', description: 'Parcourez les questions une par une. Le temps restant est affiche en haut.' },
      { title: 'Soumettre', description: 'Cliquez sur Soumettre mes reponses. Vos resultats sont enregistres et lies a votre profil candidat.' },
    ]" />

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Types de questions</h2>
    <div class="space-y-3 mb-6">
      <div class="bg-white rounded-xl border p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">QCM</div>
        <div><div class="font-medium">Choix multiples</div><div class="text-sm text-gray-500">Selectionnez une ou plusieurs reponses parmi les options.</div></div>
      </div>
      <div class="bg-white rounded-xl border p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-sm">V/F</div>
        <div><div class="font-medium">Vrai ou Faux</div><div class="text-sm text-gray-500">Indiquez si l'affirmation est correcte.</div></div>
      </div>
      <div class="bg-white rounded-xl border p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">123</div>
        <div><div class="font-medium">Numerique</div><div class="text-sm text-gray-500">Entrez la valeur numerique exacte.</div></div>
      </div>
      <div class="bg-white rounded-xl border p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-sm">___</div>
        <div><div class="font-medium">Texte a trous</div><div class="text-sm text-gray-500">Completez le texte avec le mot manquant.</div></div>
      </div>
    </div>

    <Callout type="danger" title="Attention">
      Une fois soumis, vous ne pouvez PAS modifier vos reponses. Si le temps est ecoule, vos reponses sont soumises automatiquement.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Passer le quiz | Guide Candidat | TEGS-Arena' });
</script>
