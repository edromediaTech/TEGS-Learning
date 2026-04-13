const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Résultat d'un participant pour un round spécifique.
 */
const roundResultSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true,
  },
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
  },
  quizResult_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizResult',
  },
  score: {
    type: Number,
    default: 0,
  },
  maxScore: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  duration: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'qualified', 'eliminated'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

const participantSchema = new mongoose.Schema(
  {
    tournament_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'tournament_id est requis'],
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },

    // --- Identité (supports guest / public registration) ---
    firstName: {
      type: String,
      required: [true, 'Le prénom est requis'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    establishment: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },

    // --- Ticket d'accès ---
    competitionToken: {
      type: String,
      unique: true,
      index: true,
    },

    // --- Statut global ---
    status: {
      type: String,
      enum: ['registered', 'qualified', 'eliminated', 'winner', 'disqualified'],
      default: 'registered',
    },

    // --- Progression par round ---
    roundResults: [roundResultSchema],

    // --- Classement final ---
    finalRank: {
      type: Number,
      default: null,
    },
    totalScore: {
      type: Number,
      default: 0,
    },

    // --- Paiement ---
    paid: {
      type: Boolean,
      default: false,
    },
    transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

// Un participant ne peut s'inscrire qu'une fois à un tournoi
participantSchema.index({ tournament_id: 1, email: 1 }, { unique: true });
participantSchema.index({ tenant_id: 1, tournament_id: 1 });

/**
 * Génère un competitionToken unique avant sauvegarde.
 */
participantSchema.pre('save', function (next) {
  if (!this.competitionToken) {
    this.competitionToken = 'TKT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Participant', participantSchema);
