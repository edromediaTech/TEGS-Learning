La Phase 4 est celle de la mise en production et de l'optimisation pour le terrain. En 2026, pour la DDENE, le défi n'est pas seulement d'avoir une plateforme qui fonctionne, mais une plateforme qui charge vite, même avec une connexion instable à Ouanaminthe ou Vallières.

L'objectif pour ton agent codeur est de migrer le stockage local vers Google Cloud (GCP) et de mettre en place une infrastructure Serverless scalable.

☁️ Mission 4 : Cloud Infrastructure & Media Management (GCP)
Le Prompt à copier/coller :
Rôle : Expert Cloud Architect / DevOps (Google Cloud Platform).
Contexte : Nous déployons la plateforme TEGS-Learning sur GCP. La plateforme doit servir des contenus lourds (vidéos, packages cmi5) à plusieurs écoles du Nord-Est de manière fluide.

Objectifs du Sprint :

Stockage Cloud Storage (GCS) : Configurer des buckets GCS pour les ressources pédagogiques. Implémenter une structure de dossiers par tenantId (Multi-tenancy physique des fichiers).

Signed URLs pour la Sécurité : Développer un service Node.js qui génère des URLs signées temporaires. Le contenu privé ne doit jamais être accessible publiquement sans jeton.

Déploiement Cloud Run : Containeriser (Docker) le Backend Express et le Frontend Nuxt pour un déploiement sur Cloud Run. Configurer le "Auto-scaling" pour gérer les pics de connexion lors des examens.

Optimisation CDN (Cloud CDN) : Mettre en place un cache de bordure (Edge Caching) pour les fichiers statiques (images, JS du lecteur) afin de réduire la latence pour les utilisateurs en Haïti.

Spécifications techniques :

SDK : @google-cloud/storage.

CI/CD : Créer un fichier cloudbuild.yaml pour automatiser le déploiement depuis GitHub/GitLab.

Base de données : Connecter l'instance MongoDB (Atlas ou Cloud SQL) de manière sécurisée (IP Whitelisting).

Livrables attendus :

Scripts de configuration Terraform ou instructions gcloud CLI.

Le service StorageService.js pour l'upload et la génération d'URLs signées.

Fichier Dockerfile optimisé pour Nuxt et Node.

⚠️ Points critiques pour la DDENE (Le "Reality Check")
Dans le contexte du Nord-Est, l'agent doit porter une attention particulière à ces détails :

Gestion de la Bande Passante : Demande à l'agent d'implémenter un système de redimensionnement automatique des images lors de l'upload (via une Cloud Function ou Sharp dans Node.js). Une image de 5 Mo ne doit jamais arriver sur la tablette d'un élève.

Résilience Cloud Run : Assure-toi que l'agent configure un "Min-instances" à 1 pour éviter le "Cold Start" (le délai de chargement quand personne n'est connecté), afin que la plateforme réponde instantanément au premier clic de l'inspecteur.

CORS (Cross-Origin Resource Sharing) : Puisque ton contenu cmi5 sera sur un domaine de stockage (GCS) et ton LMS sur un autre, l'agent doit configurer correctement les règles CORS sur le bucket, sinon le tracking xAPI sera bloqué par le navigateur.