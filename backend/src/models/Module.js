const mongoose = require('mongoose');

// --- Bloc de contenu (extensible JSON) ---
const contentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'text', 'media', 'quiz',
      'heading', 'separator', 'image', 'text_image', 'video', 'audio', 'pdf', 'embed',
      'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer', 'callout',
    ],
    required: [true, 'Le type de bloc est requis'],
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {},
  },
});

const screenSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre de l\'ecran est requis'],
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  contentBlocks: [contentBlockSchema],
});

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre de la section est requis'],
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  screens: [screenSchema],
});

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Le titre du module est requis'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      enum: ['fr', 'ht', 'en'],
      default: 'fr',
    },
    coverImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    theme: {
      type: String,
      enum: ['ddene', 'nature', 'contrast', 'ocean', 'sunset'],
      default: 'ddene',
    },
    shareToken: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    shareEnabled: {
      type: Boolean,
      default: false,
    },
    surveillanceMode: {
      type: String,
      enum: ['light', 'strict'],
      default: 'light',
    },
    globalTimeLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    evaluationType: {
      type: String,
      enum: ['live', 'personalized'],
      default: 'personalized',
    },
    liveStartTime: {
      type: Date,
      default: null,
    },
    liveEndTime: {
      type: Date,
      default: null,
    },
    contestMode: {
      type: Boolean,
      default: false,
    },
    proctoring: {
      type: String,
      enum: ['none', 'snapshot', 'video'],
      default: 'none',
    },
    snapshotInterval: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    strictSettings: {
      fullscreen: {
        type: Boolean,
        default: true,
      },
      antiCopy: {
        type: Boolean,
        default: true,
      },
      blurDetection: {
        type: Boolean,
        default: true,
      },
      maxBlurCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 20,
      },
      autoSubmitOnExceed: {
        type: Boolean,
        default: false,
      },
    },
    sections: [sectionSchema],
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenant_id est obligatoire'],
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'created_by est obligatoire'],
    },
  },
  { timestamps: true }
);

moduleSchema.index({ tenant_id: 1, status: 1 });

module.exports = mongoose.model('Module', moduleSchema);
