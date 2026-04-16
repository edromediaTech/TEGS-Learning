/**
 * Configuration centrale du module Agentic Layer.
 *
 * Definit les profils par role, les tools autorises, les limites
 * de debit et le seuil d'anomalie pour le Panic Mode automatique.
 */

// ── Feature flag global ──────────────────────────────────────
function isAgentEnabled() {
  return process.env.PROCESS_AGENTIC_ON === 'true';
}

// ── Seuil anomalie (auto-panic) ──────────────────────────────
const ANOMALY_THRESHOLD = 100; // requetes globales par minute
const ANOMALY_WINDOW_MS = 60 * 1000;

// ── Profils par role ─────────────────────────────────────────
const AGENT_PROFILES = {
  // Profil public — visiteurs non connectes
  public: {
    profileName: 'Ambassadeur Public',
    description: 'Aide a l\'inscription, presentation des concours, FAQ generale',
    allowedTools: ['searchDocumentation', 'tournamentList'],
    canMutate: false,
    maxRequestsPerHour: 10,
  },
  student: {
    profileName: 'Assistant Candidat',
    description: 'Aide a l\'inscription, FAQ, conseils pedagogiques',
    allowedTools: ['searchDocumentation', 'faq', 'tournamentList', 'tournamentDetail'],
    canMutate: false,
    maxRequestsPerHour: 20,
  },
  authorized_agent: {
    profileName: 'Comptable Agent',
    description: 'Calcul commissions, quotas, bordereaux',
    allowedTools: [
      'searchDocumentation',
      'faq',
      'tournamentList',
      'participantSearch',
      'commissionCalc',
      'quotaStatus',
      'reportGenerate',
    ],
    canMutate: false,
    maxRequestsPerHour: 30,
  },
  teacher: {
    profileName: 'Assistant Enseignant',
    description: 'Aide aux modules et tournois',
    allowedTools: ['searchDocumentation', 'faq', 'tournamentList', 'tournamentDetail', 'moduleList'],
    canMutate: false,
    maxRequestsPerHour: 25,
  },
  admin_ddene: {
    profileName: 'Architecte Admin',
    description: 'Creation tournois, rapports, analyses, gestion',
    allowedTools: [
      'searchDocumentation',
      'faq',
      'tournamentList',
      'tournamentDetail',
      'tournamentCreate',
      'participantSearch',
      'moduleList',
      'analyticsOverview',
      'commissionCalc',
      'quotaStatus',
      'reportGenerate',
      'userSearch',
    ],
    canMutate: true,
    maxRequestsPerHour: 50,
  },
  superadmin: {
    profileName: 'Architecte SuperAdmin',
    description: 'Acces complet cross-tenant avec outils admin agent',
    allowedTools: [
      'searchDocumentation',
      'faq',
      'tournamentList',
      'tournamentDetail',
      'tournamentCreate',
      'participantSearch',
      'moduleList',
      'analyticsOverview',
      'commissionCalc',
      'quotaStatus',
      'reportGenerate',
      'userSearch',
      'agentAdmin',
    ],
    canMutate: true,
    maxRequestsPerHour: 50,
  },
};

/**
 * Retourne le profil agent pour un role donne, ou null si le role
 * n'a pas de profil agentique.
 */
function getProfileForRole(role) {
  return AGENT_PROFILES[role] || null;
}

module.exports = {
  isAgentEnabled,
  getProfileForRole,
  AGENT_PROFILES,
  ANOMALY_THRESHOLD,
  ANOMALY_WINDOW_MS,
};
