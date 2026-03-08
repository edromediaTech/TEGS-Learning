const mongoose = require('mongoose');

/**
 * Liste des verbes xAPI autorises dans TEGS-Learning.
 * Basee sur le profil cmi5 et les verbes ADL courants.
 * Chaque verbe est identifie par son IRI officiel.
 */
const VALID_VERB_IDS = [
  'http://adlnet.gov/expapi/verbs/initialized',
  'http://adlnet.gov/expapi/verbs/completed',
  'http://adlnet.gov/expapi/verbs/passed',
  'http://adlnet.gov/expapi/verbs/failed',
  'http://adlnet.gov/expapi/verbs/scored',
  'http://adlnet.gov/expapi/verbs/attempted',
  'http://adlnet.gov/expapi/verbs/experienced',
  'http://adlnet.gov/expapi/verbs/answered',
  'http://adlnet.gov/expapi/verbs/suspended',
  'http://adlnet.gov/expapi/verbs/terminated',
  'http://adlnet.gov/expapi/verbs/voided',
];

/**
 * Schema Statement xAPI.
 * Chaque statement represente une trace d'apprentissage emise par un utilisateur.
 * Structure conforme a la norme xAPI (actor, verb, object, result, context).
 *
 * ISOLATION : tenant_id est OBLIGATOIRE et indexe.
 * actor.user_id reference le User Mongoose qui a emis le statement.
 */
const statementSchema = new mongoose.Schema(
  {
    // Identifiant unique du statement (UUID xAPI)
    statementId: {
      type: String,
      required: true,
      unique: true,
    },

    // --- ACTOR : Qui a realise l'action ---
    actor: {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'actor.user_id est requis'],
      },
      name: {
        type: String,
        required: [true, 'actor.name est requis'],
      },
      mbox: {
        type: String,
        required: [true, 'actor.mbox est requis'],
      },
    },

    // --- VERB : Quelle action a ete realisee ---
    verb: {
      id: {
        type: String,
        required: [true, 'verb.id est requis'],
        enum: {
          values: VALID_VERB_IDS,
          message: 'Verbe xAPI non reconnu : {VALUE}',
        },
      },
      display: {
        type: Map,
        of: String,
        required: [true, 'verb.display est requis'],
      },
    },

    // --- OBJECT : Sur quoi porte l'action (activite/module) ---
    object: {
      id: {
        type: String,
        required: [true, 'object.id est requis'],
      },
      objectType: {
        type: String,
        default: 'Activity',
      },
      definition: {
        name: {
          type: Map,
          of: String,
        },
        description: {
          type: Map,
          of: String,
        },
        type: {
          type: String,
        },
      },
    },

    // --- RESULT : Score, reussite, duree ---
    result: {
      score: {
        scaled: { type: Number, min: 0, max: 1 },
        raw: { type: Number },
        min: { type: Number },
        max: { type: Number },
      },
      success: { type: Boolean },
      completion: { type: Boolean },
      duration: { type: String }, // Format ISO 8601 (ex: "PT30M")
      response: { type: String },
    },

    // --- CONTEXT : Tenant et extensions ---
    context: {
      registration: { type: String },
      extensions: {
        type: mongoose.Schema.Types.Mixed,
      },
    },

    // --- ISOLATION MULTI-TENANT ---
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },

    // Timestamp xAPI (moment ou l'action a eu lieu, peut differer de createdAt)
    timestamp: {
      type: Date,
      default: Date.now,
    },

    // Flag pour le voiding xAPI
    voided: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index compose pour les requetes courantes (traces par user dans un tenant)
statementSchema.index({ tenant_id: 1, 'actor.user_id': 1 });
statementSchema.index({ tenant_id: 1, 'verb.id': 1 });
statementSchema.index({ tenant_id: 1, 'object.id': 1 });

module.exports = mongoose.model('Statement', statementSchema);
module.exports.VALID_VERB_IDS = VALID_VERB_IDS;
