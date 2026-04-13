const mongoose = require('mongoose');

/**
 * Vote du public pour un candidat.
 * Un vote par IP par heure par tournoi pour éviter le spam.
 */
const voteSchema = new mongoose.Schema(
  {
    tournament_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    participant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
      index: true,
    },
    voterIp: {
      type: String,
      required: true,
    },
    voterSession: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Un vote par IP par participant par heure (géré dans la route, index pour perf)
voteSchema.index({ tournament_id: 1, participant_id: 1, voterIp: 1, createdAt: -1 });
voteSchema.index({ tournament_id: 1, participant_id: 1 });

module.exports = mongoose.model('Vote', voteSchema);
