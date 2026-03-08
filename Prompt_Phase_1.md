C’est parti pour la Phase 1. Ce premier prompt est conçu pour être "injecté" dans un agent codeur (comme Claude 3.5/4, Gemini 1.5 Pro ou un assistant IDE). Il pose les fondations de l'écosystème TEGS-Learning.

🏗️ Mission 1 : Core Backend, Multi-tenancy & LRS xAPI
Le Prompt à copier/coller :
Rôle : Expert Backend Node.js / MongoDB.
Contexte : Nous construisons TEGS-Learning, une plateforme LCMS/LMS pour la DDENE (Direction Départementale d'Éducation du Nord-Est). La plateforme doit être multi-tenant et utiliser le standard cmi5 (basé sur xAPI).

Objectifs du Sprint :

Modélisation Multi-tenant : Créer un schéma Mongoose pour Tenants (écoles), Users (avec rôles : admin_ddene, teacher, student), et Modules (structure JSON du cours).

Moteur LRS (Learning Record Store) : Implémenter une API compatible avec la spécification xAPI (Tin Can). Elle doit permettre de recevoir (POST) et de récupérer (GET) des "Statements".

Sécurité : Middleware d'authentification JWT qui injecte le tenantId dans chaque requête pour garantir l'isolation des données entre les écoles.

Spécifications techniques :

Stack : Node.js, Express, MongoDB (Mongoose).

Format xAPI : Les statements doivent respecter la structure { actor, verb, object, result, context }.

Structure Module : Inspire-toi d'OpenCrea (Modules > Sections > Écrans) pour le schéma JSON.

Livrables attendus :

Le code des modèles Mongoose.

Les routes API pour l'authentification et le LRS.

Un script de test (ou fichier .http) pour valider l'envoi d'un statement xAPI réussi.

💡 Conseils pour superviser l'agent sur cette phase
Puisque tu es en 2026 et que tu connais bien ton écosystème, assure-toi de vérifier ces trois points critiques lors de la génération du code :

L'isolation des données : Vérifie que l'agent n'oublie pas de filtrer chaque requête MongoDB par tenantId. C'est vital pour que l'École de Ouanaminthe ne voie pas les résultats de l'École de Fort-Liberté.

La validation xAPI : Les agents ont tendance à simplifier le format xAPI. Insiste pour qu'il utilise une librairie de validation ou un schéma strict, car cmi5 ne pardonne pas les erreurs de syntaxe dans les verbes.

Connexion GCP : Demande-lui d'utiliser des variables d'environnement (process.env) pour les futures connexions à Google Cloud Storage que nous configurerons en Phase 4.

Une fois que l'agent a terminé la Phase 1 :
Nous pourrons passer à la Phase 2 (L'outil auteur en Nuxt.js), où nous construirons l'interface qui permettra aux formateurs de créer visuellement ces fameux modules.