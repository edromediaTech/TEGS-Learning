const mongoose = require('mongoose');

/**
 * Journal d'audit de toutes les interactions avec l'agent IA.
 * Chaque message, appel d'outil ou proposition est enregistre ici
 * pour tracabilite complete.
 */
const agentAuditLogSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin_ddene', 'teacher', 'student', 'authorized_agent'],
      required: true,
    },
    action: {
      type: String,
      required: true, // tool name ou 'chat'
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // message utilisateur ou parametres tool (sanitise)
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // resume de la reponse agent
    },
    status: {
      type: String,
      enum: ['success', 'error', 'rejected', 'pending_confirmation', 'confirmed', 'panic_killed'],
      required: true,
    },
    confirmedByUser: {
      type: Boolean,
      default: null, // null = pas une mutation, true/false = confirmation mutation
    },
    executionMs: {
      type: Number,
      default: 0,
    },
    tokenUsage: {
      type: Number,
      default: 0, // estimation des tokens consommes
    },
    modelUsed: {
      type: String,
      default: 'gemini-2.0-flash',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

agentAuditLogSchema.index({ tenant_id: 1, createdAt: -1 });
agentAuditLogSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('AgentAuditLog', agentAuditLogSchema);
