const mongoose = require('mongoose');

/**
 * Persists the state of a live/timed exam session per student.
 * Allows timer to survive page refreshes and prevents clock manipulation.
 */
const liveSessionSchema = new mongoose.Schema(
  {
    module_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    sessionKey: {
      type: String,
      required: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // Student identification
    studentName: { type: String, default: '' },
    studentEmail: { type: String, default: '' },

    // Timer state (all times are server-side UTC)
    startedAt: { type: Date, required: true },
    totalSeconds: { type: Number, required: true },
    elapsedSeconds: { type: Number, default: 0 },
    lastTickAt: { type: Date, required: true },

    // Session status
    status: {
      type: String,
      enum: ['active', 'submitted', 'expired'],
      default: 'active',
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

liveSessionSchema.index({ module_id: 1, sessionKey: 1 }, { unique: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
