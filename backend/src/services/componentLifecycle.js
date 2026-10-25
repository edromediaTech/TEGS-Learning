/**
 * Cycle de vie des composants 3D du catalogue (QA a deux verrous).
 *
 *   DRAFT ──linter OK──> CI_PASSED ──soumission──> REVIEW_PENDING ──revue──> APPROVED | REJECTED
 *     ^                                                                          │
 *     └──────────── tout nouveau depot (GLB ou manifeste modifie) ───────────────┘
 *
 * Seuls les composants APPROVED sont servis aux cours (GET /api/v1/components/catalog).
 */

const STATUSES = ['DRAFT', 'CI_PASSED', 'REVIEW_PENDING', 'APPROVED', 'REJECTED'];

const TRANSITIONS = {
  DRAFT: ['CI_PASSED'],
  CI_PASSED: ['REVIEW_PENDING', 'DRAFT'],
  REVIEW_PENDING: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['DRAFT'],
  REJECTED: ['DRAFT', 'CI_PASSED'],
};

// Les 4 points de la check-list de revue humaine (verrou n°2), tous obligatoires.
const CHECKLIST = ['chaine_cinematique', 'raccordements', 'lisibilite', 'declenchement'];

const CHECKLIST_LABELS = {
  chaine_cinematique: 'Chaîne cinématique : l\'actionneur entraîne bien la tringlerie et le contact',
  raccordements: 'Raccordements réalistes : les fils sont logés dans les cages de bornes sous les vis',
  lisibilite: 'Lisibilité des organes clés : bobine, bilame et chambre d\'arc bien distincts',
  declenchement: 'Comportement sous déclenchement : l\'animation de coupure s\'effectue sans anomalie visuelle',
};

// Roles autorises a approuver ou rejeter (inspecteurs).
const REVIEWER_ROLES = ['admin_ddene', 'superadmin'];

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function statusAfterLint(report) {
  return report?.ok ? 'CI_PASSED' : 'DRAFT';
}

function missingChecklist(checklist = {}) {
  return CHECKLIST.filter((k) => checklist[k] !== true);
}

module.exports = { STATUSES, TRANSITIONS, CHECKLIST, CHECKLIST_LABELS, REVIEWER_ROLES, canTransition, statusAfterLint, missingChecklist };
