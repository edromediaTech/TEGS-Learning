/**
 * Registre central des outils agentiques.
 *
 * Charge tous les outils, les expose par ID et fournit
 * des helpers pour filtrer par role et generer les schemas LLM.
 */

const { getProfileForRole } = require('../../config/agentConfig');

// Charger tous les outils
const tools = new Map();

const toolModules = [
  require('./faq'),
  require('./tournamentList'),
  require('./tournamentDetail'),
  require('./tournamentCreate'),
  require('./participantSearch'),
  require('./moduleList'),
  require('./analyticsOverview'),
  require('./commissionCalc'),
  require('./quotaStatus'),
  require('./reportGenerate'),
  require('./userSearch'),
  require('./agentAdmin'),
  require('./searchDocumentation'),
];

for (const tool of toolModules) {
  tools.set(tool.id, tool);
}

/**
 * Retourne un outil par son ID.
 * @param {string} toolId
 * @returns {object|null}
 */
function getTool(toolId) {
  return tools.get(toolId) || null;
}

/**
 * Retourne les outils accessibles pour un role donne.
 * Filtre base sur le profil agentConfig + la verification canAccess du tool.
 *
 * @param {string} role
 * @returns {object[]} Liste d'outils
 */
function getToolsForRole(role) {
  const profile = getProfileForRole(role);
  if (!profile) return [];

  return profile.allowedTools
    .map((toolId) => tools.get(toolId))
    .filter((tool) => tool && tool.canAccess(role));
}

/**
 * Retourne les schemas JSON des outils pour un role donne.
 * Ces schemas sont embarques dans le system prompt du LLM.
 *
 * @param {string} role
 * @returns {object[]} Schemas JSON
 */
function getToolSchemas(role) {
  return getToolsForRole(role).map((tool) => tool.toSchema());
}

/**
 * Retourne tous les outils (pour le registre admin).
 */
function getAllTools() {
  return Array.from(tools.values());
}

module.exports = {
  tools,
  getTool,
  getToolsForRole,
  getToolSchemas,
  getAllTools,
};
