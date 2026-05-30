import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Application from '@/models/Application';
import { getJobs } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['pending', 'reviewed', 'contacted', 'hired', 'rejected'];

// Update an application's status. Only the employer who owns the job posting may do this.
export async function PATCH(request, { params }) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { status } = await request.json();
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();
    const application = await Application.findById(id).catch(() => null);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Ownership check: the job this application belongs to must be owned by the caller.
    const jobsCol = await getJobs();
    const job = await jobsCol.findOne({ _id: application.jobId });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const ownsJob =
      job.employer_id === auth.employer_id ||
      (auth.phone && (job.employer_phone === auth.phone || job.employer_phone === `whatsapp:${auth.phone}`));
    if (!ownsJob) {
      return NextResponse.json({ error: 'You do not have permission to update this application' }, { status: 403 });
    }

    application.status = status;
    await application.save();

    return NextResponse.json({
      success: true,
      application: { id: String(application._id), jobId: application.jobId, status: application.status },
    });
  } catch (error) {
    console.error('Application PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
