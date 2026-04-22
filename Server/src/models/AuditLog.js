import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  action: { type: String, required: true },
  patient_id: { type: String },
  details: { type: String },
  ip: { type: String }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

export default mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
