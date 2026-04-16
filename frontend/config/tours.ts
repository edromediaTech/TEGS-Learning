/**
 * TEGS-Copilot — Moteur de Tâches
 *
 * Chaque mission contient des étapes avec :
 *  - title / description  : texte affiché
 *  - route                : page cible (si l'utilisateur n'y est pas → « M'y conduire »)
 *  - selector             : sélecteur CSS de l'élément à mettre en évidence (driver.js)
 *  - action               : callback optionnel (remplir un champ, cliquer, etc.)
 *  - validate             : fonction de validation automatique (retourne true → vert)
 */

export interface TourStep {
  id: string;
  title: string;
  description: string;
  route?: string;
  selector?: string;
  /** Side for the popover relative to the element */
  popoverSide?: 'top' | 'bottom' | 'left' | 'right';
  /** Auto-validate: returns true when step is done */
  validate?: () => boolean;
}

export interface TourMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Roles that see this mission. Empty = all roles */
  roles: string[];
  /** Category for grouping */
  category: 'getting-started' | 'tournaments' | 'modules' | 'agents' | 'analytics';
  steps: TourStep[];
}

// ──────────────────────────────────────────────
// MISSIONS
// ──────────────────────────────────────────────

export const missions: TourMission[] = [
  // ─── BIENVENUE ───
  {
    id: 'welcome',
    title: 'Bienvenue sur TEGS-Arena',
    description: 'Decouvrez les fonctionnalites principales de la plateforme.',
    icon: '\uD83D\uDC4B',
    roles: [],
    category: 'getting-started',
    steps: [
      {
        id: 'welcome-sidebar',
        title: 'La barre de navigation',
        description: 'Utilisez cette barre laterale pour naviguer entre les sections : Studio, Tournois, Analytics, etc.',
        selector: 'aside',
        popoverSide: 'right',
      },
      {
        id: 'welcome-studio',
        title: 'Le Studio',
        description: 'Creez et gerez vos modules pedagogiques avec notre editeur de blocs.',
        route: '/admin/modules',
        selector: 'a[href="/admin/modules"]',
        popoverSide: 'right',
      },
      {
        id: 'welcome-tournaments',
        title: 'Les Tournois',
        description: 'Organisez des competitions academiques avec inscriptions, rounds eliminatoires et podium.',
        route: '/admin/tournaments',
        selector: 'a[href="/admin/tournaments"]',
        popoverSide: 'right',
      },
      {
        id: 'welcome-analytics',
        title: 'Analytics & Reporting',
        description: 'Suivez les performances avec des tableaux de bord, exports PDF/Excel et commentaires IA.',
        route: '/admin/analytics',
        selector: 'a[href="/admin/analytics"]',
        popoverSide: 'right',
      },
      {
        id: 'welcome-help',
        title: 'Centre d\'Aide',
        description: 'Consultez les guides detailles par role (candidat, agent, sponsor, admin) et la FAQ.',
        selector: 'a[href="/docs"]',
        popoverSide: 'right',
      },
    ],
  },

  // ─── CRÉER UN MODULE ───
  {
    id: 'create-module',
    title: 'Creer mon premier module',
    description: 'Apprenez a creer un module de formation avec des questions interactives.',
    icon: '\uD83D\uDCDA',
    roles: ['superadmin', 'admin_ddene', 'teacher'],
    category: 'modules',
    steps: [
      {
        id: 'mod-goto-studio',
        title: 'Ouvrir le Studio',
        description: 'Rendez-vous dans la section Studio pour voir vos modules.',
        route: '/admin/modules',
        selector: 'a[href="/admin/modules"]',
        popoverSide: 'right',
      },
      {
        id: 'mod-click-create',
        title: 'Creer un module',
        description: 'Cliquez sur le bouton "+ Creer un module" pour demarrer.',
        route: '/admin/modules',
        selector: 'button:has(span), a[href*="create"], [data-copilot="create-module"]',
        popoverSide: 'bottom',
        validate: () => !!document.querySelector('[data-copilot="module-form"]'),
      },
      {
        id: 'mod-fill-title',
        title: 'Remplir le titre',
        description: 'Donnez un titre clair a votre module (ex: "Quiz Culture Haitienne").',
        selector: 'input[name="title"], input[placeholder*="titre"], [data-copilot="module-title"]',
        popoverSide: 'bottom',
        validate: () => {
          const input = document.querySelector('input[name="title"], [data-copilot="module-title"]') as HTMLInputElement;
          return !!input?.value?.trim();
        },
      },
      {
        id: 'mod-open-editor',
        title: 'Ouvrir l\'editeur',
        description: 'Cliquez sur "Ouvrir le Studio" pour acceder a l\'editeur de blocs.',
        selector: '[data-copilot="open-studio"], a[href*="structure"], button:has-text("Studio")',
        popoverSide: 'bottom',
      },
      {
        id: 'mod-add-block',
        title: 'Ajouter un bloc',
        description: 'Utilisez la palette a droite pour glisser des blocs (QCM, Vrai/Faux, Texte, Image...).',
        selector: '[data-copilot="block-palette"], .palette',
        popoverSide: 'left',
      },
    ],
  },

  // ─── CRÉER UN TOURNOI ───
  {
    id: 'create-tournament',
    title: 'Creer un tournoi de Geographie',
    description: 'Creez un concours eliminatoire avec inscriptions et classement.',
    icon: '\uD83C\uDFC6',
    roles: ['superadmin', 'admin_ddene'],
    category: 'tournaments',
    steps: [
      {
        id: 'tour-goto-list',
        title: 'Aller dans l\'onglet Tournois',
        description: 'Ouvrez la page de gestion des tournois.',
        route: '/admin/tournaments',
        selector: 'a[href="/admin/tournaments"]',
        popoverSide: 'right',
      },
      {
        id: 'tour-click-new',
        title: 'Creer un nouveau tournoi',
        description: 'Cliquez sur "+ Creer un tournoi" pour commencer la configuration.',
        route: '/admin/tournaments',
        selector: '[data-copilot="create-tournament"], a[href="/admin/tournaments/new"]',
        popoverSide: 'bottom',
      },
      {
        id: 'tour-fill-title',
        title: 'Remplir le titre',
        description: 'Entrez un titre evocateur (ex: "Concours de Geographie d\'Haiti 2026").',
        route: '/admin/tournaments/new',
        selector: 'input[name="title"], [data-copilot="tournament-title"]',
        popoverSide: 'bottom',
        validate: () => {
          const input = document.querySelector('input[name="title"], [data-copilot="tournament-title"]') as HTMLInputElement;
          return !!input?.value?.trim();
        },
      },
      {
        id: 'tour-configure-rounds',
        title: 'Configurer les rounds',
        description: 'Definissez le nombre de rounds eliminatoires et le quiz associe a chaque round.',
        route: '/admin/tournaments/new',
        selector: '[data-copilot="tournament-rounds"], .rounds-section',
        popoverSide: 'bottom',
      },
      {
        id: 'tour-set-fees',
        title: 'Fixer les frais d\'inscription',
        description: 'Indiquez le montant des frais (en HTG) que les candidats paieront via MonCash/Natcash.',
        route: '/admin/tournaments/new',
        selector: 'input[name="fee"], [data-copilot="tournament-fee"]',
        popoverSide: 'bottom',
      },
      {
        id: 'tour-publish',
        title: 'Publier le tournoi',
        description: 'Cliquez sur "Publier" pour ouvrir les inscriptions. Le lien de partage sera genere automatiquement.',
        route: '/admin/tournaments/new',
        selector: '[data-copilot="tournament-publish"], button[type="submit"]',
        popoverSide: 'top',
      },
    ],
  },

  // ─── GÉRER LES AGENTS ───
  {
    id: 'manage-agents',
    title: 'Gerer mes agents collecteurs',
    description: 'Configurez et supervisez votre reseau d\'agents de collecte.',
    icon: '\uD83D\uDCB5',
    roles: ['superadmin', 'admin_ddene'],
    category: 'agents',
    steps: [
      {
        id: 'agent-goto-users',
        title: 'Ouvrir la gestion des utilisateurs',
        description: 'Allez dans Utilisateurs pour creer un compte agent.',
        route: '/admin/users',
        selector: 'a[href="/admin/users"]',
        popoverSide: 'right',
      },
      {
        id: 'agent-create-user',
        title: 'Creer un utilisateur Agent',
        description: 'Cliquez sur "+ Nouvel Utilisateur" et selectionnez le role "Agent Autorise".',
        route: '/admin/users',
        selector: '[data-copilot="create-user"], button',
        popoverSide: 'bottom',
      },
      {
        id: 'agent-set-guarantee',
        title: 'Definir la caution',
        description: 'Fixez le montant de la caution (garantie) que l\'agent depose pour pouvoir collecter.',
        selector: '[data-copilot="agent-guarantee"], input[name="guaranteeBalance"]',
        popoverSide: 'bottom',
      },
      {
        id: 'agent-goto-caisse',
        title: 'Consulter la caisse agent',
        description: 'Allez dans "Caisse Agent" pour voir le terminal POS et les transactions.',
        route: '/agent/collection',
        selector: 'a[href="/agent/collection"]',
        popoverSide: 'right',
      },
    ],
  },

  // ─── CONSULTER LES RÉSULTATS ───
  {
    id: 'view-analytics',
    title: 'Consulter mes resultats et analytics',
    description: 'Decouvrez les tableaux de bord et les exports de resultats.',
    icon: '\uD83D\uDCCA',
    roles: ['superadmin', 'admin_ddene', 'teacher'],
    category: 'analytics',
    steps: [
      {
        id: 'analytics-goto',
        title: 'Ouvrir le dashboard Analytics',
        description: 'Rendez-vous sur la page Analytics pour voir les KPIs globaux.',
        route: '/admin/analytics',
        selector: 'a[href="/admin/analytics"]',
        popoverSide: 'right',
      },
      {
        id: 'analytics-kpis',
        title: 'Comprendre les KPIs',
        description: 'Total Traces, Taux de Reussite, Score Moyen et Utilisateurs Actifs sont vos indicateurs cles.',
        route: '/admin/analytics',
        selector: '[data-copilot="analytics-kpis"], .grid',
        popoverSide: 'bottom',
      },
      {
        id: 'analytics-export',
        title: 'Exporter les donnees',
        description: 'Utilisez les boutons "Export CSV" ou "Rapport DDENE" pour telecharger vos rapports.',
        route: '/admin/analytics',
        selector: '[data-copilot="analytics-export"], button',
        popoverSide: 'bottom',
      },
    ],
  },

  // ─── CONFIGURER LA SURVEILLANCE ───
  {
    id: 'setup-proctoring',
    title: 'Activer la surveillance d\'examen',
    description: 'Configurez le proctoring (camera, detection de perte de focus) pour vos quiz.',
    icon: '\uD83D\uDD0D',
    roles: ['superadmin', 'admin_ddene', 'teacher'],
    category: 'modules',
    steps: [
      {
        id: 'proctor-goto-module',
        title: 'Ouvrir un module',
        description: 'Allez dans le Studio et selectionnez le module a configurer.',
        route: '/admin/modules',
        selector: 'a[href="/admin/modules"]',
        popoverSide: 'right',
      },
      {
        id: 'proctor-goto-settings',
        title: 'Ouvrir les parametres',
        description: 'Cliquez sur l\'icone engrenage du module pour acceder a ses parametres.',
        selector: '[data-copilot="module-settings"], a[href*="settings"]',
        popoverSide: 'bottom',
      },
      {
        id: 'proctor-tab-surveillance',
        title: 'Onglet Surveillance',
        description: 'Selectionnez l\'onglet "Surveillance" pour configurer le mode de proctoring.',
        selector: '[data-copilot="tab-surveillance"], button:contains("Surveillance")',
        popoverSide: 'bottom',
      },
      {
        id: 'proctor-enable',
        title: 'Activer le proctoring',
        description: 'Activez la camera, la detection de perte de focus, et definissez le nombre maximum de "blur" avant elimination.',
        selector: '[data-copilot="proctoring-toggle"]',
        popoverSide: 'bottom',
      },
    ],
  },

  // ─── DIFFUSER EN LIVE ───
  {
    id: 'go-live',
    title: 'Diffuser un concours en direct',
    description: 'Lancez une session live avec spectateurs, classement et podium.',
    icon: '\uD83D\uDCFA',
    roles: ['superadmin', 'admin_ddene', 'teacher'],
    category: 'tournaments',
    steps: [
      {
        id: 'live-goto-module',
        title: 'Ouvrir un module',
        description: 'Selectionnez le module que vous souhaitez diffuser en live.',
        route: '/admin/modules',
        selector: 'a[href="/admin/modules"]',
        popoverSide: 'right',
      },
      {
        id: 'live-click-diffuser',
        title: 'Cliquer sur "Diffuser"',
        description: 'Dans l\'editeur du module, cliquez sur le bouton "Diffuser" en haut.',
        selector: '[data-copilot="btn-diffuser"], button:contains("Diffuser")',
        popoverSide: 'bottom',
      },
      {
        id: 'live-monitor',
        title: 'Surveiller les participants',
        description: 'Le tableau de bord Live affiche en temps reel : connectes, soumis, deconnectes, score moyen.',
        selector: '[data-copilot="live-dashboard"]',
        popoverSide: 'bottom',
      },
      {
        id: 'live-arena-link',
        title: 'Partager le lien Arena',
        description: 'Copiez le lien Live Arena pour vos spectateurs sur TV/projecteur ou OBS.',
        selector: '[data-copilot="arena-link"]',
        popoverSide: 'bottom',
      },
    ],
  },
  // ─── MISSION AGENT : COLLECTER DES PAIEMENTS ───
  {
    id: 'agent-collect',
    title: 'Collecter mes premiers paiements',
    description: 'Apprenez a encaisser les frais d\'inscription des candidats en especes.',
    icon: '\uD83D\uDCB0',
    roles: ['authorized_agent'],
    category: 'agents',
    steps: [
      {
        id: 'ac-goto-caisse',
        title: 'Ouvrir la Caisse Agent',
        description: 'Cliquez sur "Caisse Agent" dans le menu pour acceder a votre terminal POS.',
        route: '/agent/collection',
        selector: 'a[href="/agent/collection"]',
        popoverSide: 'right',
      },
      {
        id: 'ac-check-wallet',
        title: 'Verifier votre portefeuille',
        description: 'Consultez votre caution, quota utilise et disponible en haut de la page.',
        route: '/agent/collection',
        selector: '[data-copilot="agent-wallet"], .grid',
        popoverSide: 'bottom',
      },
      {
        id: 'ac-search',
        title: 'Rechercher un participant',
        description: 'Entrez le nom, email ou TKT-XXXXXXXX du candidat dans la barre de recherche.',
        route: '/agent/collection',
        selector: 'input[placeholder*="Nom"], input[placeholder*="TKT"]',
        popoverSide: 'bottom',
      },
      {
        id: 'ac-encaisser',
        title: 'Encaisser',
        description: 'Cliquez sur "Encaisser" a cote du participant. Le systeme verifie votre quota et votre contrat automatiquement.',
        route: '/agent/collection',
        selector: '[data-copilot="btn-encaisser"], button',
        popoverSide: 'bottom',
      },
    ],
  },

  // ─── MISSION CANDIDAT : S'INSCRIRE À UN CONCOURS ───
  {
    id: 'student-register',
    title: 'S\'inscrire a un concours',
    description: 'Inscrivez-vous a un concours, payez les frais et obtenez votre ticket.',
    icon: '\uD83C\uDF93',
    roles: ['student'],
    category: 'getting-started',
    steps: [
      {
        id: 'sr-goto-lobby',
        title: 'Ouvrir le Lobby',
        description: 'Rendez-vous sur la page d\'accueil pour voir les concours disponibles.',
        route: '/',
        selector: '[data-copilot="lobby-grid"], .grid',
        popoverSide: 'bottom',
      },
      {
        id: 'sr-choose-tournament',
        title: 'Choisir un concours',
        description: 'Cliquez sur le concours auquel vous souhaitez participer pour acceder a la page d\'inscription.',
        selector: '[data-copilot="tournament-card"], a',
        popoverSide: 'bottom',
      },
      {
        id: 'sr-fill-form',
        title: 'Remplir le formulaire',
        description: 'Entrez votre nom, prenom, email et etablissement. Si vous avez un code bourse (BOURSE-XXXXXXXX), saisissez-le.',
        selector: 'form, [data-copilot="registration-form"]',
        popoverSide: 'bottom',
      },
      {
        id: 'sr-pay',
        title: 'Payer ou utiliser un code bourse',
        description: 'Choisissez MonCash, Natcash ou un code bourse pour valider votre inscription.',
        selector: '[data-copilot="payment-options"]',
        popoverSide: 'bottom',
      },
      {
        id: 'sr-get-ticket',
        title: 'Recevoir votre ticket',
        description: 'Apres paiement, vous recevez votre ticket TKT-XXXXXXXX et un QR code. Conservez-les precieusement !',
        selector: '[data-copilot="ticket-display"]',
        popoverSide: 'bottom',
      },
    ],
  },

  // ─── MISSION CANDIDAT : PASSER LE QUIZ ───
  {
    id: 'student-quiz',
    title: 'Passer le quiz du concours',
    description: 'Accedez au quiz, repondez aux questions et soumettez vos reponses.',
    icon: '\uD83D\uDCDD',
    roles: ['student'],
    category: 'getting-started',
    steps: [
      {
        id: 'sq-goto-play',
        title: 'Acceder a la page du concours',
        description: 'Ouvrez le lien du concours et cliquez sur "Passer le quiz".',
        selector: '[data-copilot="play-link"], a',
        popoverSide: 'bottom',
      },
      {
        id: 'sq-enter-token',
        title: 'Entrer votre code TKT',
        description: 'Saisissez votre ticket TKT-XXXXXXXX pour acceder au quiz.',
        selector: 'input[placeholder*="TKT"], [data-copilot="token-input"]',
        popoverSide: 'bottom',
      },
      {
        id: 'sq-read-rules',
        title: 'Lire le reglement',
        description: 'Lisez attentivement les regles : camera obligatoire, perte de focus = elimination.',
        selector: '[data-copilot="briefing"]',
        popoverSide: 'bottom',
      },
      {
        id: 'sq-answer',
        title: 'Repondre aux questions',
        description: 'Repondez a toutes les questions dans le temps imparti. Le chronometre est en haut de la page.',
        selector: '[data-copilot="quiz-frame"], iframe',
        popoverSide: 'top',
      },
    ],
  },
];

/**
 * Catégories pour le filtre dans le panneau
 */
export const categories = [
  { id: 'getting-started', label: 'Premiers pas', icon: '\uD83D\uDE80' },
  { id: 'modules', label: 'Modules & Studio', icon: '\uD83D\uDCDA' },
  { id: 'tournaments', label: 'Tournois', icon: '\uD83C\uDFC6' },
  { id: 'agents', label: 'Agents', icon: '\uD83D\uDCB5' },
  { id: 'analytics', label: 'Analytics', icon: '\uD83D\uDCCA' },
] as const;
