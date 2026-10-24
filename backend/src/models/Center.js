const mongoose = require('mongoose');

/**
 * Centre TEGS-Edge : une salle / un noeud physique hors ligne (serveur local + postes
 * clients), rattache a son etablissement parent (tenant_id = institution_id du CDC).
 *
 * Le noeud s'authentifie avec un jeton (X-Center-ID + Authorization: Bearer). Seule
 * l'empreinte SHA-256 du jeton est stockee : le jeton en clair n'est montre qu'une
 * fois, a la creation ou a la rotation.
 */
const centerSchema = new mongoose.Schema(
  {
    // Identifiant lisible du centre, ex. CRNS-NORD-EST-01 (CDC : center_id).
    center_id: {
      type: String,
      required: [true, 'center_id est requis'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9][A-Z0-9-]{2,63}$/, 'center_id : lettres, chiffres et tirets (3 a 64)'],
    },
    name: {
      type: String,
      required: [true, 'Le nom du centre est requis'],
      trim: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id (etablissement parent) est requis'],
      index: true,
    },
    // Classes servies par ce centre : leur roster est envoye au noeud.
    classroom_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CrnsClassroom' }],
    // Simulations CRNS installees sur le noeud ; vide = tout le catalogue.
    simulation_ids: [{ type: String, trim: true }],
    // Modules de cours (quiz, TP) installes sur le noeud ; vide = modules publies de l'etablissement.
    module_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],

    token_hash: { type: String, required: true, select: false },
    token_prefix: { type: String, default: '' }, // debut du jeton, pour l'identifier sans le reveler
    token_rotated_at: { type: Date, default: Date.now },

    isActive: { type: Boolean, default: true },

    // Etat remonte par le noeud
    edge_version: { type: String, default: '' },
    last_seen_at: { type: Date, default: null },
    last_pull_at: { type: Date, default: null },
    last_push_at: { type: Date, default: null },
    // Ecart d'horloge mesure au dernier push (serveur - noeud), en ms.
    last_clock_offset_ms: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Center', centerSchema);
