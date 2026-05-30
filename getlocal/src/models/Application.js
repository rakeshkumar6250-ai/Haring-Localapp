import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  // jobId/userId are stored as strings: native `jobs` use string _ids
  // (e.g. `wa_job_...` or uuid) and employer accounts use uuid _ids.
  jobId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate applications for the same job by the same user.
applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);
