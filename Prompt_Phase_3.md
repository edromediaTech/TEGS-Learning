La Phase 3 est l'étape la plus technique. C'est ici que l'outil de création (Phase 2) et la base de données (Phase 1) commencent à "parler" le standard cmi5.

L'objectif pour ton agent codeur est de créer la Launch Sequence (Séquence de lancement) et le Tracking Runtime. Sans cela, ton contenu reste une simple page web ; avec cela, il devient un module de formation certifié.

📡 Mission 3 : Moteur cmi5 – Launch Sequence & xAPI Runtime
Le Prompt à copier/coller :
Rôle : Expert Systèmes d'Apprentissage (E-learning Standards Specialist) & Node.js.
Contexte : Nous intégrons le standard cmi5 à la plateforme TEGS-Learning. Le but est de permettre à un utilisateur (élève) de lancer un module et que ses progrès soient suivis via xAPI vers notre LRS (créé en Phase 1).

Objectifs du Sprint :

Générateur de Manifest cmi5 : Créer un service qui transforme le JSON du module en un fichier cmi5.xml valide. Ce fichier doit définir les AU (Assignable Units).

Service de Lancement (Launch Service) : Implémenter le "cmi5 Launch Protocol" :

Création d'un fetch URL sécurisé.

Génération d'un token de session unique pour l'apprenant.

Construction de l'URL de lancement incluant l'endpoint LRS et les credentials.

Librairie de Tracking (Runtime JS) : Développer un script léger (tegs-tracker.js) à injecter dans le lecteur de cours. Ce script doit :

Gérer les verbes cmi5 obligatoires : Initialized, Completed, Passed, Failed, Terminated.

Envoyer des "Statements" xAPI au LRS à chaque interaction (score de quiz, temps passé).

Spécifications techniques :

Standard : Respecter strictement la spécification cmi5 "Sandstone".

Communication : Utiliser l'API fetch pour la communication asynchrone entre le contenu et le LRS.

Sécurité : Les jetons de session doivent expirer après la fermeture du module.

Livrables attendus :

Le service Node.js Cmi5Manager.js.

Le script client cmi5-runtime.js pour le tracking.

Une documentation interne expliquant le flux de données entre le LMS, le Contenu et le LRS.

⚖️ Ce que tu dois vérifier (Le "Cmi5 Guardrail")
Le standard cmi5 est plus rigide que xAPI seul. Voici les 3 points que ton agent ne doit pas rater :

L'ordre des verbes : Un module cmi5 DOIT commencer par un Initialized et se terminer par un Terminated. Si l'agent oublie le Terminated (par exemple si l'élève ferme l'onglet brutalement), le score risque de ne pas être enregistré. Demande-lui de gérer l'événement beforeunload.

Le "Mastery Score" : cmi5 permet au LMS de dire au contenu quel est le score minimum pour réussir. Assure-toi que l'agent récupère cette valeur depuis la configuration du module en base de données.

L'isolation du LRS : Le contenu ne doit jamais avoir les clés "Admin" du LRS. Il doit utiliser uniquement le token temporaire généré lors du lancement.