<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Comment s'inscrire a un concours</h1>
    <p class="text-gray-500 mb-8">Guide etape par etape pour s'inscrire et obtenir votre badge de competition.</p>

    <Callout type="info" title="Prerequis">
      Vous avez besoin d'une adresse email valide et d'un telephone avec MonCash ou Natcash si le concours est payant.
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etapes d'inscription</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">1. Acceder au Lobby</h3>
    <p class="text-gray-600 text-sm mb-3">Rendez-vous sur la page d'accueil TEGS-Arena. Les concours ouverts aux inscriptions sont affiches avec un badge bleu <strong>"Inscriptions"</strong>.</p>
    <DocImage
      src="/screenshots/lobby-grid.png"
      alt="Page d'accueil Lobby — grille des concours"
      caption="Le Lobby affiche tous les concours avec leur statut, nombre d'inscrits et frais."
      placeholder="Capture de la page d'accueil avec les cartes de concours" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">2. Choisir un concours</h3>
    <p class="text-gray-600 text-sm mb-3">Cliquez sur la carte du concours qui vous interesse. Le modal d'inscription s'ouvre avec 3 onglets.</p>
    <DocImage
      src="/screenshots/registration-modal.png"
      alt="Modal d'inscription avec les 3 onglets"
      caption="Le modal propose 3 portails : Candidat, Sponsor, et Offrir des places."
      placeholder="Capture du modal d'inscription ouvert sur l'onglet Candidat" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">3. Remplir le formulaire</h3>
    <p class="text-gray-600 text-sm mb-3">Saisissez votre prenom, nom, email, telephone et etablissement. Tous les champs marques * sont obligatoires.</p>
    <DocImage
      src="/screenshots/registration-form.png"
      alt="Formulaire d'inscription candidat"
      caption="Remplissez tous les champs obligatoires. Le code de parrainage est optionnel."
      placeholder="Capture du formulaire avec les champs nom, email, telephone" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">4. Code de parrainage (optionnel)</h3>
    <p class="text-gray-600 text-sm mb-3">Si un sponsor a paye vos frais, entrez le code <strong>BOURSE-XXX</strong> fourni. Le systeme valide instantanement et affiche le nom du sponsor.</p>
    <DocImage
      src="/screenshots/sponsor-code.png"
      alt="Validation du code de parrainage"
      caption="Le code BOURSE est valide en temps reel. Le nom du sponsor et les places restantes s'affichent."
      placeholder="Capture du champ code BOURSE avec message de validation vert"
      icon="&#127915;" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">5. Paiement</h3>
    <p class="text-gray-600 text-sm mb-3">Choisissez MonCash ou Natcash. Vous serez redirige vers l'application de paiement.</p>
    <DocImage
      src="/screenshots/payment-selection.png"
      alt="Selection de la methode de paiement"
      caption="MonCash (Digicel) ou Natcash (Natcom) — le montant est affiche clairement."
      placeholder="Capture des boutons MonCash et Natcash avec le montant" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">6. Recevoir votre badge</h3>
    <p class="text-gray-600 text-sm mb-3">Apres confirmation du paiement, vous recevez votre code <strong>TKT-XXX</strong> et un QR code.</p>
    <DocImage
      src="/screenshots/ticket-received.png"
      alt="Badge de competition recu — TKT et QR code"
      caption="Conservez precieusement ce code ! Il sera demande pour acceder au quiz."
      placeholder="Capture de l'ecran de confirmation avec QR code et code TKT-XXX" />

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
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Comment s\'inscrire | Guide Candidat | TEGS-Arena' });
</script>
