🛠️ Guide de Validation par Sprint
Phase 1 : Le Socle
Sprint 1 : "Peux-tu me montrer que l'utilisateur de l'École A ne peut en aucun cas accéder aux données de l'École B via l'API ?"

![Connexion multi-tenant sécurisée](captures/01-login-page.png)

Sprint 2 : "Fais un test POST sur l'endpoint xAPI et montre-moi que le JSON est bien validé selon la norme 2.0 avant d'être enregistré."

Phase 2 : La Création
Sprint 3 : "Montre-moi la structure du JSON généré pour un module. Est-il assez flexible pour ajouter de nouveaux types d'activités plus tard ?"

Sprint 4 : "En mode Preview, est-ce que les composants sont responsives pour les tablettes utilisées par les inspecteurs de la DDENE ?"

![Builder de blocs et preview](captures/05-module-editor.png)

Phase 3 : Le Standard
Sprint 5 : "Passe le fichier cmi5.xml généré dans un validateur officiel. Est-ce qu'il y a des erreurs de schéma ?"

Sprint 6 : "Si je ferme le navigateur brusquement au milieu d'un quiz, est-ce que le verbe Terminated est bien envoyé au LRS ?"

Phase 4 : Le Cloud
Sprint 7 : "Génère une URL signée pour une vidéo. Est-ce qu'elle expire bien après 1 heure ? Est-ce que le bucket est bien protégé contre l'accès public ?"

Sprint 8 : "Quel est le score de performance (Lighthouse) de la page de cours sur une connexion 3G/4G simulée ?"

![Dashboard admin déployé](captures/02-admin-dashboard.png)

Phase 5 : L'Intelligence
Sprint 9 : "Comment gères-tu les doublons si deux tablettes synchronisent la même activité d'un élève en même temps ?"

Sprint 10 : "Les graphiques sont-ils exportables en PDF pour que l'inspecteur puisse les imprimer pour son rapport hebdomadaire ?"

![Dashboard analytics avec export](captures/10-analytics-dashboard.png)