const mongoose = require('mongoose');

/**
 * Etat de synchronisation d'un noeud TEGS-Edge (document unique, _id 'state').
 * N'existe que sur un noeud en EDGE_MODE.
 */
const installedSchema = new mongoose.Schema(
  {
    version: String,
    sha256: String, // empreinte du paquet cmi5 installe
    glb: String,
    installed_at: Date,
  },
  { _id: false }
);

const edgeStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'state' },
    roster_cursor: { type: String, default: null },
    course_cursor: { type: String, default: null },
    installed: { type: Map, of: installedSchema, default: {} },
    last_pull_ok_at: Date,
    last_push_ok_at: Date,
    last_error: String,
    last_error_at: Date,
    consecutive_failures: { type: Number, default: 0 },
    next_attempt_at: Date,
    clock_offset_ms: Number,
  },
  { timestamps: true }
);

edgeStateSchema.statics.load = async function load() {
  return (await this.findById('state')) || this.create({ _id: 'state' });
};

module.exports = mongoose.model('EdgeState', edgeStateSchema);
