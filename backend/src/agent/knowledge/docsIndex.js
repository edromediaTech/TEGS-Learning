/**
 * Index de la base de connaissances documentation TEGS-Learning.
 *
 * Chaque entree contient :
 *   - id: identifiant unique
 *   - title: titre du document
 *   - scope: 'public' (visible par tous) ou 'internal' (auth requise)
 *   - audience: roles cibles ('candidat', 'agent', 'sponsor', 'admin', 'all')
 *   - keywords: mots-cles pour la recherche
 *   - content: contenu textuel
 *
 * IMPORTANT : aucun jargon technique dans les contenus (pas de LLM, API,
 * JWT, MongoDB, WebSocket, RBAC, etc.). Langage accessible a tous.
 */

const DOCS_INDEX = [
  // ══════════════════════════════════════════════════════════════
  // PLATEFORME — Presentation generale
  // ══════════════════════════════════════════════════════════════
  {
    id: 'plateforme-presentation',
    title: 'Qu\'est-ce que TEGS-Learning ?',
    scope: 'public',
    audience: 'all',
    keywords: ['tegs', 'plateforme', 'presentation', 'quoi', 'comment', 'fonctionnement', 'lcms', 'lms', 'apprentissage'],
    content: `TEGS-Learning est une plateforme educative complete pour Haiti, concue pour la DDENE (Direction Departementale d'Education du Nord-Est). Elle offre :
- Des concours academiques en ligne (TEGS-Arena) avec rounds eliminatoires, primes et certificats
- Un studio de creation de contenu pedagogique (modules, cours, quiz interactifs)
- Un systeme de suivi de progression pour les eleves et enseignants
- Un mode competition en direct avec spectateurs et diffusion TV
- Un assistant intelligent pour aider chaque utilisateur selon son role
- Un reseau d'agents collecteurs pour les paiements en personne
- Une mediatheque pour stocker images, videos et documents
- Des exports PDF et Excel pour les rapports administratifs
- Un tableau de bord analytique avec indicateurs de performance
- Le tout accessible sur ordinateur, tablette et telephone`,
  },
  {
    id: 'organisations',
    title: 'Organisations et isolation des donnees',
    scope: 'public',
    audience: 'all',
    keywords: ['organisation', 'ecole', 'etablissement', 'tenant', 'isolation', 'donnees', 'multi'],
    content: `TEGS-Learning est multi-organisations : chaque ecole ou institution a son espace independant.
- Chaque organisation a ses propres utilisateurs, modules, tournois et donnees
- Les donnees sont completement isolees : impossible d'acceder aux informations d'une autre organisation
- Un SuperAdmin peut gerer plusieurs organisations depuis un seul compte
- Chaque organisation choisit son plan d'abonnement (Gratuit, Individuel, Etablissement, Pro)
- Le code organisation est requis a la connexion pour identifier votre etablissement`,
  },
  {
    id: 'roles-utilisateurs',
    title: 'Les 5 roles utilisateur',
    scope: 'public',
    audience: 'all',
    keywords: ['role', 'utilisateur', 'admin', 'enseignant', 'candidat', 'agent', 'superadmin', 'permission', 'acces'],
    content: `Il y a 5 roles sur la plateforme, chacun avec des permissions differentes :
1. SuperAdmin — Acces total a toutes les organisations. Cree des etablissements et des administrateurs.
2. Administrateur (Admin DDENE) — Gere son organisation : tournois, modules, utilisateurs, sponsors, rapports.
3. Enseignant — Cree et modifie des modules pedagogiques et des quiz. Peut gerer les tournois de son organisation.
4. Candidat (Eleve) — S'inscrit aux concours, passe les quiz, consulte ses resultats et certificats.
5. Agent collecteur — Encaisse les paiements en personne, suit ses commissions et son quota.`,
  },

  // ══════════════════════════════════════════════════════════════
  // INSCRIPTION & PAIEMENT
  // ══════════════════════════════════════════════════════════════
  {
    id: 'inscription',
    title: 'Comment s\'inscrire a un concours',
    scope: 'public',
    audience: 'candidat',
    keywords: ['inscription', 'inscrire', 'formulaire', 'concours', 'email', 'telephone', 'lobby'],
    content: `Pour s'inscrire a un concours TEGS-Arena :
1. Rendez-vous sur la page d'accueil (Lobby). Les concours ouverts aux inscriptions sont affiches avec un badge bleu "Inscriptions".
2. Cliquez sur la carte du concours. Le modal d'inscription s'ouvre avec 3 onglets : Candidat, Sponsor, Offrir des places.
3. Remplissez le formulaire : prenom, nom, email, telephone, etablissement. Tous les champs marques * sont obligatoires.
4. Code de parrainage (optionnel) : si un sponsor a paye vos frais, entrez le code BOURSE-XXX fourni.
5. Paiement : choisissez MonCash ou Natcash. Le systeme genere un lien de paiement securise.
6. Apres paiement valide, vous recevez un ticket numerique (TKT-XXX) avec un QR code.`,
  },
  {
    id: 'paiement',
    title: 'Paiement et methodes acceptees',
    scope: 'public',
    audience: 'candidat',
    keywords: ['paiement', 'moncash', 'natcash', 'prix', 'frais', 'gratuit', 'bourse', 'argent', 'gourde', 'HTG'],
    content: `TEGS-Arena accepte les paiements via MonCash et Natcash, les deux principales plateformes de mobile money en Haiti.
Si le concours est gratuit, aucun paiement n'est requis.
Vous pouvez aussi utiliser un code BOURSE (format BOURSE-XXX) fourni par un sponsor pour une inscription gratuite ou a tarif reduit.
Les agents collecteurs (points de vente) peuvent aussi encaisser les frais en personne.
Apres paiement valide, votre statut passe a "Paye" et vous recevez votre ticket TKT-XXX.`,
  },
  {
    id: 'badge-qr',
    title: 'Votre badge numerique et QR code',
    scope: 'public',
    audience: 'candidat',
    keywords: ['badge', 'qr', 'code', 'ticket', 'TKT', 'verification', 'scanner'],
    content: `Apres inscription et paiement, vous recevez un badge numerique :
- Format : TKT-XXXXXX (6 caracteres)
- Contient un QR code scannable pour verification rapide
- Prouve que votre inscription et paiement sont valides
- Presentez-le le jour du concours (sur votre telephone ou imprime)
- Les organisateurs scannent votre QR pour vous identifier
- Des QR codes sont aussi generes pour les modules partages et les liens de diffusion`,
  },

  // ══════════════════════════════════════════════════════════════
  // QUIZ & CONCOURS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'quiz-candidat',
    title: 'Passer le quiz du concours',
    scope: 'public',
    audience: 'candidat',
    keywords: ['quiz', 'examen', 'questions', 'reponse', 'temps', 'chronometre', 'plein ecran', 'elimination'],
    content: `Le jour du concours :
1. Connectez-vous et allez sur la page du tournoi. Entrez votre code TKT-XXX.
2. Le quiz se deroule en mode plein ecran obligatoire. Si vous quittez le plein ecran, vous serez elimine.
3. Chaque question a un temps limite affiche en haut. Quand le temps expire, votre reponse est soumise automatiquement.
4. Types de questions : choix multiples, vrai/faux, numerique, texte a trous, association, classement, echelle de satisfaction, reponse ouverte.
5. Votre score est calcule en temps reel. Plus vous repondez vite et correctement, plus votre score est eleve.
6. A la fin du round, les meilleurs candidats sont qualifies pour le round suivant.`,
  },
  {
    id: 'resultats',
    title: 'Consulter les resultats et classements',
    scope: 'public',
    audience: 'candidat',
    keywords: ['resultats', 'classement', 'score', 'note', 'podium', 'qualifie', 'elimine', 'certificat'],
    content: `Les resultats sont publies en temps reel apres chaque round :
- Le classement montre votre rang, score, pourcentage et temps de reponse.
- Les candidats qualifies pour le round suivant sont marques en vert.
- Les candidats elimines sont marques en rouge.
- Le podium final (top 3) est affiche avec les primes a la fin du dernier round.
- Vous pouvez telecharger un certificat PDF de participation ou de reussite.
- Les commentaires personnalises de remediation sont disponibles pour chaque candidat.`,
  },
  {
    id: 'tournois-presentation',
    title: 'Qu\'est-ce qu\'un tournoi TEGS-Arena',
    scope: 'public',
    audience: 'all',
    keywords: ['tournoi', 'concours', 'competition', 'round', 'elimination', 'prime', 'prix'],
    content: `Un tournoi TEGS-Arena est un concours academique en ligne avec rounds eliminatoires :
- Plusieurs rounds configurables : Eliminatoire, Demi-finale, Finale
- A chaque round, les X meilleurs candidats sont qualifies
- Les questions sont creees dans le Studio ou generees automatiquement
- Des primes peuvent etre attribuees au podium (1er, 2e, 3e)
- Les sponsors peuvent financer des places gratuites via des codes BOURSE
- Le tout se deroule en ligne, accessible depuis un ordinateur ou telephone
- Les spectateurs peuvent suivre en direct via un lien de diffusion`,
  },
  {
    id: 'anti-triche',
    title: 'Securite et anti-triche',
    scope: 'public',
    audience: 'all',
    keywords: ['triche', 'securite', 'surveillance', 'plein ecran', 'camera', 'equite', 'proctoring'],
    content: `TEGS-Arena utilise plusieurs mecanismes anti-triche pour garantir l'equite :
- Mode plein ecran obligatoire : quitter = elimination immediate
- Surveillance du focus : les changements d'onglet/fenetre sont detectes et signales
- Capture camera : les organisateurs peuvent activer des captures automatiques
- Chronometre force : les questions sont verrouillees a expiration, pas de temps supplementaire
- Correction automatique : zero erreur humaine, tous les candidats sont evalues de maniere identique
- Classement en temps reel : transparence totale sur les resultats
- Indice de fraude calcule automatiquement (alertes, changements de focus, etc.)`,
  },
  {
    id: 'bourses-sponsors',
    title: 'Systeme de bourses et sponsors',
    scope: 'public',
    audience: 'all',
    keywords: ['bourse', 'sponsor', 'gratuit', 'code', 'BOURSE', 'parrainage', 'partenaire', 'pack'],
    content: `Les sponsors sont des organisations ou individus qui financent la participation de candidats :
- Ils achetent des packs de bourses (ex: 50 places gratuites)
- Chaque bourse genere un code unique : BOURSE-XXXXXX
- Le candidat entre ce code lors de l'inscription pour ne pas payer
- Le sponsor voit les statistiques de ses candidats sponsorises (taux de reussite, etc.)
- Tiers disponibles : Bronze, Silver, Gold, Diamond (avec visibilite croissante)
- Les logos des sponsors apparaissent sur la page du tournoi et le live`,
  },
  {
    id: 'vote-popularite',
    title: 'Vote du public et popularite',
    scope: 'public',
    audience: 'all',
    keywords: ['vote', 'voter', 'popularite', 'public', 'favori', 'coeur', 'supporter'],
    content: `Le systeme de vote permet au public de soutenir ses candidats preferes :
- N'importe qui peut voter pour un candidat d'un tournoi en cours
- 1 vote par personne par heure (pour eviter les abus)
- Le classement des votes est affiche sur la page du tournoi
- Le candidat le plus vote recoit le prix "Coup de Coeur du Public"
- Les votes sont mis a jour en temps reel sur l'ecran de diffusion`,
  },

  // ══════════════════════════════════════════════════════════════
  // LIVE & DIFFUSION
  // ══════════════════════════════════════════════════════════════
  {
    id: 'live-direct',
    title: 'Suivre un concours en direct',
    scope: 'public',
    audience: 'all',
    keywords: ['live', 'direct', 'spectateur', 'leaderboard', 'arena', 'diffusion', 'tv', 'projecteur'],
    content: `Le mode Live permet de suivre un concours en temps reel :
- Les spectateurs voient le bracket (tableau eliminatoire), les scores et le podium en direct
- La page Arena est optimisee pour l'affichage TV/projecteur (compatible avec les logiciels de streaming)
- Des alertes apparaissent quand un candidat entre dans le top 3 ("Breaking News")
- Les statistiques par etablissement scolaire sont affichees en direct
- Plusieurs themes visuels sont disponibles : officiel, nature, contraste, ocean, coucher de soleil
- Le score et le classement se mettent a jour automatiquement sans recharger la page`,
  },
  {
    id: 'file-attente',
    title: 'File d\'attente virtuelle',
    scope: 'public',
    audience: 'candidat',
    keywords: ['file', 'attente', 'queue', 'waiting', 'room', 'patientez', 'position'],
    content: `Quand un concours a beaucoup de candidats, une file d'attente virtuelle peut etre activee :
- Vous voyez votre position dans la file et le temps d'attente estime
- Une barre de progression indique l'avancement
- L'acces au quiz est accorde automatiquement quand c'est votre tour
- Les administrateurs peuvent forcer l'acces pour des candidats specifiques
- La capacite et les parametres de la file sont configurables par l'administrateur`,
  },

  // ══════════════════════════════════════════════════════════════
  // STUDIO & CONTENU PEDAGOGIQUE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'studio-modules',
    title: 'Creer du contenu dans le Studio',
    scope: 'internal',
    audience: 'admin',
    keywords: ['module', 'cours', 'contenu', 'studio', 'creer', 'lecon', 'pedagogique', 'editeur'],
    content: `Le Studio est l'editeur de contenu pedagogique de TEGS-Learning :
- Un module est un ensemble de contenus organise en sections (chapitres) et ecrans
- Chaque ecran contient des blocs : texte, image, video, audio, PDF, integration web
- L'editeur est visuel (glisser-deposer) avec 3 colonnes : navigation, canvas, palette
- Vous pouvez reorganiser les blocs, les dupliquer, les supprimer
- Annulation/retablissement illimite (Ctrl+Z / Ctrl+Y)
- Sauvegarde automatique apres 5 secondes d'inactivite
- Les modules peuvent etre publies, mis en brouillon ou partages via un lien public`,
  },
  {
    id: 'types-questions',
    title: 'Types de questions disponibles',
    scope: 'internal',
    audience: 'admin',
    keywords: ['question', 'quiz', 'qcm', 'vrai', 'faux', 'numerique', 'trous', 'association', 'sequence', 'likert', 'type'],
    content: `Le Studio propose 8 types de questions :
1. Choix multiples (QCM/QCU) — une ou plusieurs bonnes reponses parmi les options
2. Vrai/Faux — deux options, une seule correcte
3. Numerique — l'eleve entre un nombre, tolerance configurable
4. Texte a trous — completer des phrases avec les mots manquants
5. Association (matching) — relier des elements de deux colonnes
6. Classement (sequence) — remettre des elements dans le bon ordre
7. Echelle de satisfaction (Likert) — notation de 1 a 5 etoiles
8. Reponse ouverte — texte libre, correction manuelle
Chaque question a un nombre de points et un temps limite configurable.`,
  },
  {
    id: 'generation-ia-questions',
    title: 'Generation automatique de questions',
    scope: 'internal',
    audience: 'admin',
    keywords: ['generer', 'automatique', 'intelligence', 'sujet', 'difficulte', 'questions'],
    content: `L'assistant peut generer automatiquement des questions de quiz :
- Selectionnez un sujet (ex: "Mathematiques 3eme secondaire"), le nombre de questions et le niveau de difficulte
- Le systeme genere des questions avec les bonnes reponses en quelques secondes
- Les questions generees sont ajoutees directement dans votre module comme des blocs classiques
- Vous pouvez modifier, supprimer ou reordonner les questions generees
- Generez 50 questions en quelques secondes au lieu de les creer manuellement
- La consommation depend de votre plan d'abonnement`,
  },
  {
    id: 'partage-modules',
    title: 'Partager un module via un lien public',
    scope: 'internal',
    audience: 'admin',
    keywords: ['partager', 'lien', 'public', 'share', 'embed', 'integration', 'site', 'externe'],
    content: `Chaque module peut etre partage via un lien public :
- Un lien unique est genere (format : /share/TOKEN)
- N'importe qui avec le lien peut passer le quiz sans creer de compte
- Les resultats des visiteurs sont enregistres avec leur nom et email
- Le module partage peut etre integre sur un site externe (iframe)
- Un QR code est genere automatiquement pour chaque lien de partage
- Ideal pour distribuer un quiz par email, WhatsApp ou sur les reseaux sociaux`,
  },

  // ══════════════════════════════════════════════════════════════
  // AGENTS POS & COLLECTE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'agent-collecte',
    title: 'Guide de collecte pour les agents',
    scope: 'internal',
    audience: 'agent',
    keywords: ['agent', 'collecte', 'caisse', 'paiement', 'commission', 'encaisser', 'POS'],
    content: `En tant qu'agent collecteur TEGS-Arena :
- Vous encaissez les frais d'inscription des candidats en personne
- Votre commission est un pourcentage defini par l'administrateur (generalement 5-10%)
- Chaque paiement encaisse est enregistre dans votre caisse
- Vous devez reverser le montant net (total - commission) a la plateforme
- Votre bordereau de versement est genere automatiquement en PDF
- Respectez votre quota maximum de paiements par periode`,
  },
  {
    id: 'agent-quota',
    title: 'Quota et garantie des agents',
    scope: 'internal',
    audience: 'agent',
    keywords: ['quota', 'garantie', 'caution', 'limite', 'bloque', 'contrat'],
    content: `Le systeme de quota protege la plateforme et les agents :
- Garantie (caution) : montant depose comme assurance avant de commencer a collecter
- Quota : nombre maximum de paiements que vous pouvez encaisser
- Si votre quota est epuise, vous devez reverser les fonds avant de continuer
- Si vous etes bloque, contactez votre administrateur pour debloquer votre compte
- Le contrat agent doit etre accepte avant toute collecte
- L'historique de toutes vos transactions est disponible dans votre caisse`,
  },

  // ══════════════════════════════════════════════════════════════
  // ADMINISTRATION
  // ══════════════════════════════════════════════════════════════
  {
    id: 'admin-tournois',
    title: 'Creer et gerer un tournoi',
    scope: 'internal',
    audience: 'admin',
    keywords: ['creer', 'tournoi', 'round', 'configurer', 'administration', 'gestion', 'nouveau'],
    content: `Pour creer un tournoi (admin) :
1. Allez dans Administration > Tournois > Nouveau Tournoi
2. Renseignez : titre, description, image de couverture
3. Configurez les rounds : nombre, labels, nombre de qualifies par round
4. Definissez les frais d'inscription et la devise (HTG/USD)
5. Liez un module quiz a chaque round (questions pre-creees dans le Studio)
6. Ouvrez les inscriptions en changeant le statut a "Inscriptions"
7. Demarrez chaque round manuellement quand vous etes pret
8. Apres chaque round, le systeme qualifie automatiquement les meilleurs
9. Les certificats sont generes automatiquement a la fin du dernier round`,
  },
  {
    id: 'admin-users',
    title: 'Gestion des utilisateurs',
    scope: 'internal',
    audience: 'admin',
    keywords: ['utilisateur', 'role', 'agent', 'enseignant', 'creer', 'modifier', 'supprimer'],
    content: `Gestion des utilisateurs (admin) :
- Roles disponibles : administrateur, enseignant, candidat, agent collecteur
- Chaque utilisateur est lie a une organisation
- Un email est unique par organisation (meme email possible dans 2 organisations differentes)
- Les agents collecteurs necessitent une verification et un contrat
- Les enseignants peuvent creer des modules quiz
- Le SuperAdmin peut gerer les utilisateurs de toutes les organisations`,
  },
  {
    id: 'admin-live',
    title: 'Piloter un concours en direct',
    scope: 'internal',
    audience: 'admin',
    keywords: ['live', 'direct', 'demarrer', 'competition', 'round', 'cloturer', 'qualifier'],
    content: `Procedure pour piloter un concours en direct :
1. Verifiez les inscriptions et paiements confirmes dans l'onglet Participants
2. Demarrez le Round 1 — le statut passe a LIVE
3. Le tableau des scores se met a jour automatiquement en temps reel
4. Suivez l'avancement : nombre de soumissions, scores, temps de reponse
5. Cloturez et qualifiez — le systeme classe et qualifie les Top X automatiquement
6. Repetez pour chaque round suivant
7. Apres le dernier round, le podium s'affiche et les certificats sont generes
8. La page Arena est disponible pour l'affichage TV/projecteur`,
  },

  // ══════════════════════════════════════════════════════════════
  // ANALYTICS & RAPPORTS
  // ══════════════════════════════════════════════════════════════
  {
    id: 'analytics-dashboard',
    title: 'Tableau de bord analytique',
    scope: 'internal',
    audience: 'admin',
    keywords: ['analytics', 'tableau', 'bord', 'statistiques', 'kpi', 'indicateur', 'performance', 'graphique'],
    content: `Le tableau de bord analytique offre une vue complete de votre organisation :
- Vue d'ensemble : nombre de modules, utilisateurs, quiz passes, taux de reussite
- Classement des modules par taux de reussite
- Progression hebdomadaire (graphique)
- Comparaison entre etablissements scolaires du meme district
- Classement des meilleurs candidats
- Indicateurs financiers : revenus des tournois, collectes agents, commissions
- Indice de fraude par tournoi (base sur les alertes de surveillance)
- Temps de reponse moyen par round
- Export des donnees en PDF, Excel ou CSV`,
  },
  {
    id: 'exports-rapports',
    title: 'Exports PDF, Excel et CSV',
    scope: 'internal',
    audience: 'admin',
    keywords: ['export', 'pdf', 'excel', 'csv', 'rapport', 'telecharger', 'resultats', 'statistiques'],
    content: `Les administrateurs peuvent exporter des rapports dans plusieurs formats :
- PDF : certificats de participation/reussite, bordereaux de versement, rapports individuels
- Excel : resultats detailles par module, par tournoi, par etablissement (pour le rapport DDENE)
- CSV : donnees brutes pour analyse dans un tableur
- Le rapport DDENE comprend : resume KPI, performance par district, classement general
- Les exports sont disponibles depuis les pages Rapports et Analytics
- Certains formats necessitent un plan Individuel ou superieur`,
  },
  {
    id: 'remediation-commentaires',
    title: 'Commentaires et remediation personnalisee',
    scope: 'internal',
    audience: 'admin',
    keywords: ['remediation', 'commentaire', 'conseil', 'personnalise', 'feedback', 'ameliorer', 'lacune'],
    content: `Apres un quiz, le systeme peut generer des retours personnalises :
- Commentaire automatique : analyse des reponses et identification des lacunes
- Recommandations : suggestions de sujets a reviser basees sur les erreurs
- Quiz de remediation : un quiz cible est genere automatiquement pour combler les lacunes identifiees
- Les enseignants peuvent consulter les analyses de chaque candidat
- Ces fonctionnalites sont disponibles avec les plans Individuel et superieur`,
  },

  // ══════════════════════════════════════════════════════════════
  // ABONNEMENTS & FACTURATION
  // ══════════════════════════════════════════════════════════════
  {
    id: 'plans-abonnement',
    title: 'Plans d\'abonnement et tarification',
    scope: 'internal',
    audience: 'admin',
    keywords: ['plan', 'abonnement', 'tarif', 'prix', 'gratuit', 'individuel', 'etablissement', 'pro', 'facturation', 'licence'],
    content: `4 plans disponibles avec des fonctionnalites croissantes :
1. Gratuit — 5 modules, 30 eleves/activite, sauvegarde 30 jours. Ideal pour decouvrir.
2. Individuel — Modules illimites, 50 eleves, exports PDF/Excel, generation de questions, commentaires, assistant. Pour les enseignants independants.
3. Etablissement — Tout Individuel + surveillance renforcee, video, themes personnalises, support prioritaire. Pour les ecoles.
4. Pro — Tout Etablissement + consolidation multi-comptes, gestionnaire dedie. Pour les reseaux d'ecoles.
- Facturation mensuelle ou annuelle (remise de 20% en annuel)
- Gestion des licences (nombre de places enseignants) dans la page Facturation
- Suivi de la consommation (modules, stockage, eleves) par rapport aux limites du plan`,
  },

  // ══════════════════════════════════════════════════════════════
  // MEDIATHEQUE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'mediatheque',
    title: 'Mediatheque et gestion des fichiers',
    scope: 'internal',
    audience: 'admin',
    keywords: ['media', 'image', 'video', 'audio', 'pdf', 'fichier', 'upload', 'telecharger', 'mediatheque', 'stockage'],
    content: `La mediatheque centralise tous vos fichiers multimedia :
- Formats supportes : images (JPG, PNG, GIF), videos (MP4, WebM), audio (MP3, WAV), documents (PDF)
- Taille maximale : 50 Mo par fichier
- Les fichiers sont stockes de maniere securisee dans le cloud, isoles par organisation
- Acces depuis la page Administration > Mediatheque ou directement depuis l'editeur de blocs
- Les liens de telechargement sont securises et temporaires
- L'espace de stockage depend de votre plan (0.5 Go gratuit, illimite en Pro)`,
  },

  // ══════════════════════════════════════════════════════════════
  // NOTIFICATIONS & MOBILE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'notifications',
    title: 'Notifications et alertes',
    scope: 'internal',
    audience: 'all',
    keywords: ['notification', 'alerte', 'push', 'rappel', 'mobile', 'message'],
    content: `Le systeme de notifications vous tient informe :
- Notifications sur votre telephone (Android et iOS) pour les evenements importants
- Alertes : debut de round, resultats publies, rappels d'inscription
- Les administrateurs peuvent envoyer des notifications a tous les participants d'un tournoi
- Les notifications individuelles sont aussi possibles (ex: rappel de paiement)
- Activez les notifications dans les parametres de votre navigateur ou application mobile`,
  },
  {
    id: 'mobile',
    title: 'Acces mobile et applications',
    scope: 'public',
    audience: 'all',
    keywords: ['mobile', 'telephone', 'tablette', 'application', 'portable', 'responsive'],
    content: `TEGS-Learning est accessible sur tous les appareils :
- Site web responsive : fonctionne sur ordinateur, tablette et telephone
- Application mobile avec fonctionnalites hors-ligne
- Interface superviseur pour les surveillants de concours (mobile)
- Salle de controle pour le suivi en direct depuis un telephone
- Synchronisation automatique des donnees quand la connexion revient
- Les quiz passent aussi bien sur mobile que sur ordinateur`,
  },

  // ══════════════════════════════════════════════════════════════
  // SUIVI PEDAGOGIQUE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'suivi-progression',
    title: 'Suivi de progression des eleves',
    scope: 'internal',
    audience: 'admin',
    keywords: ['suivi', 'progression', 'tracking', 'eleve', 'avancement', 'ecran', 'complete', 'score'],
    content: `La plateforme enregistre automatiquement la progression de chaque eleve :
- Chaque ecran consulte est enregistre avec la date et la duree
- Les resultats de quiz (score, reponses, temps) sont conserves
- Les enseignants voient le pourcentage de completion par module et par eleve
- Les sessions de formation peuvent etre reprises la ou l'eleve s'est arrete
- Les donnees de progression sont exportables pour analyse
- Compatible avec les systemes de gestion de formation (format standard)`,
  },
  {
    id: 'interoperabilite-lms',
    title: 'Compatibilite avec d\'autres systemes de formation',
    scope: 'internal',
    audience: 'admin',
    keywords: ['compatible', 'lms', 'formation', 'scorm', 'cmi5', 'import', 'export', 'manifest', 'standard'],
    content: `TEGS-Learning est compatible avec les standards internationaux de formation :
- Export au format standard pour integration dans d'autres systemes de formation
- Les modules peuvent etre lances depuis un systeme externe avec suivi de progression
- Import de donnees depuis d'autres applications (format standard ou fichier)
- Synchronisation bidirectionnelle avec les outils de terrain (collecte hors-ligne)
- Les resultats et progressions sont normalises pour faciliter les comparaisons`,
  },
  {
    id: 'sync-hors-ligne',
    title: 'Synchronisation et travail hors-ligne',
    scope: 'internal',
    audience: 'admin',
    keywords: ['sync', 'synchronisation', 'hors', 'ligne', 'offline', 'import', 'terrain', 'deconnecte'],
    content: `Le systeme supporte le travail hors-ligne et la synchronisation :
- Les applications de terrain peuvent collecter des donnees sans Internet
- Quand la connexion revient, les donnees sont synchronisees automatiquement
- Import de resultats et de presences depuis des applications externes
- Deduplication automatique : pas de doublons meme en cas de re-synchronisation
- Resolution de conflits : en cas de donnees contradictoires, le systeme garde la plus recente
- L'administrateur peut voir le statut de synchronisation et les sources de donnees`,
  },

  // ══════════════════════════════════════════════════════════════
  // ASSISTANT INTELLIGENT
  // ══════════════════════════════════════════════════════════════
  {
    id: 'assistant-presentation',
    title: 'L\'Assistant TEGS',
    scope: 'public',
    audience: 'all',
    keywords: ['assistant', 'aide', 'chat', 'question', 'reponse', 'bulle', 'intelligent'],
    content: `L'Assistant TEGS est un aide intelligent integre a la plateforme :
- Il repond a vos questions en francais via un chat (bulle verte en bas a droite de l'ecran)
- Les visiteurs peuvent poser des questions sur les concours, inscriptions et tarifs
- Les candidats connectes obtiennent de l'aide personnalisee sur leurs quiz et resultats
- Les agents collecteurs peuvent calculer commissions et generer des bordereaux
- Les administrateurs peuvent creer des tournois et generer des rapports via l'assistant
- Toute action de modification necessite une confirmation manuelle (pas d'action automatique)
- L'assistant fonctionne meme hors-ligne avec un mode FAQ local pour les questions courantes`,
  },
  {
    id: 'assistant-securite',
    title: 'Securite de l\'Assistant',
    scope: 'public',
    audience: 'all',
    keywords: ['securite', 'protection', 'donnees', 'confidentialite', 'assistant', 'urgence'],
    content: `L'Assistant est protege par 9 couches de securite :
- Desactivation complete par l'administrateur principal
- Arret d'urgence instantane depuis le tableau de surveillance
- Isolation par organisation : l'assistant ne voit que les donnees de votre etablissement
- Controle d'acces par role : chaque role n'a acces qu'a ses fonctions autorisees
- Confirmation humaine obligatoire pour toute action de modification
- Limitation du nombre de messages par heure par utilisateur
- Journal d'activite complet de toutes les interactions
- Protection contre les tentatives de manipulation
- Cloisonnement public/prive (visiteurs ne voient aucune donnee interne)`,
  },
  {
    id: 'assistant-config',
    title: 'Configuration de l\'Assistant (admin)',
    scope: 'internal',
    audience: 'admin',
    keywords: ['configurer', 'assistant', 'parametres', 'limite', 'activer', 'desactiver', 'urgence'],
    content: `Pour configurer l'Assistant (admin) :
1. Allez dans Administration > Configuration
2. Vous pouvez activer/desactiver l'assistant pour votre organisation
3. Activez ou desactivez l'assistant public (visiteurs non connectes)
4. Choisissez le mode de reponse : Rapide (economique) ou Precision (plus intelligent)
5. Reglez les limites de messages par heure pour chaque role
6. Activez/desactivez des fonctions specifiques par role (grille de cases a cocher)
7. Surveillez la consommation et le cout estime du mois
8. Utilisez l'arret d'urgence pour couper l'assistant immediatement en cas de besoin`,
  },
  {
    id: 'assistant-panic',
    title: 'Arret d\'urgence de l\'Assistant',
    scope: 'internal',
    audience: 'admin',
    keywords: ['panic', 'urgence', 'couper', 'arreter', 'bloquer', 'desactiver', 'assistant'],
    content: `L'arret d'urgence permet de couper instantanement l'Assistant :
1. Ouvrez Administration > Surveillance
2. Cliquez sur le bouton rouge "COUPER L'ASSISTANT" en haut a droite
3. Confirmez en cliquant a nouveau dans les 5 secondes
4. Toutes les conversations sont coupees immediatement
5. Les utilisateurs voient un message "Assistant temporairement suspendu"
6. L'arret d'urgence s'active aussi automatiquement si trop de messages sont detectes en peu de temps
7. Pour reactiver : cliquez sur le bouton vert "Reactiver l'Assistant"`,
  },

  // ══════════════════════════════════════════════════════════════
  // SECURITE GENERALE
  // ══════════════════════════════════════════════════════════════
  {
    id: 'securite-donnees',
    title: 'Protection des donnees et confidentialite',
    scope: 'public',
    audience: 'all',
    keywords: ['securite', 'donnees', 'protection', 'confidentialite', 'mot de passe', 'chiffrement', 'session'],
    content: `TEGS-Learning protege vos donnees avec plusieurs niveaux de securite :
- Les mots de passe sont chiffres et ne sont jamais stockes en clair
- Les sessions expirent automatiquement apres une periode d'inactivite
- Chaque organisation a ses donnees completement isolees des autres
- Les fichiers multimedia sont securises avec des liens d'acces temporaires
- Les paiements transitent par des plateformes securisees (MonCash, Natcash)
- Un journal d'activite enregistre les actions sensibles pour la tracabilite
- Le systeme respecte les bonnes pratiques de securite informatique`,
  },

  // ══════════════════════════════════════════════════════════════
  // THEMES & PERSONNALISATION
  // ══════════════════════════════════════════════════════════════
  {
    id: 'themes-personnalisation',
    title: 'Themes et personnalisation visuelle',
    scope: 'internal',
    audience: 'admin',
    keywords: ['theme', 'couleur', 'personnalisation', 'visuel', 'apparence', 'design'],
    content: `Les pages de concours et de diffusion proposent plusieurs themes visuels :
- Theme Officiel (DDENE) — couleurs bleues et blanches
- Theme Nature — tons verts et terreux
- Theme Contraste — haute lisibilite (accessibilite)
- Theme Ocean — bleus profonds
- Theme Coucher de soleil — tons chauds oranges et roses
- Le theme est selectionnable par l'administrateur pour chaque concours
- Les themes personnalises sont disponibles avec le plan Etablissement ou superieur`,
  },
];

