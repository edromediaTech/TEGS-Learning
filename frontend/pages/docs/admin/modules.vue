<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Creer et configurer un module</h1>
    <p class="text-gray-500 mb-8">Guide complet du Studio : creation de modules, configuration avancee, blocs de contenu et questions.</p>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Qu'est-ce qu'un module ?</h2>
    <p class="text-gray-600 text-sm mb-4">
      Un <strong>module</strong> est un ensemble de contenus et de questions organise en <strong>chapitres</strong> (sections) et <strong>ecrans</strong>.
      Chaque round d'un tournoi est lie a un module. C'est dans le module que vous creez les questions que les candidats devront repondre.
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="text-sm text-gray-500 space-y-2">
        <p><strong>Module</strong> = conteneur principal (titre, langue, theme)</p>
        <p class="pl-4">&#8627; <strong>Chapitre</strong> (section) = groupe logique</p>
        <p class="pl-8">&#8627; <strong>Ecran</strong> (screen) = page de contenu</p>
        <p class="pl-12">&#8627; <strong>Blocs</strong> = texte, images, questions, etc.</p>
      </div>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etape 1 : Creer le module</h2>
    <StepByStep :steps="[
      { title: 'Ouvrir le Studio', description: 'Allez dans le menu Admin > Modules. La liste de vos modules existants s\'affiche.' },
      { title: 'Cliquer sur Creer un module', description: 'Un assistant en 3 etapes s\'ouvre.' },
      { title: 'Nom et langue', description: 'Saisissez le titre du module (ex: &quot;Round 1 — Culture Generale&quot;). Choisissez la langue : Francais, Creole ou Anglais.' },
      { title: 'Theme visuel', description: 'Choisissez un theme de couleurs parmi les 5 disponibles (voir ci-dessous).' },
      { title: 'Confirmer', description: 'Verifiez le resume puis cliquez CREER. Le module est cree en statut brouillon.' },
    ]" />
    <DocImage
      src="/screenshots/admin-modules-create.png"
      alt="Assistant de creation de module en 3 etapes"
      caption="L'assistant de creation : choisissez titre, langue et theme visuel pour votre module."
      placeholder="Capture de l'assistant de creation de module (etapes 1-2-3)" />

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Themes disponibles</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Theme</th><th class="text-left py-2">Couleur</th><th class="text-left py-2">Usage recommande</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">DDENE Officiel</td><td class="py-2"><span class="inline-block w-4 h-4 rounded bg-blue-700 mr-2 align-middle"></span>Bleu</td><td class="py-2 text-gray-500">Concours officiels, examens formels</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Nature</td><td class="py-2"><span class="inline-block w-4 h-4 rounded bg-green-700 mr-2 align-middle"></span>Vert</td><td class="py-2 text-gray-500">Sciences, environnement</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Contraste</td><td class="py-2"><span class="inline-block w-4 h-4 rounded bg-amber-400 mr-2 align-middle"></span>Ambre/Sombre</td><td class="py-2 text-gray-500">Accessibilite, lisibilite maximale</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Ocean</td><td class="py-2"><span class="inline-block w-4 h-4 rounded bg-cyan-600 mr-2 align-middle"></span>Turquoise</td><td class="py-2 text-gray-500">Culture generale, geographie</td></tr>
          <tr><td class="py-2 font-medium">Coucher de soleil</td><td class="py-2"><span class="inline-block w-4 h-4 rounded bg-red-600 mr-2 align-middle"></span>Rouge/Orange</td><td class="py-2 text-gray-500">Evenements speciaux, finales</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etape 2 : Organiser la structure</h2>
    <p class="text-gray-600 text-sm mb-4">
      Apres creation, ouvrez le module et accedez a l'onglet <strong>Structure</strong>. C'est ici que vous creez les chapitres et ecrans.
    </p>
    <DocImage
      src="/screenshots/admin-modules-structure.png"
      alt="Page structure du module avec chapitres et ecrans"
      caption="Organisez vos chapitres et ecrans. Chaque ecran contient des blocs de contenu et questions."
      placeholder="Capture de la page structure avec liste des chapitres et ecrans" />

    <StepByStep :steps="[
      { title: 'Ajouter un chapitre', description: 'Cliquez + Ajouter un chapitre. Donnez-lui un nom (ex: &quot;Geographie&quot;, &quot;Histoire&quot;).' },
      { title: 'Ajouter des ecrans', description: 'Dans chaque chapitre, cliquez + Ajouter un ecran. Un ecran = une page que le candidat verra.' },
      { title: 'Reorganiser', description: 'Utilisez les fleches haut/bas pour reordonner chapitres et ecrans.' },
      { title: 'Acceder au contenu', description: 'Cliquez sur le bouton Contenu d\'un ecran pour ouvrir le Studio (editeur de blocs).' },
    ]" />

    <Callout type="tip" title="Organisation recommandee">
      Pour un concours simple, un seul chapitre avec un seul ecran suffit.
      Pour un examen plus complexe, creez un chapitre par thematique avec plusieurs ecrans de questions.
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Etape 3 : Le Studio (editeur de blocs)</h2>
    <p class="text-gray-600 text-sm mb-4">
      Le Studio est un editeur en <strong>3 colonnes</strong> :
    </p>
    <DocImage
      src="/screenshots/admin-studio-3col.png"
      alt="Studio 3 colonnes : arbre, canvas, palette"
      caption="Le Studio : arbre de navigation (gauche), zone d'edition (centre), palette de blocs (droite)."
      placeholder="Capture du Studio avec les 3 colonnes visibles" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="font-bold text-blue-700 mb-2">Colonne gauche</div>
          <div class="text-blue-600">Arbre du module — naviguez entre chapitres et ecrans sans quitter le Studio.</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="font-bold text-purple-700 mb-2">Colonne centrale (Canvas)</div>
          <div class="text-purple-600">Zone d'edition — vos blocs de contenu s'empilent ici. Glissez-deposez pour reordonner.</div>
        </div>
        <div class="bg-amber-50 rounded-lg p-4">
          <div class="font-bold text-amber-700 mb-2">Colonne droite (Palette)</div>
          <div class="text-amber-600">4 onglets : <strong>Blocs</strong>, <strong>Questions</strong>, <strong>IA</strong>, <strong>Aide</strong>. Cliquez ou glissez un bloc pour l'ajouter.</div>
        </div>
      </div>
    </div>

    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Raccourcis clavier</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Raccourci</th><th class="text-left py-2">Action</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-mono text-xs bg-gray-50 px-2 rounded">Ctrl+S</td><td class="py-2 text-gray-500">Sauvegarder</td></tr>
          <tr class="border-b"><td class="py-2 font-mono text-xs bg-gray-50 px-2 rounded">Ctrl+Z</td><td class="py-2 text-gray-500">Annuler (50 niveaux d'historique)</td></tr>
          <tr class="border-b"><td class="py-2 font-mono text-xs bg-gray-50 px-2 rounded">Ctrl+Y</td><td class="py-2 text-gray-500">Retablir</td></tr>
          <tr class="border-b"><td class="py-2 font-mono text-xs bg-gray-50 px-2 rounded">Suppr</td><td class="py-2 text-gray-500">Supprimer le bloc selectionne</td></tr>
          <tr><td class="py-2 font-mono text-xs bg-gray-50 px-2 rounded">Echap</td><td class="py-2 text-gray-500">Deselectionner / fermer</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Configuration avancee du module</h2>
    <p class="text-gray-600 text-sm mb-4">
      Dans l'onglet <strong>Parametres</strong> du module, vous pouvez configurer le mode d'evaluation, la surveillance, le chronometre et le partage.
    </p>
    <DocImage
      src="/screenshots/admin-modules-settings.png"
      alt="Page parametres du module avec tous les onglets"
      caption="Les parametres du module offrent un controle fin sur le comportement de l'examen."
      placeholder="Capture de la page parametres du module avec les onglets de configuration" />

    <!-- Mode d'evaluation -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Mode d'evaluation</h3>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Mode</th><th class="text-left py-2">Description</th><th class="text-left py-2">Usage</th></tr></thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2 font-medium">Personnalise</td>
            <td class="py-2 text-gray-500">Chaque candidat passe le quiz a son rythme, quand il veut</td>
            <td class="py-2 text-gray-400 text-xs">Entrainement, quiz d'auto-evaluation</td>
          </tr>
          <tr>
            <td class="py-2 font-medium">Live</td>
            <td class="py-2 text-gray-500">Examen synchronise — tous les candidats passent en meme temps avec horaire fixe</td>
            <td class="py-2 text-gray-400 text-xs">Concours officiels, examens surveilles</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="warning" title="Mode Live = Surveillance stricte automatique">
      En mode Live, la surveillance stricte est <strong>automatiquement forcee</strong> : plein ecran, anti-copie, detection de changement d'onglet et soumission automatique en cas de depassement.
    </Callout>

    <!-- Programmation Live -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Programmation horaire (mode Live)</h3>
    <p class="text-gray-600 text-sm mb-4">
      En mode Live, vous devez definir une fenetre d'acces :
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Champ</th><th class="text-left py-2">Description</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Date/heure de debut</td><td class="py-2 text-gray-500">Moment ou l'examen devient accessible aux candidats</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Date/heure de fin</td><td class="py-2 text-gray-500">L'examen se ferme automatiquement — soumission forcee</td></tr>
          <tr><td class="py-2 font-medium">Mode Concours</td><td class="py-2 text-gray-500">Le serveur controle le rythme : les questions apparaissent une par une pour tous les candidats simultanement. Le professeur controle l'avancement depuis le tableau de bord Live.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Surveillance -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Surveillance</h3>
    <DocImage
      src="/screenshots/admin-modules-surveillance.png"
      alt="Configuration de la surveillance du module"
      caption="Choisissez entre surveillance legere ou stricte selon le niveau de securite requis."
      placeholder="Capture des options de surveillance : legere vs stricte" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Option</th><th class="text-left py-2">Legere</th><th class="text-left py-2">Stricte</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Plein ecran force</td><td class="py-2 text-gray-400">Non</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Anti-copie (clic droit, Ctrl+C)</td><td class="py-2 text-gray-400">Non</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Detection changement d'onglet</td><td class="py-2 text-gray-400">Non</td><td class="py-2 text-green-600 font-medium">Oui</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Nombre max d'infractions</td><td class="py-2 text-gray-400">—</td><td class="py-2 text-gray-500">1 a 20 (defaut : 3)</td></tr>
          <tr><td class="py-2 font-medium">Soumission auto si depasse</td><td class="py-2 text-gray-400">—</td><td class="py-2 text-gray-500">Optionnel (active = le quiz est soumis apres X infractions)</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Proctoring -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Proctoring (surveillance biometrique)</h3>
    <p class="text-gray-600 text-sm mb-4">
      Disponible uniquement en mode Live. Permet de surveiller les candidats par camera.
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Mode</th><th class="text-left py-2">Description</th><th class="text-left py-2">Bande passante</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Aucun</td><td class="py-2 text-gray-500">Pas de camera</td><td class="py-2 text-gray-400">—</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Snapshot</td><td class="py-2 text-gray-500">Photos periodiques (toutes les 10s a 2 min)</td><td class="py-2 text-gray-400">Faible — recommande pour Haiti</td></tr>
          <tr><td class="py-2 font-medium">Video</td><td class="py-2 text-gray-500">Flux video continu via WebRTC</td><td class="py-2 text-gray-400">Elevee — connexion stable requise</td></tr>
        </tbody>
      </table>
    </div>

    <Callout type="tip" title="Recommandation pour Haiti">
      Utilisez le mode <strong>Snapshot avec intervalle de 30 secondes</strong> pour un bon equilibre entre surveillance et bande passante limitee.
    </Callout>

    <!-- Chronometre -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Chronometre global</h3>
    <p class="text-gray-600 text-sm mb-4">
      Le chronometre global definit la duree totale du module. Pour un calibrage plus fin par question, consultez le guide
      <NuxtLink to="/docs/admin/calibrage" class="text-amber-600 underline">Calibrer la duree des quiz</NuxtLink>.
    </p>
    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Valeur</th><th class="text-left py-2">Comportement</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">0 (defaut)</td><td class="py-2 text-gray-500">Calcul automatique : somme des durees individuelles de chaque question</td></tr>
          <tr><td class="py-2 font-medium">1 a 600 minutes</td><td class="py-2 text-gray-500">Force une duree globale fixe, quelle que soit la somme des questions</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Partage -->
    <h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">Partage et diffusion</h3>
    <DocImage
      src="/screenshots/admin-modules-share.png"
      alt="Options de partage du module avec lien et QR code"
      caption="Activez le partage public pour generer un lien unique et un QR code."
      placeholder="Capture de l'onglet partage avec toggle, lien public et QR code" />

    <p class="text-gray-600 text-sm mb-4">
      Activez le partage pour obtenir :
    </p>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-1 mb-4">
      <li><strong>Lien public</strong> — partageable sur les reseaux sociaux (ex: <code>https://tegslearning.com/share/abc123</code>)</li>
      <li><strong>Code iframe</strong> — pour integrer le quiz sur un site externe</li>
      <li><strong>QR Code</strong> — genere automatiquement (taille configurable : 200-800px)</li>
    </ul>

    <Callout type="warning" title="Partage en mode Live">
      En mode Live, le lien public ne fonctionne que pendant la fenetre horaire programmee (entre la date de debut et de fin).
    </Callout>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Les 10 blocs de contenu</h2>
    <p class="text-gray-600 text-sm mb-4">
      Ces blocs servent a presenter des informations aux candidats. Ajoutez-les depuis l'onglet <strong>Blocs</strong> de la palette.
    </p>
    <DocImage
      src="/screenshots/admin-studio-palette-blocs.png"
      alt="Palette de blocs de contenu dans le Studio"
      caption="Cliquez sur un bloc ou glissez-le dans le canvas pour l'ajouter."
      placeholder="Capture de l'onglet Blocs de la palette avec les 10 types" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <table class="w-full text-sm">
        <thead><tr class="border-b"><th class="text-left py-2">Bloc</th><th class="text-left py-2">Description</th><th class="text-left py-2">Champs</th></tr></thead>
        <tbody>
          <tr class="border-b"><td class="py-2 font-medium">Titre</td><td class="py-2 text-gray-500">Titre H1, H2 ou H3</td><td class="py-2 text-gray-400 text-xs">Texte, niveau (1-3)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Paragraphe</td><td class="py-2 text-gray-500">Texte libre avec mise en forme</td><td class="py-2 text-gray-400 text-xs">Contenu texte</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Separateur</td><td class="py-2 text-gray-500">Ligne horizontale</td><td class="py-2 text-gray-400 text-xs">Style (solid)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Image</td><td class="py-2 text-gray-500">Image avec legende</td><td class="py-2 text-gray-400 text-xs">URL, alt, legende, taille (plein/moitie/tiers)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Texte + Image</td><td class="py-2 text-gray-500">Cote-a-cote</td><td class="py-2 text-gray-400 text-xs">Texte, URL image, disposition (gauche/droite)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Video</td><td class="py-2 text-gray-500">YouTube ou MP4</td><td class="py-2 text-gray-400 text-xs">URL, legende</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Audio</td><td class="py-2 text-gray-500">Fichier MP3</td><td class="py-2 text-gray-400 text-xs">URL, titre</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">PDF</td><td class="py-2 text-gray-500">Lecteur PDF integre</td><td class="py-2 text-gray-400 text-xs">URL, titre, hauteur (defaut: 500px)</td></tr>
          <tr class="border-b"><td class="py-2 font-medium">Objet integre</td><td class="py-2 text-gray-500">Iframe generique</td><td class="py-2 text-gray-400 text-xs">URL, largeur, hauteur, titre</td></tr>
          <tr><td class="py-2 font-medium">Boite de texte</td><td class="py-2 text-gray-500">Encadre colore et pliable</td><td class="py-2 text-gray-400 text-xs">Variante (info/warning/success/error), titre, contenu, couleurs, pliable</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Les 8 types de questions</h2>
    <p class="text-gray-600 text-sm mb-4">
      Ce sont les blocs d'evaluation. Ajoutez-les depuis l'onglet <strong>Questions</strong> de la palette.
      Chaque question possede un champ <strong>explication</strong> affiche apres correction.
    </p>
    <DocImage
      src="/screenshots/admin-studio-palette-questions.png"
      alt="Palette de blocs de questions dans le Studio"
      caption="8 types de questions disponibles pour vos evaluations."
      placeholder="Capture de l'onglet Questions de la palette avec les 8 types" />

    <div class="bg-white rounded-xl border p-6 mb-6">
      <div class="space-y-6">
        <!-- QCM -->
        <div class="border-l-4 border-blue-400 pl-4">
          <div class="font-bold text-gray-800">QCM / QCU (Choix multiples ou unique)</div>
          <p class="text-sm text-gray-500 mt-1">Posez une question avec plusieurs options. Cochez une ou plusieurs reponses correctes.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : question, options (texte + correct/incorrect), explication, points, duree</div>
        </div>
        <!-- Vrai/Faux -->
        <div class="border-l-4 border-green-400 pl-4">
          <div class="font-bold text-gray-800">Vrai / Faux</div>
          <p class="text-sm text-gray-500 mt-1">Une affirmation que le candidat doit valider ou invalider.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : enonce, reponse (vrai/faux), explication, points, duree</div>
        </div>
        <!-- Numerique -->
        <div class="border-l-4 border-purple-400 pl-4">
          <div class="font-bold text-gray-800">Numerique</div>
          <p class="text-sm text-gray-500 mt-1">Le candidat saisit un nombre. Une tolerance permet d'accepter des reponses proches.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : question, reponse, tolerance (ex: &#177;0.5), unite (ex: km, kg), explication</div>
        </div>
        <!-- Texte a trous -->
        <div class="border-l-4 border-amber-400 pl-4">
          <div class="font-bold text-gray-800">Texte a trous</div>
          <p class="text-sm text-gray-500 mt-1">Un texte avec des espaces blancs (___) que le candidat doit completer.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : texte avec blancs, explication</div>
        </div>
        <!-- Appariement -->
        <div class="border-l-4 border-rose-400 pl-4">
          <div class="font-bold text-gray-800">Appariement</div>
          <p class="text-sm text-gray-500 mt-1">Associer des elements de la colonne gauche a ceux de la colonne droite.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : consigne, paires (gauche/droite), explication</div>
        </div>
        <!-- Sequence -->
        <div class="border-l-4 border-teal-400 pl-4">
          <div class="font-bold text-gray-800">Sequence</div>
          <p class="text-sm text-gray-500 mt-1">Remettre une liste d'elements dans le bon ordre.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : consigne, liste d'elements, explication</div>
        </div>
        <!-- Likert -->
        <div class="border-l-4 border-indigo-400 pl-4">
          <div class="font-bold text-gray-800">Likert (echelle d'opinion)</div>
          <p class="text-sm text-gray-500 mt-1">Question d'opinion avec echelle graduee.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : question, echelle (accord, frequence, satisfaction)</div>
        </div>
        <!-- Reponse courte -->
        <div class="border-l-4 border-orange-400 pl-4">
          <div class="font-bold text-gray-800">Reponse courte</div>
          <p class="text-sm text-gray-500 mt-1">Texte libre avec correction automatique ou manuelle.</p>
          <div class="text-xs text-gray-400 mt-2">Champs : question, reponse attendue, points, duree (min), auto-correction, limite de mots, nb lignes</div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">Sauvegarde et apercu</h2>
    <ul class="list-disc pl-6 text-sm text-gray-600 space-y-2 mb-4">
      <li><strong>Sauvegarde automatique</strong> — 5 secondes apres la derniere modification. Indicateur visible en haut du Studio.</li>
      <li><strong>Sauvegarde manuelle</strong> — <code>Ctrl+S</code> a tout moment.</li>
      <li><strong>Historique</strong> — 50 niveaux d'annulation (<code>Ctrl+Z</code>) et retablissement (<code>Ctrl+Y</code>).</li>
      <li><strong>Mode Apercu</strong> — cliquez <em>Apercu</em> pour voir l'ecran tel que le candidat le verra.</li>
    </ul>

    <Callout type="tip" title="Lier le module a un tournoi">
      Une fois votre module pret, associez-le a un round dans la
      <NuxtLink to="/docs/admin/tournois" class="text-amber-600 underline">configuration du tournoi</NuxtLink>.
      Pour generer des questions automatiquement, consultez le guide
      <NuxtLink to="/docs/admin/ia-quiz" class="text-amber-600 underline">Generation de quiz par IA</NuxtLink>.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
import StepByStep from '~/components/docs/StepByStep.vue';
import DocImage from '~/components/docs/DocImage.vue';
useHead({ title: 'Modules & Studio | Guide Admin | TEGS-Arena' });
</script>
