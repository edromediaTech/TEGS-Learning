La Phase 2 est le cœur visuel de TEGS-Learning. C'est ici que l'agent doit transformer ton stack Nuxt 3 / Tailwind CSS en un outil auteur puissant, capable de rivaliser avec l'ergonomie d'OpenCrea tout en préparant l'interactivité cmi5.

Voici le prompt structuré pour ton agent frontend.

🎨 Mission 2 : LCMS Nuxt.js – Outil Auteur & Système de Templates
Le Prompt à copier/coller :
Rôle : Expert Frontend Nuxt 3 / Vue.js 3.
Contexte : Nous développons l'interface auteur de TEGS-Learning. L'objectif est de permettre aux concepteurs pédagogiques de la DDENE de créer des modules de formation multimédias sans coder.

Objectifs du Sprint :

Dashboard de Gestion : Créer une vue pour lister, créer et éditer des modules (avec métadonnées : Titre, École/Tenant, Description).

Éditeur de Structure (Tree-view) : Implémenter une barre latérale permettant de gérer la hiérarchie : Module > Sections > Écrans.

Système de Templates Dynamiques : Créer un moteur de rendu de "blocs" (Canvas). Un écran doit pouvoir accueillir différents types de composants :

TextBlock : Texte riche.

MediaBlock : Image ou Vidéo (interfaçable avec Google Cloud Storage).

QuizBlock : Questions QCM ou Vrai/Faux.

Preview Mode : Un bouton permettant de basculer l'écran actuel en mode "Apprenant" pour tester l'interactivité immédiatement.

Spécifications techniques :

Stack : Nuxt 3, Tailwind CSS, Pinia (pour la gestion d'état du module en cours d'édition).

Composants : Utilise des composants réutilisables. Chaque "Écran" est un objet JSON envoyé au Backend (créé en Phase 1).

Drag & Drop : (Optionnel mais recommandé) Utiliser vuedraggable pour réorganiser les sections.

Livrables attendus :

La structure des pages Nuxt (/admin/modules, /admin/edit/[id]).

Le Store Pinia useModuleStore gérant l'état local du JSON du cours.

Au moins 3 composants de blocs (Texte, Image, Quiz) fonctionnels dans l'éditeur.

🛠️ Points de vigilance pour toi (Le Chef de Projet)
Pour que l'agent ne s'éparpille pas, surveille ces éléments lors de la revue de code :

Le format JSON : Assure-toi que la structure générée par le frontend correspond exactement à ce que le backend (Phase 1) attend.

Exemple : Un écran doit avoir une propriété type: 'quiz' et un tableau interactions pour faciliter le futur tracking xAPI.

L'Asset Management : L'agent doit prévoir que les images/vidéos ne sont pas stockées en local, mais proviennent d'URLs (tes futurs buckets GCP).

Réactivité : L'interface doit être fluide. Si l'agent utilise trop de composants lourds, la modification d'un gros module pourrait ramer. Demande-lui d'utiliser le v-model de manière optimisée.