const mongoose = require('mongoose');

/**
 * Stores proctoring evidence (webcam snapshots, audio alerts, etc.)
 * captured during live exams and competitions.
 * Images are stored as base64 JPEG for post-exam review.
 */
const proctoringEvidenceSchema = new mongoose.Schema(
  {
    module_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    sessionKey: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      default: 'Anonyme',
    },

    // Evidence type
    type: {
      type: String,
      enum: ['snapshot', 'audio_alert', 'fullscreen_exit', 'blur'],
      required: true,
    },

    // Snapshot image (base64 JPEG, ~320x240 @ quality 0.5 ≈ 8-15 KB each)
    imageData: {
      type: String,
      default: null,
    },

    // Trigger context
    trigger: {
      type: String,
      enum: ['scheduled', 'manual', 'auto', 'contest_start', 'contest_end'],
      default: 'scheduled',
    },

    // For audio alerts
    audioLevel: { type: Number, default: null },

    // Contest context (if during a competition)
    questionIndex: { type: Number, default: null },

    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries by module + student
proctoringEvidenceSchema.index({ module_id: 1, sessionKey: 1, capturedAt: -1 });

// TTL: auto-delete evidence after 90 days
proctoringEvidenceSchema.index({ capturedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('ProctoringEvidence', proctoringEvidenceSchema);
