import mongoose from 'mongoose';

const chatStateSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  userType: { type: String, default: null }, // 'employer' or 'worker'
  category: { type: String, default: null },
  location: { type: String, default: null },
  salary: { type: String, default: null },
  isComplete: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.ChatState || mongoose.model('ChatState', chatStateSchema);
