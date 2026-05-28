import mongoose from 'mongoose';

const chatStateSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  userType: { type: String, default: null }, // 'employer' or 'worker'
  name: { type: String, default: null },
  category: { type: String, default: null },
  location: { type: String, default: null },
  salary: { type: String, default: null },
  documentUrl: { type: String, default: null }, // Stores the Twilio Media URL
  audioInterviewUrl: { type: String, default: null }, // Persisted voice-note archive URL
  isComplete: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.ChatState || mongoose.model('ChatState', chatStateSchema);
