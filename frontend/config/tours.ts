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
