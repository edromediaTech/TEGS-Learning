/**
 * Index de la base de connaissances documentation TEGS-Learning.
 *
 * Chaque entree contient :
 *   - id: identifiant unique
 *   - title: titre du document
 *   - scope: 'public' (visible par tous) ou 'internal' (auth requise)
 *   - audience: roles cibles ('candidat', 'agent', 'sponsor', 'admin', 'all')
 *   - keywords: mots-cles pour la recherche
 *   - content: contenu textuel (extrait des pages Vue docs)
 *
 * Ce fichier est la "memoire" statique de l'agent pour les questions
 * sur la plateforme, le fonctionnement et les guides.
 */

const DOCS_INDEX = [
  // ══════════════════════════════════════════
  // PUBLIC — Accessible a tous (y compris visiteurs non connectes)
  // ══════════════════════════════════════════
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
6. Apres paiement valide, vous recevez un ticket numerique (TKT-XXX) avec un QR code. C'est votre badge de competition.`,
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
    id: 'quiz-candidat',
    title: 'Passer le quiz du concours',
    scope: 'public',
    audience: 'candidat',
    keywords: ['quiz', 'examen', 'questions', 'reponse', 'temps', 'chronometre', 'plein ecran', 'elimination'],
    content: `Le jour du concours :
1. Connectez-vous et allez sur la page du tournoi. Entrez votre code TKT-XXX.
2. Le quiz se deroule en mode plein ecran obligatoire. Si vous quittez le plein ecran, vous serez elimine.
3. Chaque question a un temps limite affiche en haut. Quand le temps expire, votre reponse est soumise automatiquement.
4. Types de questions : QCM, Vrai/Faux, Numerique, Texte a trous, Association, Sequence.
5. Votre score est calcule en temps reel. Plus vous repondez vite et correctement, plus votre score est eleve.
6. A la fin du round, les meilleurs candidats sont qualifies pour le round suivant.`,
  },
  {
    id: 'resultats',
    title: 'Consulter les resultats et classements',
    scope: 'public',
    audience: 'candidat',
    keywords: ['resultats', 'classement', 'score', 'note', 'podium', 'qualifie', 'elimine'],
    content: `Les resultats sont publies en temps reel apres chaque round :
- Le classement montre votre rang, score, pourcentage et temps de reponse.
- Les candidats qualifies pour le round suivant sont marques en vert.
- Les candidats elimines sont marques en rouge.
- Le podium final (top 3) est affiche avec les primes a la fin du dernier round.
- Vous pouvez telecharger un certificat PDF de participation ou de reussite.`,
  },
  {
    id: 'badge-qr',
    title: 'Votre badge numerique et QR code',
    scope: 'public',
    audience: 'candidat',
    keywords: ['badge', 'qr', 'code', 'ticket', 'TKT', 'verification'],
    content: `Apres inscription et paiement, vous recevez un badge numerique :
- Format : TKT-XXXXXX (6 caracteres aleatoires)
- Contient un QR code scannable pour verification rapide
- Prouve que votre inscription et paiement sont valides
- Presentez-le le jour du concours (sur votre telephone ou imprime)
- Les organisateurs scannent votre QR pour vous identifier`,
  },
  {
    id: 'anti-triche',
    title: 'Securite et anti-triche',
    scope: 'public',
    audience: 'all',
    keywords: ['triche', 'securite', 'surveillance', 'proctoring', 'plein ecran', 'camera', 'equite'],
    content: `TEGS-Arena utilise plusieurs mecanismes anti-triche pour garantir l'equite :
- Mode plein ecran obligatoire : quitter = elimination immediate
- Surveillance du focus : les changements d'onglet/fenetre sont detectes et signales
- Proctoring camera : les organisateurs peuvent activer des captures automatiques
- Chronometre force : les questions sont verrouillees a expiration, pas de temps supplementaire
- Correction automatique : zero erreur humaine, tous les candidats sont evalues de maniere identique
- Classement en temps reel : transparence totale sur les resultats`,
  },
  {
    id: 'tournois-presentation',
    title: 'Qu\'est-ce qu\'un tournoi TEGS-Arena',
    scope: 'public',
    audience: 'all',
    keywords: ['tournoi', 'concours', 'competition', 'round', 'elimination', 'prime', 'prix'],
    content: `Un tournoi TEGS-Arena est un concours academique en ligne avec rounds eliminatoires :
- Plusieurs rounds : Eliminatoire, Demi-finale, Finale (configurable)
- A chaque round, les X meilleurs candidats sont qualifies
- Les questions sont generees ou selectionnees par les administrateurs
- Des primes peuvent etre attribuees au podium (1er, 2e, 3e)
- Les sponsors peuvent financer des places gratuites via des codes BOURSE
- Le tout se deroule en ligne, accessible depuis un ordinateur ou telephone`,
  },
  {
    id: 'bourses-sponsors',
    title: 'Systeme de bourses et sponsors',
    scope: 'public',
    audience: 'all',
    keywords: ['bourse', 'sponsor', 'gratuit', 'code', 'BOURSE', 'parrainage', 'partenaire'],
    content: `Les sponsors sont des organisations ou individus qui financent la participation de candidats :
- Ils achetent des packs de bourses (ex: 50 places gratuites)
- Chaque bourse genere un code unique : BOURSE-XXXXXX
- Le candidat entre ce code lors de l'inscription pour ne pas payer
- Le sponsor voit les statistiques de ses candidats sponsorises
- Tiers disponibles : Bronze, Silver, Gold, Diamond (avec visibilite croissante)`,
  },

  // ══════════════════════════════════════════
  // INTERNAL — Accessible uniquement aux utilisateurs authentifies
  // ══════════════════════════════════════════
  {
    id: 'agent-collecte',
    title: 'Guide de collecte pour les agents POS',
    scope: 'internal',
    audience: 'agent',
    keywords: ['agent', 'collecte', 'caisse', 'paiement', 'commission', 'encaisser', 'POS'],
    content: `En tant qu'agent collecteur TEGS-Arena :
- Vous encaissez les frais d'inscription des candidats en personne
- Votre commission est un pourcentage defini par l'administrateur (generalement 5-10%)
- Chaque paiement encaisse est enregistre dans votre caisse
- Vous devez reverser le montant net (total - commission) a la plateforme
- Votre bordereau de versement est genere automatiquement
- Respectez votre quota maximum de paiements par periode`,
  },
  {
    id: 'agent-quota',
    title: 'Quota et garantie des agents',
    scope: 'internal',
    audience: 'agent',
    keywords: ['quota', 'garantie', 'caution', 'limite', 'bloque', 'verification'],
    content: `Le systeme de quota protege la plateforme et les agents :
- Garantie (caution) : montant depose comme assurance avant de commencer a collecter
- Quota : nombre maximum de paiements que vous pouvez encaisser
- Si votre quota est epuise, vous devez reverser les fonds avant de continuer
- Si vous etes bloque, contactez votre administrateur pour debloquer votre compte
- Le contrat agent doit etre accepte avant toute collecte`,
  },
  {
    id: 'admin-tournois',
    title: 'Creer et gerer un tournoi',
    scope: 'internal',
    audience: 'admin',
    keywords: ['creer', 'tournoi', 'round', 'configurer', 'administration', 'gestion'],
    content: `Pour creer un tournoi (admin) :
1. Allez dans Administration > Tournois > Nouveau Tournoi
2. Renseignez : titre, description, image de couverture
3. Configurez les rounds : nombre, labels, nombre de qualifies par round
4. Definissez les frais d'inscription et la devise (HTG/USD)
5. Liez un module quiz a chaque round (questions pre-creees dans le Studio)
6. Ouvrez les inscriptions en changeant le statut a "registration"
7. Demarrez chaque round manuellement quand vous etes pret
8. Apres chaque round, le systeme qualifie automatiquement les meilleurs`,
  },
  {
    id: 'admin-users',
    title: 'Gestion des utilisateurs',
    scope: 'internal',
    audience: 'admin',
    keywords: ['utilisateur', 'role', 'agent', 'enseignant', 'creer', 'modifier'],
    content: `Gestion des utilisateurs (admin) :
- Roles disponibles : admin_ddene, teacher, student, authorized_agent
- Chaque utilisateur est lie a une organisation (tenant)
- Un email est unique par organisation (meme email possible dans 2 orgas)
- Les agents POS necessitent une verification et un contrat
- Les enseignants peuvent creer des modules quiz
- Le SuperAdmin peut gerer les utilisateurs de toutes les organisations`,
  },
  {
    id: 'admin-modules',
    title: 'Creer des modules quiz dans le Studio',
    scope: 'internal',
    audience: 'admin',
    keywords: ['module', 'quiz', 'question', 'studio', 'bloc', 'section', 'ecran'],
    content: `Le Studio permet de creer des questionnaires :
- Un module contient des sections, chaque section contient des ecrans
- Chaque ecran contient des blocs de contenu (texte, image, video) et des questions
- Types de questions : QCM, Vrai/Faux, Numerique, Texte a trous, Association, Sequence, Likert, Reponse ouverte
- Chaque question a un nombre de points et un temps limite
- L'IA peut generer des questions automatiquement a partir d'un sujet
- Les modules peuvent etre partages via un lien public`,
  },
  {
    id: 'admin-ia-quiz',
    title: 'Generation IA de questions',
    scope: 'internal',
    audience: 'admin',
    keywords: ['ia', 'intelligence artificielle', 'generer', 'automatique', 'gemini'],
    content: `L'IA (Gemini) peut generer des questions automatiquement :
- Selectionnez un sujet, le nombre de questions et le niveau de difficulte
- L'IA genere des QCM, Vrai/Faux ou autres types avec reponses correctes
- Vous pouvez modifier les questions generees avant de les valider
- Le systeme utilise le dp-ai-gateway-service pour la generation
- Les tokens IA sont limites selon votre plan d'abonnement`,
  },
  {
    id: 'admin-live',
    title: 'Mode competition en direct',
    scope: 'internal',
    audience: 'admin',
    keywords: ['live', 'direct', 'competition', 'spectateur', 'leaderboard', 'arena'],
    content: `Le mode competition en direct :
- L'administrateur demarre le concours depuis le dashboard
- Les questions sont envoyees simultanement a tous les candidats
- Chronometre force par question avec verrouillage automatique
- Leaderboard en temps reel visible par les spectateurs
- Page Live Arena pour affichage TV/projecteur (OBS compatible)
- Breaking news : alerte quand un candidat entre dans le top 3
- Statistiques par etablissement scolaire`,
  },

  // ══════════════════════════════════════════
  // AGENT IA — Documentation (public + interne)
  // ══════════════════════════════════════════
  {
    id: 'agent-ia-presentation',
    title: 'L\'Agent IA TEGS-Arena',
    scope: 'public',
    audience: 'all',
    keywords: ['agent', 'ia', 'intelligence', 'artificielle', 'chat', 'assistant', 'aide', 'robot'],
    content: `L'Agent IA TEGS-Arena est un assistant intelligent integre a la plateforme :
- Il repond a vos questions en francais via un chat en bas a droite de l'ecran (bulle verte)
- Les visiteurs peuvent poser des questions sur les concours, inscriptions et tarifs
- Les candidats connectes obtiennent de l'aide personnalisee sur leurs quiz et resultats
- Les agents POS peuvent calculer commissions et generer des bordereaux
- Les administrateurs peuvent creer des tournois et generer des rapports via l'agent
- Toute action de modification necessite une confirmation manuelle (pas d'action automatique)
- L'agent fonctionne meme hors-ligne avec un mode FAQ local pour les questions courantes`,
  },
  {
    id: 'agent-ia-securite',
    title: 'Securite de l\'Agent IA',
    scope: 'public',
    audience: 'all',
    keywords: ['securite', 'protection', 'donnees', 'confidentialite', 'agent', 'ia'],
    content: `L'Agent IA est protege par 9 couches de securite :
- Kill switch : desactivation complete par variable d'environnement
- Panic Mode : arret d'urgence instantane depuis le dashboard admin
- Isolation par organisation : l'agent ne voit que les donnees de votre tenant
- Controle d'acces par role (RBAC) : chaque role n'a acces qu'a ses outils autorises
- Confirmation humaine obligatoire pour toute action de modification
- Rate limiting : nombre maximum de messages par heure par utilisateur
- Journal d'audit complet de toutes les interactions
- Defense anti-injection de prompt (instructions systeme non modifiables)
- Cloisonnement public/prive (visiteurs ne voient aucune donnee interne)`,
  },
  {
    id: 'agent-ia-config',
    title: 'Configuration de l\'Agent IA (admin)',
    scope: 'internal',
    audience: 'admin',
    keywords: ['configurer', 'agent', 'ia', 'parametres', 'limite', 'modele', 'activer', 'desactiver'],
    content: `Pour configurer l'Agent IA (admin) :
1. Allez dans Administration > Config Agent
2. Vous pouvez activer/desactiver l'agent pour votre organisation
3. Activez ou desactivez l'agent public (visiteurs non connectes)
4. Choisissez le modele IA : Gemini Flash (rapide/economique) ou Gemini Pro (plus intelligent)
5. Reglez les limites de debit (messages/heure) par role
6. Activez/desactivez des outils specifiques par role (grille de cases a cocher)
7. Surveillez la consommation de tokens et le cout estime du mois
8. Utilisez le Panic Mode pour couper l'agent immediatement en cas d'urgence`,
  },
  {
    id: 'agent-ia-panic',
    title: 'Panic Mode (arret d\'urgence Agent IA)',
    scope: 'internal',
    audience: 'admin',
    keywords: ['panic', 'urgence', 'couper', 'arreter', 'bloquer', 'desactiver', 'agent'],
    content: `Le Panic Mode permet de couper instantanement l'Agent IA :
1. Ouvrez Administration > Agent IA
2. Cliquez sur le bouton rouge "COUPER L'AGENT" en haut a droite
3. Confirmez en cliquant a nouveau dans les 5 secondes
4. Toutes les sessions sont coupees immediatement
5. Les utilisateurs voient un message "Agent temporairement suspendu"
6. Le Panic Mode s'active aussi automatiquement si plus de 100 requetes sont detectees en 1 minute
7. Pour reactiver : cliquez sur le bouton vert "Reactiver l'Agent"`,
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
