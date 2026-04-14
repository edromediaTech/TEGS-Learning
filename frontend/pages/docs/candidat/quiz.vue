<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Passer le quiz du concours</h1>
    <p class="text-gray-500 mb-8">Comment acceder au quiz, repondre aux questions et soumettre vos reponses.</p>

    <Callout type="warning" title="Avant de commencer">
      Assurez-vous d'avoir une connexion internet stable, votre code TKT-XXX, et un navigateur a jour.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Acceder au quiz</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">1. Ouvrir la page du concours</h3>
    <p class="text-gray-600 text-sm mb-3">Allez sur la page du tournoi. Quand le concours est en cours, le bouton <strong>"Acceder au Quiz"</strong> apparait en vert.</p>
    <DocImage
      src="/screenshots/lobby-grid.png"
      alt="Bouton Acceder au Quiz sur la page du tournoi"
      caption="Le bouton vert apparait uniquement quand le tournoi est en statut LIVE."
      placeholder="Capture de la page tournoi avec le bouton vert Acceder au Quiz" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">2. Entrer votre code TKT-XXX</h3>
    <p class="text-gray-600 text-sm mb-3">Saisissez le code de competition recu lors de votre inscription.</p>
    <DocImage
      src="/screenshots/login-page.png"
      alt="Ecran de saisie du code de competition"
      caption="Entrez votre code TKT-XXX. Le systeme verifie votre identite et votre eligibilite."
      placeholder="Capture de l'ecran de saisie du token avec le champ TKT-XXX" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">3. Lire le briefing</h3>
    <p class="text-gray-600 text-sm mb-3">L'ecran de briefing affiche votre nom, le round actuel, la duree du quiz et les instructions.</p>
    <DocImage
      src="/screenshots/docs-candidat-quiz.png"
      alt="Ecran de briefing avant le quiz"
      caption="Verifiez vos informations et la duree du quiz avant de commencer."
      placeholder="Capture du briefing avec nom du candidat, round et duree" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">4. Repondre aux questions</h3>
    <p class="text-gray-600 text-sm mb-3">Parcourez les questions une par une. Le temps restant est affiche en haut de l'ecran.</p>
    <DocImage
      src="/screenshots/docs-candidat-quiz.png"
      alt="Interface du quiz avec questions et timer"
      caption="Repondez a chaque question. La barre de progression et le timer sont visibles en permanence."
      placeholder="Capture de l'interface quiz avec une question QCM et le chronometre" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">5. Soumettre vos reponses</h3>
    <p class="text-gray-600 text-sm mb-3">Cliquez sur <strong>"Soumettre mes reponses"</strong>. Votre score est enregistre instantanement.</p>
    <DocImage
      src="/screenshots/docs-candidat-resultats.png"
      alt="Ecran de confirmation apres soumission"
      caption="Votre score est affiche immediatement. Le classement sera annonce a la cloture du round."
      placeholder="Capture de l'ecran de confirmation avec le score en pourcentage" />

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
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Passer le quiz | Guide Candidat | TEGS-Arena' });
</script>
