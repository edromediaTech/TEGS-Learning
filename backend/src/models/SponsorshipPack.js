const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Pack de parrainage — une institution paie pour X candidats.
 * Génère un SponsorCode que les élèves saisissent à l'inscription.
 */
const sponsorshipPackSchema = new mongoose.Schema(
  {
    tournament_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'tournament_id requis'],
      index: true,
    },
    sponsor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor',
      default: null,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // --- Parrain ---
    sponsorName: {
      type: String,
      required: [true, 'Nom du parrain requis'],
      trim: true,
    },
    sponsorType: {
      type: String,
      enum: ['mairie', 'entreprise', 'ong', 'ecole', 'particulier', 'gouvernement'],
      default: 'entreprise',
    },

    // --- Code promo ---
    code: {
      type: String,
      unique: true,
      index: true,
    },

    // --- Quota ---
    maxUses: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },

    // --- Financier ---
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      default: 'HTG',
    },
    pricePerCandidate: {
      type: Number,
      default: 0,
    },

    // --- Contraintes ---
    district: {
      type: String,
      default: '',
    },
    establishment: {
      type: String,
      default: '',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Générer un code unique avant sauvegarde.
 */
sponsorshipPackSchema.pre('save', function (next) {
  if (!this.code) {
    this.code = 'BOURSE-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('SponsorshipPack', sponsorshipPackSchema);
