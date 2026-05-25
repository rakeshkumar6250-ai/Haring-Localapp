import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  employerPhone: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String, required: true },
  status: { type: String, default: 'active' }, // active, matched, closed
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Job || mongoose.model('Job', jobSchema);
