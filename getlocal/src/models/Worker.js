import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  workerPhone: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String, required: true },
  status: { type: String, default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Worker || mongoose.model('Worker', workerSchema);
