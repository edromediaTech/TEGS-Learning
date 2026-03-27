const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schema User.
 * Chaque utilisateur est lie a un Tenant (ecole) via tenant_id.
 * Roles possibles : superadmin (global), admin_ddene (admin ecole), teacher, student.
 * Le champ tenant_id est OBLIGATOIRE et indexe pour garantir l'isolation multi-tenant.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caracteres'],
      select: false, // Ne pas retourner le mot de passe par defaut dans les requetes
    },
    firstName: {
      type: String,
      required: [true, 'Le prenom est requis'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin_ddene', 'teacher', 'student'],
      default: 'student',
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Phase 5: district & class for analytics filtering
    district: {
      type: String,
      trim: true,
      default: '',
    },
    className: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Index compose : un email doit etre unique PAR tenant (une meme personne peut exister dans 2 ecoles)
userSchema.index({ email: 1, tenant_id: 1 }, { unique: true });

/**
 * Validation : tenant_id obligatoire sauf pour superadmin.
 */
userSchema.pre('validate', function (next) {
  if (this.role !== 'superadmin' && !this.tenant_id) {
    this.invalidate('tenant_id', 'Le tenant_id (ecole) est obligatoire pour ce role');
  }
  next();
});

/**
 * Hash du mot de passe avant sauvegarde.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Compare un mot de passe candidat au hash stocke.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
