const mongoose = require('mongoose');

/**
 * Schema TegScreenTrial.
 *
 * Suit les periodes d'essai gratuites par machine_id physique. Une fois
 * qu'une machine a consomme son essai, elle ne peut pas en redemander un
 * nouveau (meme apres reinstallation), parce que le machine_id WMIC reste
 * stable. Pour reactiver, il faut acheter un code (TegScreenCustomer).
 *
 * On stocke le statut explicite ('active' | 'expired' | 'converted') plutot
 * que de le recalculer depuis expiresAt — quand un client achete un code et
 * active sa licence, on bascule la trial en 'converted' pour pouvoir tracer
 * le funnel sur la page admin.
 */
const tegScreenTrialSchema = new mongoose.Schema(
  {
    machineId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // Email obligatoire — un email = un trial, jamais reutilisable.
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    label: { type: String, default: '', trim: true },
    durationDays: { type: Number, required: true, min: 1, max: 365 },
    startedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'converted'],
      default: 'active',
      index: true,
    },
    // Si converti vers une licence payante, pointer vers le customer.
    convertedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TegScreenCustomer',
      default: null,
    },
    // Last seen ping for "is this trial still in use" insights.
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TegScreenTrial', tegScreenTrialSchema);
