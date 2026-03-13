const mongoose = require('mongoose');

/**
 * Schema Tenant (Ecole).
 * Chaque tenant represente une ecole inscrite dans le systeme TEGS-Learning.
 * L'isolation multi-tenant repose sur le _id de ce document, reference comme tenant_id partout.
 */
const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom de l\'ecole est requis'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Le code unique de l\'ecole est requis'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    contactEmail: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      // Champ libre pour configuration future par ecole (ex: theme, langue, etc.)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // --- Subscription / Billing ---
    subscriptionPlan: {
      type: String,
      enum: ['free', 'individual', 'establishment', 'pro'],
      default: 'free',
    },
    seatsCount: {
      type: Number,
      default: 1,
      min: 1,
      max: 500,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);
