const mongoose = require('mongoose');

/**
 * Résultat détaillé d'un quiz par participant.
 * Stocke chaque réponse individuelle pour le reporting PDF/Excel
 * et l'analyse IA (commentaire + remédiation).
 */
const answerSchema = new mongoose.Schema({
  blockId: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  questionType: {
    type: String,
    enum: ['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer'],
    required: true,
  },
  questionText: { type: String, required: true },
  choices: { type: mongoose.Schema.Types.Mixed, default: null }, // QCM choices, matching pairs, etc.
  studentAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, default: 0 },
  maxPoints: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
});

const quizResultSchema = new mongoose.Schema(
  {
    module_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'module_id est requis'],
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id est requis'],
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },
    studentName: { type: String, required: true },
    studentEmail: { type: String, default: '' },
    moduleTitle: { type: String, required: true },

    // Scores
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },

    // Timing
    duration: { type: String, default: '' }, // ISO 8601
    completedAt: { type: Date, default: Date.now },

    // Evaluation mode metadata
    evaluationType: { type: String, enum: ['live', 'personalized'], default: 'personalized' },
    autoSubmitted: { type: Boolean, default: false },

    // Per-question answers
    answers: [answerSchema],

    // AI-generated commentary
    ai_commentary: { type: String, default: '' },

    // AI remediation quiz (generated JSON)
    remediation: {
      generated: { type: Boolean, default: false },
      generatedAt: { type: Date },
      quiz: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  { timestamps: true }
);

quizResultSchema.index({ tenant_id: 1, module_id: 1 });
quizResultSchema.index({ tenant_id: 1, user_id: 1 });
quizResultSchema.index({ module_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);
