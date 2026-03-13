/**
 * Définitions des plans de tarification TEGS-Learning.
 * Chaque plan définit ses limites, fonctionnalités et prix.
 */

const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuit',
    description: 'Decouverte et premiers pas',
    price: { monthly: 0, annual: 0 },
    limits: {
      modules: 5,           // max questionnaires/modules
      rooms: 1,             // salles virtuelles
      studentsPerActivity: 30,
      storageGB: 0.5,
      historyDays: 30,      // historique analytics
    },
    features: {
      autoGrading: true,           // notation automatique
      aiGeneration: 'basic',       // 'none' | 'basic' | 'full'
      aiRemediation: false,
      aiCommentary: false,
      exportPDF: false,
      exportExcel: false,
      exportCSV: true,
      surveillanceStrict: false,
      surveillanceLight: true,
      liveMonitoring: false,
      videoIntegration: false,
      partialGrading: false,
      timerPerQuestion: false,
      timerGlobal: true,
      customThemes: false,
      prioritySupport: false,
      dedicatedManager: false,
      multiAccountConsolidation: false,
    },
  },

  individual: {
    id: 'individual',
    name: 'Individuel',
    description: 'Pour les enseignants independants',
    price: { monthly: 10, annual: 8 },  // $8/mois en annuel = $96/an
    limits: {
      modules: -1,          // illimite
      rooms: 5,
      studentsPerActivity: 50,
      storageGB: 5,
      historyDays: 365,
    },
    features: {
      autoGrading: true,
      aiGeneration: 'full',
      aiRemediation: true,
      aiCommentary: true,
      exportPDF: true,
      exportExcel: true,
      exportCSV: true,
      surveillanceStrict: true,
      surveillanceLight: true,
      liveMonitoring: false,
      videoIntegration: false,
      partialGrading: true,
      timerPerQuestion: true,
      timerGlobal: true,
      customThemes: true,
      prioritySupport: false,
      dedicatedManager: false,
      multiAccountConsolidation: false,
    },
  },

  establishment: {
    id: 'establishment',
    name: 'Etablissement',
    description: 'Pour les ecoles et institutions',
    price: { monthly: 15, annual: 12 },  // par siege, $12/siege en annuel
    limits: {
      modules: -1,
      rooms: 30,
      studentsPerActivity: 300,
      storageGB: 50,
      historyDays: -1,      // illimite
    },
    features: {
      autoGrading: true,
      aiGeneration: 'full',
      aiRemediation: true,
      aiCommentary: true,
      exportPDF: true,
      exportExcel: true,
      exportCSV: true,
      surveillanceStrict: true,
      surveillanceLight: true,
      liveMonitoring: true,
      videoIntegration: true,
      partialGrading: true,
      timerPerQuestion: true,
      timerGlobal: true,
      customThemes: true,
      prioritySupport: false,
      dedicatedManager: false,
      multiAccountConsolidation: false,
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro / Scolaire',
    description: 'Pour les grands comptes (DDENE)',
    price: { monthly: 14.40, annual: 11.52 },  // par siege
    limits: {
      modules: -1,
      rooms: -1,            // illimite
      studentsPerActivity: -1,
      storageGB: -1,
      historyDays: -1,
    },
    features: {
      autoGrading: true,
      aiGeneration: 'full',
      aiRemediation: true,
      aiCommentary: true,
      exportPDF: true,
      exportExcel: true,
      exportCSV: true,
      surveillanceStrict: true,
      surveillanceLight: true,
      liveMonitoring: true,
      videoIntegration: true,
      partialGrading: true,
      timerPerQuestion: true,
      timerGlobal: true,
      customThemes: true,
      prioritySupport: true,
      dedicatedManager: true,
      multiAccountConsolidation: true,
    },
  },
};

// Feature labels for the comparison table
const FEATURE_LABELS = {
  autoGrading: 'Notation automatique',
  aiGeneration: 'Generation IA de questions',
  aiRemediation: 'Remediation IA',
  aiCommentary: 'Commentaires IA par eleve',
  exportPDF: 'Rapports PDF individuels',
  exportExcel: 'Export Excel des notes',
  exportCSV: 'Export CSV',
  surveillanceStrict: 'Surveillance stricte',
  surveillanceLight: 'Surveillance legere',
  liveMonitoring: 'Monitoring temps reel',
  videoIntegration: 'Integration video',
  partialGrading: 'Notes partielles',
  timerPerQuestion: 'Chronometre par question',
  timerGlobal: 'Chronometre global',
  customThemes: 'Themes personnalises',
  prioritySupport: 'Assistance prioritaire',
  dedicatedManager: 'Compte manager dedie',
  multiAccountConsolidation: 'Consolidation multi-comptes',
};

/**
 * Get plan definition by ID.
 */
function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

/**
 * Check if a plan has a specific feature.
 * @param {string} planId
 * @param {string} feature - feature key from PLANS[x].features
 * @returns {boolean|string}
 */
function hasFeature(planId, feature) {
  const plan = getPlan(planId);
  const val = plan.features[feature];
  if (val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (val === 'none') return false;
  return true; // 'basic' or 'full' both truthy
}

/**
 * Check if a plan limit is exceeded.
 * @returns {boolean} true if under limit (OK), false if exceeded
 */
function checkLimit(planId, limitKey, currentValue) {
  const plan = getPlan(planId);
  const limit = plan.limits[limitKey];
  if (limit === -1) return true;  // unlimited
  return currentValue < limit;
}

/**
 * Calculate price for a plan + seats + cycle.
 */
function calculatePrice(planId, seats, cycle) {
  const plan = getPlan(planId);
  const pricePerSeat = cycle === 'annual' ? plan.price.annual : plan.price.monthly;
  const isPerSeat = planId === 'establishment' || planId === 'pro';
  const totalMonthly = isPerSeat ? pricePerSeat * seats : pricePerSeat;
  const totalAnnual = totalMonthly * 12;
  const savingsPercent = plan.price.monthly > 0
    ? Math.round((1 - plan.price.annual / plan.price.monthly) * 100)
    : 0;

  return {
    pricePerSeat,
    totalMonthly,
    totalAnnual: cycle === 'annual' ? totalAnnual : null,
    savingsPercent,
    isPerSeat,
    currency: 'USD',
  };
}

module.exports = { PLANS, FEATURE_LABELS, getPlan, hasFeature, checkLimit, calculatePrice };
