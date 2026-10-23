// Mongoose model pour les classes CRNS (instances d'un cours maitre).
// Phase 1.2 du parcours Depannage Smartphone.
//
// Concept : un Cours Maitre (ex: 'depannage_smartphone_v1') est instancie
// par N enseignants -> N CrnsClassroom, chacune avec sa cohorte d'eleves
// et son propre code de partage. Les eleves se rattachent via POST /:code/join.

const mongoose = require('mongoose');

const crnsClassroomSchema = new mongoose.Schema({
  course_id: { type: String, required: true, index: true },
  course_label: { type: String, default: '' },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  student_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archived_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'crns_classrooms',
});

crnsClassroomSchema.index({ tenant_id: 1, teacher_id: 1, archived_at: 1 });

module.exports = mongoose.models.CrnsClassroom || mongoose.model('CrnsClassroom', crnsClassroomSchema);
