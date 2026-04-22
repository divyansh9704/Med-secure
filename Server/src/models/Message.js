import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  senderUsername: { type: String },
  recipient: { type: String, required: true, index: true },
  recipientUsername: { type: String },
  patient_id: { type: String, required: true },
  patient_name: { type: String, required: true },
  // Optional Cloudinary URLs
  file_url: { type: String }, // stego file
  original_file_url: { type: String }, // original cover file
  // Packaged fallback structure
  packagedFile: {
    b64: String,
    mime: String,
    filename: String,
    stego: {
      b64: String,
      mime: String,
      filename: String
    },
    original: {
      b64: String,
      mime: String,
      filename: String
    }
  },
  cipher_text: { type: String, required: true },
  mono_cipher: { type: String },
  vigenere_cipher: { type: String },
  decrypted_message: { type: String },
  decrypted: { type: Boolean, default: false },
  decrypted_at: { type: Date }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.model('Message', messageSchema, 'messages');
