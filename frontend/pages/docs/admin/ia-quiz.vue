<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Generer des quiz par IA</h1>
    <p class="text-gray-500 mb-8">Utilisez l'intelligence artificielle pour creer des questions en quelques secondes.</p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Presentation</h2>
    <p class="text-gray-600 text-sm mb-4">
      Le generateur IA de TEGS-Arena permet de creer automatiquement des questions de quiz a partir d'un simple sujet.
      Il utilise le modele <strong>Gemini 2.0 Flash</strong> via un service cloud dedie.
      Les questions generees sont directement inserees dans votre module comme des blocs de questions classiques.
    </p>

    <Callout type="tip" title="Gain de temps">
      Generez 50 questions en quelques secondes au lieu de les creer manuellement une par une.
      Vous pouvez ensuite modifier, supprimer ou reordonner les questions generees comme n'importe quel bloc.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Acceder au generateur</h2>
    <StepByStep :steps="[
      { title: 'Ouvrir le Studio', description: 'Allez dans Admin > Modules, ouvrez un module et naviguez vers un ecran.' },
      { title: 'Onglet IA', description: 'Dans la palette de droite, cliquez sur l\'onglet IA (3e onglet).' },
      { title: 'Remplir le formulaire', description: 'Saisissez le sujet et configurez les parametres (voir ci-dessous).' },
      { title: 'Generer', description: 'Cliquez sur le bouton Generer. Patientez quelques secondes.' },
      { title: 'Inserer les questions', description: 'Previsualiser les questions generees, puis inserez-les une par une ou toutes en meme temps.' },
    ]" />
    <DocImage
      src="/screenshots/admin-studio-ia-tab.png"
      alt="Onglet IA du generateur de questions dans le Studio"
      caption="L'onglet IA dans la palette du Studio : saisissez un sujet et configurez les parametres."
      placeholder="Capture de l'onglet IA avec le formulaire de generation (sujet, nb questions, difficulte, langue)" />

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Parametres de generation</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Parametre</th><th class="text-left py-2">Options</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">Sujet / Theme</td>
            <td class="py-2 text-gray-500">Texte libre</td>
            <td class="py-2 text-gray-400 text-xs">Le sujet des questions. Soyez precis pour de meilleurs resultats (ex: "L'independance d'Haiti en 1804" plutot que "Haiti").</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Nombre de questions</td>
            <td class="py-2 text-gray-500">3, 5, 10, 15, 20, 30, 40, 50</td>
            <td class="py-2 text-gray-400 text-xs">Maximum 50 questions par generation. Au-dela de 15, le systeme genere en lots de 15 pour garantir la qualite.</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Difficulte</td>
            <td class="py-2 text-gray-500">Facile, Moyen, Difficile</td>
            <td class="py-2 text-gray-400 text-xs">Influence la complexite des questions et la subtilite des reponses.</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Langue</td>
            <td class="py-2 text-gray-500">Francais, Creole, Anglais, Espagnol</td>
            <td class="py-2 text-gray-400 text-xs">Toutes les questions, options et explications seront dans la langue choisie.</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">Types de questions</td>
            <td class="py-2 text-gray-500">Cases a cocher</td>
            <td class="py-2 text-gray-400 text-xs">Cochez les types souhaites : QCM, Vrai/Faux, Numerique, Texte a trous, Appariement, Sequence. Par defaut : QCM, Vrai/Faux, Texte a trous.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Types de questions generables</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">QCM</div>
          <div>
            <div class="font-medium text-sm">QCM / QCU</div>
            <div class="text-xs text-gray-400">Choix multiples avec options et explication</div>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-xs shrink-0">V/F</div>
          <div>
            <div class="font-medium text-sm">Vrai / Faux</div>
            <div class="text-xs text-gray-400">Affirmation avec reponse et explication</div>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">123</div>
          <div>
            <div class="font-medium text-sm">Numerique</div>
            <div class="text-xs text-gray-400">Calcul avec tolerance et unite</div>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">___</div>
          <div>
            <div class="font-medium text-sm">Texte a trous</div>
            <div class="text-xs text-gray-400">Phrase a completer</div>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 font-bold text-xs shrink-0">&#8596;</div>
          <div>
            <div class="font-medium text-sm">Appariement</div>
            <div class="text-xs text-gray-400">Paires gauche-droite a associer</div>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600 font-bold text-xs shrink-0">1-2-3</div>
          <div>
            <div class="font-medium text-sm">Sequence</div>
            <div class="text-xs text-gray-400">Elements a remettre dans l'ordre</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Inserer les questions generees</h2>
    <DocImage
      src="/screenshots/admin-studio-ia-results.png"
      alt="Questions generees par l'IA avec boutons d'insertion"
      caption="Apres generation, previsualiser chaque question puis inserez-la dans le canvas."
      placeholder="Capture des cartes de questions generees avec boutons Inserer et Tout inserer" />

    <p class="text-gray-600 text-sm mb-4">
      Apres la generation, les questions apparaissent sous forme de cartes de previsualisation :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-2 mb-4">
      <li><strong>Inserer</strong> — ajoute une question individuelle dans le canvas</li>
      <li><strong>Tout inserer</strong> — ajoute toutes les questions d'un coup</li>
    </ul>
    <p class="text-gray-600 text-sm mb-4">
      Les questions inserees deviennent des blocs normaux. Vous pouvez les modifier, reordonner, dupliquer ou supprimer comme n'importe quel autre bloc.
    </p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Bonnes pratiques</h2>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Rediger un bon sujet</h3>
    <div class="bg-white rounded-xl border p-6 mb-6 space-y-3">
      <div class="flex items-start space-x-3">
        <span class="text-red-500 font-bold text-lg">&#10005;</span>
        <div>
          <div class="text-sm font-medium text-gray-700">Trop vague</div>
          <div class="text-xs text-gray-400">"Haiti" — trop large, questions generiques</div>
        </div>
      </div>
      <div class="flex items-start space-x-3">
        <span class="text-green-500 font-bold text-lg">&#10003;</span>
        <div>
          <div class="text-sm font-medium text-gray-700">Precis et contextualise</div>
          <div class="text-xs text-gray-400">"L'independance d'Haiti : causes, acteurs cles, bataille de Vertieres, et consequences pour les Caraibes" — questions riches et variees</div>
        </div>
      </div>
      <div class="flex items-start space-x-3">
        <span class="text-green-500 font-bold text-lg">&#10003;</span>
        <div>
          <div class="text-sm font-medium text-gray-700">Avec niveau cible</div>
          <div class="text-xs text-gray-400">"Les fractions et pourcentages pour eleves de 6e annee fondamentale" — adapte au public</div>
        </div>
      </div>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Conseils d'utilisation</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <ul class="space-y-3 text-sm text-gray-600">
        <li class="flex items-start space-x-2">
          <span class="text-amber-500 font-bold">1.</span>
          <span><strong>Verifiez toujours</strong> — l'IA peut generer des erreurs factuelles. Relisez chaque question et corrigez si necessaire.</span>
        </li>
        <li class="flex items-start space-x-2">
          <span class="text-amber-500 font-bold">2.</span>
          <span><strong>Generez par lots</strong> — generez 10-15 questions a la fois pour une meilleure variete, puis supprimez les moins pertinentes.</span>
        </li>
        <li class="flex items-start space-x-2">
          <span class="text-amber-500 font-bold">3.</span>
          <span><strong>Combinez avec le manuel</strong> — utilisez l'IA comme base, puis ajoutez vos propres questions pour un quiz equilibre.</span>
        </li>
        <li class="flex items-start space-x-2">
          <span class="text-amber-500 font-bold">4.</span>
          <span><strong>Variez les types</strong> — cochez plusieurs types de questions pour un examen plus riche.</span>
        </li>
        <li class="flex items-start space-x-2">
          <span class="text-amber-500 font-bold">5.</span>
          <span><strong>Ajoutez les durees</strong> — apres generation, pensez a configurer les points et durees de chaque question. Voir le guide <NuxtLink to="/docs/admin/calibrage" class="text-amber-600 underline">Calibrage des durees</NuxtLink>.</span>
        </li>
      </ul>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Langues supportees</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl mb-2">&#127467;&#127479;</div>
          <div class="font-medium text-sm">Francais</div>
          <div class="text-xs text-gray-400">Langue par defaut</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl mb-2">&#127469;&#127481;</div>
          <div class="font-medium text-sm">Creole haitien</div>
          <div class="text-xs text-gray-400">Adapte au contexte local</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl mb-2">&#127468;&#127463;</div>
          <div class="font-medium text-sm">Anglais</div>
          <div class="text-xs text-gray-400">Pour concours internationaux</div>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <div class="text-2xl mb-2">&#127466;&#127480;</div>
          <div class="font-medium text-sm">Espagnol</div>
          <div class="text-xs text-gray-400">Caraibes hispanophones</div>
        </div>
      </div>
    </div>

    <Callout type="warning" title="Qualite du creole">
      La qualite des questions en creole haitien depend du modele IA. Nous recommandons de faire relire les questions generees en creole par un locuteur natif avant utilisation en concours officiel.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Resolution de problemes</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Probleme</th><th class="text-left py-2">Solution</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">Message "IA non disponible"</td>
            <td class="py-2 text-gray-500">Le service IA n'est pas configure. Contactez votre administrateur systeme pour configurer GATEWAY_AUTH_TOKEN.</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Erreur apres generation</td>
            <td class="py-2 text-gray-500">Le modele a retourne un format invalide. Reessayez avec un sujet plus precis ou moins de questions.</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-medium">Questions de mauvaise qualite</td>
            <td class="py-2 text-gray-500">Soyez plus precis dans le sujet. Ajoutez le contexte, le niveau et les themes specifiques.</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">Generation lente (>30s)</td>
            <td class="py-2 text-gray-500">Normal pour 30+ questions — le systeme genere en lots de 15 pour garantir la qualite.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Generation quiz par IA | Guide Admin | TEGS-Arena' });
</script>
