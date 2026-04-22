import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, index: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'admin'], default: 'doctor' },
  totpSecret: { type: String },
  isTotpEnabled: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema, 'users');
