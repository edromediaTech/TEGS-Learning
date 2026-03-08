/**
 * Middleware d'isolation multi-tenant.
 *
 * REGLE D'OR : Ce middleware s'assure que le tenant_id est TOUJOURS present
 * dans le contexte de la requete. Il doit etre utilise APRES le middleware authenticate.
 *
 * Il fournit aussi un helper req.tenantFilter() qui retourne le filtre MongoDB
 * a inclure dans CHAQUE requete pour garantir l'isolation des donnees.
 */
function tenantIsolation(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({
      error: 'Contexte tenant manquant. Authentification requise.',
    });
  }

  /**
   * Helper : retourne { tenant_id: <ObjectId> } pour filtrer les requetes MongoDB.
   * Usage dans les controllers :
   *   const data = await Model.find({ ...req.tenantFilter(), ...autresFiltres });
   */
  req.tenantFilter = () => ({ tenant_id: req.tenantId });

  next();
}

module.exports = tenantIsolation;
