const mongoose = require('mongoose');

/**
 * Sponsor / Partenaire d'un tournoi.
 * Tiers: diamond > gold > silver > bronze
 * Types: commercial, public, individual, school
 */
const sponsorSchema = new mongoose.Schema(
  {
    tournament_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'tournament_id est requis'],
      index: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },

    // --- Identité ---
    name: {
      type: String,
      required: [true, 'Le nom du sponsor est requis'],
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    slogan: {
      type: String,
      default: '',
    },
    contactEmail: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      default: '',
    },

    // --- Classification ---
    type: {
      type: String,
      enum: ['commercial', 'public', 'individual', 'school'],
      default: 'commercial',
    },
    tier: {
      type: String,
      enum: ['diamond', 'gold', 'silver', 'bronze'],
      default: 'bronze',
    },

    // --- Contribution ---
    amountInvested: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      default: 'HTG',
    },
    inKindDescription: {
      type: String,
      default: '',
    },

    // --- Visibilité ---
    showOnTicket: {
      type: Boolean,
      default: true,
    },
    showOnCertificate: {
      type: Boolean,
      default: true,
    },
    showOnArena: {
      type: Boolean,
      default: true,
    },
    showOnMobile: {
      type: Boolean,
      default: false,
    },

    // --- Analytics ---
    impressions: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

sponsorSchema.index({ tournament_id: 1, tier: 1 });

module.exports = mongoose.model('Sponsor', sponsorSchema);
