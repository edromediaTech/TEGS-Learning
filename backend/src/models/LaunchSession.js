const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Session de lancement cmi5.
 * Chaque lancement d'un AU genere une session avec un token unique.
 * Le AU utilise le fetch URL pour recuperer les infos de session (endpoint LRS, token auth).
 */
const launchSessionSchema = new mongoose.Schema(
  {
    // Token unique pour le fetch URL
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    // Registration ID cmi5 (identifie une inscription a un cours)
    registration: {
      type: String,
      required: true,
      default: () => crypto.randomUUID(),
    },
    // Module (cours) lance
    module_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    // Ecran specifique lance (AU)
    screen_id: {
      type: String,
      required: true,
    },
    // Utilisateur (acteur cmi5)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Tenant pour l'isolation
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    // Statut du cycle de vie cmi5
    status: {
      type: String,
      enum: ['created', 'fetched', 'launched', 'completed', 'terminated', 'abandoned'],
      default: 'created',
    },
    // Donnees cmi5 retournees au fetch
    launchData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Expiration (10 minutes apres creation)
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
  },
  { timestamps: true }
);

launchSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LaunchSession', launchSessionSchema);
