const mongoose = require('mongoose');

/**
 * Round de tournoi — chaque round pointe vers un Module (quiz/examen).
 * promoteTopX : nombre de candidats qualifiés pour le round suivant.
 */
const roundSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  label: {
    type: String,
    required: [true, 'Le label du round est requis'],
    trim: true,
  },
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    default: null,
  },
  section_index: {
    type: Number,
    default: null,
  },
  promoteTopX: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending',
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
});

/**
 * Dotation de prime pour le podium.
 */
const prizeSchema = new mongoose.Schema({
  rank: {
    type: Number,
    required: true,
    min: 1,
  },
  label: {
    type: String,
    default: '',
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['HTG', 'USD'],
    default: 'HTG',
  },
});

const tournamentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Le titre du tournoi est requis'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'registration', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },

    // --- Inscription ---
    registrationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      default: 'HTG',
    },
    maxParticipants: {
      type: Number,
      default: 0, // 0 = illimité
      min: 0,
    },
    registrationOpen: {
      type: Date,
      default: null,
    },
    registrationClose: {
      type: Date,
      default: null,
    },

    // --- Rounds (pipeline éliminatoire) ---
    rounds: [roundSchema],
    currentRound: {
      type: Number,
      default: 0,
    },

    // --- Podium & Primes ---
    prizes: [prizeSchema],

    // --- Accès public ---
    shareToken: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    // --- Multi-tenant ---
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'created_by est obligatoire'],
    },
  },
  { timestamps: true }
);

tournamentSchema.index({ tenant_id: 1, status: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
