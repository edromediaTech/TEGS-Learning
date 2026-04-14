<template>
  <DocsLayout role="candidat">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Resultats et classement</h1>
    <p class="text-gray-500 mb-8">Comment le classement fonctionne et ce qui se passe apres chaque round.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Comment fonctionne le classement</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="space-y-4 text-sm">
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">1</div>
          <div><span class="font-bold">Score (%)</span> — Le classement principal est base sur votre pourcentage de bonnes reponses.</div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">2</div>
          <div><span class="font-bold">Temps</span> — En cas d'egalite de score, le candidat ayant repondu le plus vite est classe devant.</div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">3</div>
          <div><span class="font-bold">Qualification</span> — Seuls les Top X (defini par le reglement) passent au round suivant. Les autres sont elimines.</div>
        </div>
      </div>
    </div>

    <Callout type="info" title="Statuts possibles">
      <strong>Qualifie</strong> — Vous avancez au round suivant. <strong>Elimine</strong> — Votre parcours s'arrete ici. <strong>Gagnant</strong> — Vous etes sur le podium final !
    </Callout>

    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Certificat et primes</h2>
    <p class="text-gray-600 mb-4">Les gagnants (podium) recoivent :</p>
    <ul class="list-disc list-inside text-gray-600 space-y-2 mb-6">
      <li>Un <strong>certificat PDF</strong> officiel telechargeable avec leur rang et score</li>
      <li>La <strong>prime en especes</strong> definie dans le reglement du concours</li>
      <li>Les logos des sponsors apparaissent sur le certificat</li>
    </ul>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
useHead({ title: 'Resultats & classement | Guide Candidat | TEGS-Arena' });
</script>
