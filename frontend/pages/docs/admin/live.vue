<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Piloter le live d'un concours</h1>
    <p class="text-gray-500 mb-8">Demarrer les rounds, suivre le bracket en direct, diffuser sur ecran/OBS et generer les certificats.</p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Jour du concours : procedure pas a pas</h2>
    <StepByStep :steps="[
      { title: 'Verifier les inscriptions', description: 'Consultez l\'onglet Participants pour verifier les inscrits et les paiements confirmes.' },
      { title: 'Demarrer le Round 1', description: 'Dans l\'onglet Bracket, cliquez Demarrer Round 1. Le statut passe a LIVE.' },
      { title: 'Suivre en direct', description: 'Le bracket se met a jour en temps reel automatiquement. Les scores apparaissent au fur et a mesure.' },
      { title: 'Attendre les soumissions', description: 'Les candidats passent le quiz avec leur badge TKT-XXX. Suivez l\'avancement dans le bracket.' },
      { title: 'Cloturer et qualifier', description: 'Cliquez Cloturer & Qualifier. Le systeme classe automatiquement et qualifie les Top X.' },
      { title: 'Repeter pour chaque round', description: 'Demarrez le round suivant. Les elimines ne peuvent plus participer.' },
      { title: 'Podium et certificats', description: 'Apres le dernier round, le podium s\'affiche. Telechargez les certificats PDF pour les gagnants.' },
    ]" />
    <DocImage
      src="/screenshots/admin-tournament-bracket.png"
      alt="Bracket du tournoi en temps reel"
      caption="Le bracket se met a jour en temps reel. Les scores et qualifications s'affichent automatiquement."
      placeholder="Capture du bracket avec les rounds, scores et statuts en temps reel" />

    <Callout type="warning" title="Irreversible">
      La cloture d'un round et la qualification sont <strong>irreversibles</strong>. Assurez-vous que tous les candidats ont soumis leurs reponses avant de cloturer.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Mode Concours (Live interactif)</h2>
    <p class="text-gray-600 text-sm mb-4">
      Si le module est configure en <strong>mode Concours</strong> (evaluationType: live + contestMode: true),
      le professeur controle l'avancement des questions depuis le tableau de bord :
    </p>
    <DocImage
      src="/screenshots/admin-live-dashboard.png"
      alt="Tableau de bord Live du professeur"
      caption="Le professeur controle le rythme : lancer, pause, avancer, arreter le concours."
      placeholder="Capture du tableau de bord professeur avec les boutons de controle Live" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Action</th><th class="text-left py-2">Effet</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Demarrer le concours</td><td class="py-2 text-gray-500">Compte a rebours 3...2...1, puis la premiere question s'affiche pour tous</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Pause</td><td class="py-2 text-gray-500">Gele le timer de la question en cours</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Reprendre</td><td class="py-2 text-gray-500">Continue le timer la ou il s'est arrete</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Passer la question</td><td class="py-2 text-gray-500">Force l'avancement a la question suivante</td></tr>
          <tr><td class="py-2 font-medium">Arreter</td><td class="py-2 text-gray-500">Termine le concours, affiche les statistiques finales et le classement</td></tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Deroulement d'une question</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <ol class="list-decimal pl-6 text-sm text-gray-600 space-y-2">
        <li><strong>Affichage</strong> — la question apparait avec son timer et ses points</li>
        <li><strong>Reponses</strong> — les candidats repondent en temps reel. Le professeur voit les stats live</li>
        <li><strong>Verrouillage</strong> — a l'expiration du timer, les reponses sont verrouillees</li>
        <li><strong>Revele</strong> — la bonne reponse, l'explication et les statistiques s'affichent (% par choix)</li>
        <li><strong>Classement</strong> — le leaderboard se met a jour avec les nouveaux scores</li>
        <li><strong>Transition</strong> — court delai puis passage a la question suivante</li>
      </ol>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Surveillance en direct</h2>
    <p class="text-gray-600 text-sm mb-4">
      En mode Live, le professeur peut surveiller les candidats :
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Fonctionnalite</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Nombre de connectes</td><td class="py-2 text-gray-500">Compteur en temps reel des candidats connectes</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Demander une photo</td><td class="py-2 text-gray-500">Envoie une demande de snapshot a un candidat ou a tous (si proctoring active)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Flux camera</td><td class="py-2 text-gray-500">Ouvre un flux WebRTC camera/micro d'un candidat specifique</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Spotlight</td><td class="py-2 text-gray-500">Projette la camera d'un candidat sur l'ecran spectateur (Live Arena)</td></tr>
          <tr><td class="py-2 font-medium">Alertes</td><td class="py-2 text-gray-500">Notifications de sortie plein ecran, changement d'onglet, deconnexion</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Diffusion sur ecran / TV</h2>
    <p class="text-gray-600 text-sm mb-4">
      TEGS-Arena propose deux URLs de diffusion publique :
    </p>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">1. Live Tournament (bracket et podium)</h3>
    <div class="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm text-gray-600">
      https://tegslearning.com/live-tournament/[token]
    </div>
    <p class="text-gray-600 text-sm mb-4">
      Affiche le bracket du tournoi, les qualifications en temps reel, le vote du public et le podium final.
      Projetez cette URL sur un ecran ou projecteur pour que le public suive l'avancement.
    </p>
    <DocImage
      src="/screenshots/live-tournament-bracket.png"
      alt="Page Live Tournament avec bracket et scores"
      caption="Le bracket se met a jour en temps reel. Les animations de qualification captent l'attention du public."
      placeholder="Capture de la page live-tournament avec le bracket, scores et animations" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">2. Live Arena (quiz en direct)</h3>
    <div class="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm text-gray-600">
      https://tegslearning.com/live-arena/[shareToken]
    </div>
    <p class="text-gray-600 text-sm mb-4">
      Affiche les questions du quiz en direct avec les statistiques de reponse. Necessite un module avec <code>contestMode: true</code>.
    </p>
    <DocImage
      src="/screenshots/live-arena-spectator.png"
      alt="Vue spectateur Live Arena avec question et leaderboard"
      caption="L'ecran spectateur affiche la question en cours, le leaderboard et les statistiques de reponse."
      placeholder="Capture de la Live Arena avec question, timer, leaderboard et stats de reponse" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Ce que voit le spectateur</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Phase</th><th class="text-left py-2">Affichage</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Attente</td><td class="py-2 text-gray-500">Nombre de participants connectes, classement initial</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Compte a rebours</td><td class="py-2 text-gray-500">Animation 3...2...1 en plein ecran</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Question en cours</td><td class="py-2 text-gray-500">Leaderboard (gauche) + question avec stats live (droite)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Revele</td><td class="py-2 text-gray-500">"Moment de Verite" — reponse correcte, explication, distribution des choix en barres</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Breaking News</td><td class="py-2 text-gray-500">Notifications animees : nouveau leader, entree Top 3, serie parfaite</td></tr>
          <tr><td class="py-2 font-medium">Podium final</td><td class="py-2 text-gray-500">Top 3 avec medailles, scores, puis classement complet</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Diffusion OBS / Streaming</h2>
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Mode Broadcast</h3>
    <div class="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm text-gray-600">
      https://tegslearning.com/live-tournament/[token]/broadcast
    </div>
    <p class="text-gray-600 text-sm mb-4">
      Page optimisee pour OBS Studio et le streaming. Affichage plein ecran avec :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-4">
      <li>Barre superieure fine : titre du tournoi, indicateur LIVE, compteur de participants</li>
      <li>Centre : bracket du tournoi (composant TournamentTree)</li>
      <li>Coin superieur droit : widget "Coup de Coeur du Public" (vote des fans)</li>
      <li>Bas : bandeau defilant des sponsors</li>
      <li>Overlays : breaking news, revele du podium (modal plein ecran)</li>
    </ul>
    <DocImage
      src="/screenshots/live-broadcast-obs.png"
      alt="Page broadcast optimisee pour OBS Studio"
      caption="La page broadcast est optimisee pour OBS : fond transparent, elements animes, plein ecran."
      placeholder="Capture de la page broadcast avec bracket, sponsors et overlay breaking news" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Configuration OBS Studio</h3>
    <StepByStep :steps="[
      { title: 'Ajouter une source Navigateur', description: 'Dans OBS, ajoutez une source de type Navigateur (Browser Source).' },
      { title: 'Configurer l\'URL', description: 'Collez l\'URL broadcast : https://tegslearning.com/live-tournament/[token]/broadcast' },
      { title: 'Definir la resolution', description: 'Largeur : 1920, Hauteur : 1080 (Full HD). Cochez &quot;Rafraichir quand la scene devient active&quot;.' },
      { title: 'Positionner la scene', description: 'Placez la source en plein ecran ou combinez avec d\'autres sources (camera presentateur, etc.).' },
      { title: 'Guide integre', description: 'Appuyez sur la touche I sur la page broadcast pour afficher le guide de configuration.' },
    ]" />

    <Callout type="tip" title="Astuce OBS">
      Appuyez sur la touche <code>I</code> dans la page broadcast pour afficher un guide de configuration integre directement dans le navigateur.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Certificats et podium</h2>
    <p class="text-gray-600 text-sm mb-4">
      Apres le dernier round :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-2 mb-4">
      <li><strong>Podium automatique</strong> — les 3 premiers sont affiches avec medailles sur la page live</li>
      <li><strong>Certificats PDF</strong> — generez et telechargez les certificats pour chaque gagnant</li>
      <li><strong>Classement final</strong> — accessible dans l'onglet Participants avec les scores cumules</li>
    </ul>
    <DocImage
      src="/screenshots/live-tournament-podium.png"
      alt="Podium avec les 3 gagnants et medailles"
      caption="Le podium s'affiche automatiquement apres la cloture du dernier round."
      placeholder="Capture du podium avec les 3 gagnants, medailles, scores et logos sponsors" />

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Resume des URLs</h2>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">URL</th><th class="text-left py-2">Usage</th><th class="text-left py-2">Auth</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">/tournament/[token]</td>
            <td class="py-2 text-gray-500">Page d'inscription candidat</td>
            <td class="py-2 text-gray-400">Public</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">/tournament/[token]/play</td>
            <td class="py-2 text-gray-500">Acces quiz (avec TKT-XXX)</td>
            <td class="py-2 text-gray-400">Badge requis</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">/tournament/[token]/rules</td>
            <td class="py-2 text-gray-500">Reglement du concours</td>
            <td class="py-2 text-gray-400">Public</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">/live-tournament/[token]</td>
            <td class="py-2 text-gray-500">Bracket live + podium</td>
            <td class="py-2 text-gray-400">Public</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 font-mono text-xs">/live-tournament/[token]/broadcast</td>
            <td class="py-2 text-gray-500">Vue OBS / streaming</td>
            <td class="py-2 text-gray-400">Public</td>
          </tr>
          <tr>
            <td class="py-2 font-mono text-xs">/live-arena/[shareToken]</td>
            <td class="py-2 text-gray-500">Quiz live spectateur (TV)</td>
            <td class="py-2 text-gray-400">Public</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="tip" title="Etapes suivantes">
      Consultez aussi :
      <NuxtLink to="/docs/admin/calibrage" class="text-amber-600 underline">Calibrer la duree des quiz</NuxtLink> et
      <NuxtLink to="/docs/admin/modules" class="text-amber-600 underline">Creer un module</NuxtLink>.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Piloter le live | Guide Admin | TEGS-Arena' });
</script>
