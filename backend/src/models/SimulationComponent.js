const mongoose = require('mongoose');
const { STATUSES, CHECKLIST } = require('../services/componentLifecycle');

/**
 * Composant 3D interactif du catalogue CRNS (disjoncteur, prise, borne...) : paquet
 * component.glb + component.json (crns-component/1), qualifie par deux verrous :
 *   1. linter automatique au depot (rapport dans lint_report) -> CI_PASSED ou DRAFT ;
 *   2. revue humaine dans le cockpit (check-list a 4 points) -> APPROVED ou REJECTED.
 * Seuls les APPROVED sont servis aux cours (GET /api/v1/components/catalog).
 *
 * Le GLB est stocke dans le document (composants sobres : quelques centaines de Ko, borne
 * par la limite JSON de 5 Mo) ; a deplacer vers le stockage objet si le catalogue grossit.
 */
const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const simulationComponentSchema = new mongoose.Schema(
  {
    component_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[a-z0-9_]+$/, 'component_id : minuscules, chiffres et _'],
    },
    title: { type: String, required: true, trim: true },
    version: { type: String, required: true, match: /^\d+\.\d+\.\d+$/ },
    category: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'DRAFT', index: true },

    manifest: { type: mongoose.Schema.Types.Mixed, required: true },
    manifest_sha256: { type: String, required: true },
    glb: { type: Buffer, required: true, select: false },
    glb_sha256: { type: String, required: true },
    size_bytes: { type: Number, required: true },

    lint_report: { type: mongoose.Schema.Types.Mixed, default: null },

    review: {
      checklist: { type: Object, default: () => Object.fromEntries(CHECKLIST.map((k) => [k, false])) },
      reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      decided_at: { type: Date, default: null },
      comment: { type: String, default: '' },
    },
    history: { type: [historySchema], default: [] },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SimulationComponent', simulationComponentSchema);
