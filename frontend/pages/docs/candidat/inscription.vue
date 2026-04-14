<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Comment s'inscrire a un concours</h1>
    <p class="text-gray-500 mb-8">Guide etape par etape pour s'inscrire et obtenir votre badge de competition.</p>

    <Callout type="info" title="Prerequis">
      Vous avez besoin d'une adresse email valide et d'un telephone avec MonCash ou Natcash si le concours est payant.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etapes d'inscription</h2>

    <StepByStep :steps="[
      { title: 'Acceder au Lobby', description: 'Rendez-vous sur la page d\'accueil TEGS-Arena. Les concours ouverts aux inscriptions sont affiches avec un badge bleu.' },
      { title: 'Choisir un concours', description: 'Cliquez sur la carte du concours qui vous interesse. Verifiez les rounds, les primes et les frais d\'inscription.' },
      { title: 'Remplir le formulaire', description: 'Saisissez votre prenom, nom, email, telephone et etablissement. Tous les champs marques * sont obligatoires.' },
      { title: 'Code de parrainage (optionnel)', description: 'Si un sponsor a paye vos frais, entrez le code BOURSE-XXX fourni. Votre inscription sera automatiquement validee.' },
      { title: 'Paiement', description: 'Choisissez MonCash ou Natcash. Vous serez redirige vers l\'application de paiement. Completez la transaction.' },
      { title: 'Recevoir votre badge', description: 'Apres paiement confirme, vous recevez votre code TKT-XXX et un QR code. Conservez-les precieusement !' },
    ]" />

    <Callout type="warning" title="Important">
      Votre code TKT-XXX est votre billet d'entree au concours. Sans lui, vous ne pourrez pas acceder au quiz le jour J.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Methodes de paiement</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-4">
        <div class="flex items-center space-x-3 mb-2">
          <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">MC</div>
          <div class="font-bold">MonCash (Digicel)</div>
        </div>
        <p class="text-sm text-gray-500">Paiement mobile instantane via l'application MonCash.</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <div class="flex items-center space-x-3 mb-2">
          <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">NC</div>
          <div class="font-bold">Natcash (Natcom)</div>
        </div>
        <p class="text-sm text-gray-500">Paiement mobile instantane via l'application Natcash.</p>
      </div>
    </div>

    <Callout type="tip" title="Concours gratuit">
      Si le concours est gratuit (frais = 0), vous recevez votre badge immediatement apres l'inscription, sans paiement.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
useHead({ title: 'Comment s\'inscrire | Guide Candidat | TEGS-Arena' });
</script>
