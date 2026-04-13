const mongoose = require('mongoose');

/**
 * Transaction de paiement pour l'inscription aux tournois.
 * Supporte MonCash, Natcash, et Stripe.
 */
const transactionSchema = new mongoose.Schema(
  {
    participant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: [true, 'participant_id est requis'],
      index: true,
    },
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

    // --- Montant ---
    amount: {
      type: Number,
      required: [true, 'Le montant est requis'],
      min: 0,
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      default: 'HTG',
    },

    // --- Passerelle de paiement ---
    provider: {
      type: String,
      enum: ['moncash', 'natcash', 'stripe', 'manual'],
      required: [true, 'Le provider est requis'],
    },
    providerRef: {
      type: String,
      default: '',
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // --- Statut ---
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ tenant_id: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
