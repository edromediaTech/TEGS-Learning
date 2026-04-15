Document de Spécifications : Les 10 Sprints de TEGS-Learning
Ce document sert de guide de mission pour les agents autonomes. Chaque sprint doit aboutir à un livrable fonctionnel et testable.

🏗️ PHASE 1 : INFRASTRUCTURE & LRS (LE SOCLE)
Sprint 1 : Authentification & Multi-tenant
Objectif : Créer l'environnement de base sécurisé et segmenté.

Responsabilité de l'Agent : Setup Node.js/Express, MongoDB, JWT et logique de filtrage par tenant_id (ID École).

Critère de succès : Un utilisateur peut se connecter et ne voir que les données de son école.

![Page de connexion multi-tenant](captures/01-login-page.png)

Sprint 2 : Moteur xAPI & Validation
Objectif : Transformer le backend en un réceptacle de données d'apprentissage.

Responsabilité de l'Agent : Implémentation des routes /statements (GET/POST) conformes à la norme xAPI.

Critère de succès : Le LRS accepte et stocke un "Statement" (ex: "Élève X a complété le Module Y").

![Dashboard analytique montrant les données xAPI collectées](captures/10-analytics-dashboard.png)

🎨 PHASE 2 : OUTIL AUTEUR / LCMS (LA CRÉATION)
Sprint 3 : Gestionnaire de Modules
Objectif : Créer l'interface de gestion des contenus.

Responsabilité de l'Agent : CRUD des modules (Nuxt 3) et définition de l'arborescence (Sections/Écrans).

Critère de succès : Pouvoir créer un nouveau cours "Mathématiques" et y ajouter des chapitres.

![Éditeur de modules LCMS](captures/05-module-editor.png)

Sprint 4 : Builder de Blocs & Preview
Objectif : Permettre l'édition visuelle du contenu.

Responsabilité de l'Agent : Création des composants UI (Texte, Vidéo, Quiz) et du mode "Aperçu".

Critère de succès : Un enseignant peut glisser une vidéo et un quiz dans un écran et voir le rendu final.

![Aperçu du builder de blocs et mode preview](captures/05-module-editor.png)

📡 PHASE 3 : MOTEUR CMI5 (LE STANDARD)
Sprint 5 : Launch Service & Manifest XML
Objectif : Rendre le contenu compatible avec les standards internationaux.

Responsabilité de l'Agent : Générateur de fichier cmi5.xml et protocole de lancement (URL + Token).

Critère de succès : Le système génère un package que n'importe quel LMS cmi5 pourrait identifier.

![Module de formation avec structure cmi5](captures/03-tournament-management.png)

Sprint 6 : Runtime Tracking JS
Objectif : Connecter le comportement de l'élève au LRS.

Responsabilité de l'Agent : Script de tracking injecté qui envoie les verbes Initialized, Passed, Failed.

Critère de succès : Quand un élève finit un quiz dans le lecteur, le score remonte automatiquement en base de données.

![Interface de quiz avec suivi des scores en temps réel](captures/08-mobile-warroom.png)

☁️ PHASE 4 : CLOUD GCP & MÉDIAS (LA PERFORMANCE)
Sprint 7 : Cloud Storage & Sécurité
Objectif : Externaliser et sécuriser les fichiers lourds.

Responsabilité de l'Agent : Intégration Google Cloud Storage et génération d'URLs signées (Signed URLs).

Critère de succès : Les vidéos sont stockées sur GCP et ne sont accessibles qu'aux élèves connectés.

![Gestion des médias sur le cloud](captures/02-admin-dashboard.png)

Sprint 8 : Déploiement & Optimisation
Objectif : Mettre la plateforme en ligne pour le Nord-Est.

Responsabilité de l'Agent : Dockerisation, Cloud Run et configuration du CDN pour réduire la latence.

Critère de succès : La plateforme est accessible via une URL publique avec un temps de chargement < 2s.

![Dashboard administrateur](captures/02-admin-dashboard.png)

📱 PHASE 5 : CONVERGENCE & ANALYTICS (L'INTELLIGENCE)
Sprint 9 : Bridge Mobile & Desktop
Objectif : Unifier l'écosystème DDENE.

Responsabilité de l'Agent : API de synchronisation pour SIGEEE-Desktop et Inspect-mobile.

Critère de succès : Les résultats des tablettes offline sont synchronisés au serveur une fois la connexion rétablie.

![Interface mobile de synchronisation et supervision](captures/15-supervisor-scanner.png)

Sprint 10 : Analytics Dashboard
Objectif : Fournir des outils de décision à la DDENE.

Responsabilité de l'Agent : Tableaux de bord visuels (KPIs, graphiques de réussite par école).

Critère de succès : L'inspecteur peut voir en un coup d'œil quelles écoles ont les meilleurs taux de réussite.

![Dashboard Analytics et Reporting](captures/10-analytics-dashboard.png)