/**
 * Recherche dans l'index de documentation.
 *
 * @param {string} query - Requete de recherche
 * @param {string} scope - 'public' (visiteurs) ou 'all' (authentifies)
 * @param {string} [audience] - Filtre par audience ('candidat', 'agent', 'admin')
 * @returns {object[]} Resultats tries par pertinence
 */
function searchDocs(query, scope = 'public', audience = null) {
  if (!query || typeof query !== 'string') return [];

  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const results = [];

  for (const doc of DOCS_INDEX) {
    // Filtrage par scope
    if (scope === 'public' && doc.scope !== 'public') continue;

    // Filtrage par audience
    if (audience && doc.audience !== 'all' && doc.audience !== audience) continue;

    // Scoring par mots-cles
    let score = 0;
    const allText = `${doc.title} ${doc.keywords.join(' ')} ${doc.content}`.toLowerCase();

    for (const term of terms) {
      // Match exact dans les keywords = +3
      if (doc.keywords.some((k) => k.includes(term))) score += 3;
      // Match dans le titre = +2
      if (doc.title.toLowerCase().includes(term)) score += 2;
      // Match dans le contenu = +1
      if (allText.includes(term)) score += 1;
    }

    if (score > 0) {
      results.push({ ...doc, score });
    }
  }

  // Trier par pertinence descendante
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Retourne tous les documents d'un scope donne.
 */
function getAllDocs(scope = 'public') {
  if (scope === 'all') return DOCS_INDEX;
  return DOCS_INDEX.filter((d) => d.scope === scope);
}

module.exports = { DOCS_INDEX, searchDocs, getAllDocs };
