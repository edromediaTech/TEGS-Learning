const mongoose = require('mongoose');

/**
 * Schema TegScreenCustomer.
 *
 * Represente une licence TegScreen vendue : un nom de client, un code
 * d'activation a 8 chiffres, et deux capacites :
 *
 *   - numPcs            : nombre maximum de PC autorises a utiliser ce code
 *                          (chaque PC est identifie par un machine_id stable —
 *                          UUID materiel + MAC). Une reinstallation depuis le
 *                          meme PC garde le meme machine_id et n'occupe pas
 *                          un nouveau slot.
 *   - numPhonesPerPc    : nombre maximum de telephones connectes simultanement
 *                          sur un meme PC (applique cote runtime TegScreen).
 *
 * Cycle de vie :
 *   - status='pending' : code emis, jamais utilise
 *   - status='active'  : >=1 PC active. Tant que machines.length < numPcs,
 *                        d'autres PC peuvent activer avec le meme code.
 *   - status='revoked' : licence desactivee par un admin.
 */
const machineSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true, trim: true },
    label: { type: String, default: '' },
    activatedAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const tegScreenCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du client est requis'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^\d{8}$/,
    },
    numPcs: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      default: 1,
    },
    numPhonesPerPc: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'revoked'],
      default: 'pending',
      index: true,
    },
    machines: {
      type: [machineSchema],
      default: [],
    },
    // Email obligatoire — utilise comme identifiant a l'activation et
    // pour l'envoi du code 8-chiffres. Un email = un customer.
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    notes: { type: String, default: '', trim: true },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TegScreenCustomer', tegScreenCustomerSchema);
