<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Calibrer la duree des quiz et questions</h1>
    <p class="text-gray-500 mb-8">Guide pour configurer le chronometre global, les durees individuelles et les bonnes pratiques de timing.</p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Les deux niveaux de chronometre</h2>
    <p class="text-gray-600 text-sm mb-4">
      TEGS-Arena offre deux niveaux de controle du temps : un chronometre <strong>global</strong> (pour tout le module)
      et des durees <strong>individuelles</strong> (par question). Ils interagissent differemment selon le mode d'evaluation.
    </p>

    <DocImage
      src="/screenshots/admin-modules-timer.png"
      alt="Configuration du chronometre global du module"
      caption="Le chronometre global se configure dans les parametres du module, onglet Chronometre."
      placeholder="Capture de l'onglet Chronometre dans les parametres du module" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Niveau</th><th class="text-left py-2">Ou configurer</th><th class="text-left py-2">Comportement</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">Chronometre global</td>
            <td class="py-2 text-gray-500">Parametres du module > Chronometre</td>
            <td class="py-2 text-gray-500">Temps total pour tout le quiz. A l'expiration, le quiz est soumis automatiquement.</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">Duree par question</td>
            <td class="py-2 text-gray-500">Champ "Duree (min)" dans chaque bloc question</td>
            <td class="py-2 text-gray-500">Temps alloue pour chaque question. Utilise en mode Concours pour l'avancement automatique.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Chronometre global</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Configuration</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Valeur</th><th class="text-left py-2">Effet</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">0 (defaut)</td>
            <td class="py-2 text-gray-500">Le systeme calcule automatiquement la duree totale en additionnant les durees individuelles de chaque question. Si aucune question n'a de duree, le quiz n'a pas de limite de temps.</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">1 a 600 minutes</td>
            <td class="py-2 text-gray-500">Force une duree fixe. Cette valeur <strong>remplace</strong> le calcul automatique, meme si la somme des questions est differente.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="tip" title="Conseil pratique">
      Si vous avez 20 questions a 1 minute chacune (= 20 min), vous pouvez mettre le chronometre global a <strong>25 minutes</strong> pour laisser une marge de reflexion.
    </Callout>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Affichage candidat</h3>
    <p class="text-gray-600 text-sm mb-4">
      Lors du briefing avant le quiz, le candidat voit :
      <em>"Temps limite : X minutes — le quiz est soumis automatiquement a l'expiration."</em>
      Un compteur a rebours s'affiche pendant tout le quiz.
    </p>
    <DocImage
      src="/screenshots/quiz-timer-candidat.png"
      alt="Timer visible par le candidat pendant le quiz"
      caption="Le candidat voit le temps restant en permanence en haut de l'ecran."
      placeholder="Capture de l'interface candidat avec le compteur a rebours visible" />

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Duree par question</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Ou configurer</h3>
    <p class="text-gray-600 text-sm mb-4">
      Dans le Studio, ouvrez un bloc question (QCM, Vrai/Faux, etc.) et remplissez le champ <strong>Duree (min)</strong>.
      Cette valeur est en <strong>minutes</strong>.
    </p>
    <DocImage
      src="/screenshots/admin-studio-question-duration.png"
      alt="Champ duree dans un bloc question QCM"
      caption="Le champ Duree est disponible dans chaque bloc question, a cote du champ Points."
      placeholder="Capture d'un bloc QCM ouvert avec les champs points et duree visibles" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Comment la duree est utilisee</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Mode</th><th class="text-left py-2">Utilisation de la duree par question</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">Personnalise</td>
            <td class="py-2 text-gray-500">Sert uniquement au calcul automatique du chronometre global (somme des durees). Le candidat navigue librement entre les questions.</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">Live + Mode Concours</td>
            <td class="py-2 text-gray-500">Chaque question apparait individuellement avec son propre compteur a rebours. A l'expiration, la question est verrouillee et le systeme passe a la suivante automatiquement.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="warning" title="Duree par defaut">
      Si une question n'a pas de duree definie, le systeme utilise <strong>1 minute</strong> par defaut en mode Concours.
      Pensez toujours a definir une duree pour chaque question.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Mode Concours : le rythme serveur</h2>
    <p class="text-gray-600 text-sm mb-4">
      En mode Concours (Live + contestMode active), le serveur controle l'avancement :
    </p>
    <DocImage
      src="/screenshots/admin-live-contest-timer.png"
      alt="Timer circulaire en mode concours"
      caption="En mode concours, un timer circulaire avec synchronisation serveur gere le rythme."
      placeholder="Capture du timer circulaire sur l'ecran candidat en mode concours" />

    <StepByStep :steps="[
      { title: 'Compte a rebours 3...2...1', description: 'Le professeur lance le concours. Un decompte de 3 secondes s\'affiche pour tous.' },
      { title: 'Question affichee', description: 'La question apparait simultanement pour tous les candidats avec son timer individuel.' },
      { title: 'Timer tourne', description: 'Le serveur envoie un tick chaque seconde. Le timer est synchronise avec le serveur pour compenser la latence reseau.' },
      { title: 'Temps ecoule', description: 'La question est verrouillee. Les statistiques de reponses s\'affichent (% bonnes reponses).' },
      { title: 'Revele de la reponse', description: 'La bonne reponse, l\'explication et la distribution des choix s\'affichent.' },
      { title: 'Question suivante', description: 'Apres un court delai, la question suivante apparait. Le professeur peut aussi forcer l\'avancement.' },
    ]" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Compensation de latence</h3>
    <p class="text-gray-600 text-sm mb-4">
      Le timer utilise un systeme de <strong>synchronisation serveur</strong> : chaque tick contient un timestamp.
      Le client calcule le decalage reseau et ajuste l'affichage pour que tous les candidats voient le meme temps restant,
      meme avec des connexions de vitesse differente.
    </p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Bonnes pratiques de calibrage</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Durees recommandees par type de question</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Type</th><th class="text-left py-2">Facile</th><th class="text-left py-2">Moyen</th><th class="text-left py-2">Difficile</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">QCM / QCU</td><td class="py-2 text-gray-500">30 sec</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">1.5 min</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Vrai / Faux</td><td class="py-2 text-gray-500">15 sec</td><td class="py-2 text-gray-500">30 sec</td><td class="py-2 text-gray-500">45 sec</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Numerique</td><td class="py-2 text-gray-500">30 sec</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">2 min</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Texte a trous</td><td class="py-2 text-gray-500">30 sec</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">1.5 min</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Appariement</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">1.5 min</td><td class="py-2 text-gray-500">2 min</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Sequence</td><td class="py-2 text-gray-500">45 sec</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">2 min</td></tr>
          <tr><td class="py-2 font-medium">Reponse courte</td><td class="py-2 text-gray-500">1 min</td><td class="py-2 text-gray-500">2 min</td><td class="py-2 text-gray-500">3 min</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Formules de calibrage</h3>
    <div class="bg-white rounded-xl border p-6 mb-6 space-y-4">
      <div class="border-l-4 border-blue-400 pl-4">
        <div class="font-bold text-gray-800 text-sm">Quiz rapide (type TV show)</div>
        <p class="text-xs text-gray-500 mt-1">20-30 questions QCM, 30 sec chacune = <strong>10-15 min total</strong></p>
        <p class="text-xs text-gray-400">Mode Concours recommande pour le suspense</p>
      </div>
      <div class="border-l-4 border-green-400 pl-4">
        <div class="font-bold text-gray-800 text-sm">Examen standard</div>
        <p class="text-xs text-gray-500 mt-1">30-50 questions mixtes, 1 min en moyenne = <strong>30-50 min total</strong></p>
        <p class="text-xs text-gray-400">Ajoutez 10-15% de marge au chronometre global</p>
      </div>
      <div class="border-l-4 border-amber-400 pl-4">
        <div class="font-bold text-gray-800 text-sm">Concours eliminatoire</div>
        <p class="text-xs text-gray-500 mt-1">15-25 questions, 45 sec en moyenne = <strong>12-20 min total</strong></p>
        <p class="text-xs text-gray-400">Le chronometre serre favorise les candidats qui connaissent la matiere</p>
      </div>
    </div>

    <Callout type="tip" title="Regle d'or">
      Testez vous-meme le quiz avant le jour J. Si vous mettez plus de temps qu'un candidat moyen, augmentez les durees.
      Les candidats sous pression mettent generalement <strong>20% de temps en plus</strong> qu'en conditions normales.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Departage en cas d'egalite</h2>
    <p class="text-gray-600 text-sm mb-4">
      Le systeme classe les candidats selon deux criteres :
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <ol class="list-decimal pl-6 text-sm text-gray-600 space-y-2">
        <li><strong>Score</strong> — le pourcentage de bonnes reponses (decroissant)</li>
        <li><strong>Duree</strong> — le temps total pris pour completer le quiz (croissant : le plus rapide gagne)</li>
      </ol>
      <p class="text-xs text-gray-400 mt-3">
        La duree est stockee au format ISO 8601 (ex: PT1M30S = 1 min 30 sec) pour une precision a la seconde.
      </p>
    </div>

    <Callout type="warning" title="Impact sur la strategie">
      Informez les candidats que la vitesse compte en cas d'egalite ! Cela evite les surprises lors du classement final.
      Le reglement public l'indique automatiquement.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Calibrage duree quiz | Guide Admin | TEGS-Arena' });
</script>
