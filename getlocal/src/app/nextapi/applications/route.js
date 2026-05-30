import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Application from '@/models/Application';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Submit an application for a job (authenticated users only).
export async function POST(request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Please log in to apply for jobs.' }, { status: 401 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Application.findOne({ jobId, userId: auth.employer_id });
    if (existing) {
      return NextResponse.json({ error: 'You have already applied for this job.' }, { status: 409 });
    }

    const application = await Application.create({ jobId, userId: auth.employer_id });

    return NextResponse.json(
      { success: true, application: { id: String(application._id), jobId, status: application.status } },
      { status: 201 }
    );
  } catch (error) {
    // Duplicate key (race condition on the unique index)
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'You have already applied for this job.' }, { status: 409 });
    }
    console.error('Application POST error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}

// Return the jobIds the authenticated user has already applied to (for UI state).
export async function GET(request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ appliedJobIds: [] });

    await dbConnect();
    const apps = await Application.find({ userId: auth.employer_id }).select('jobId').lean();
    return NextResponse.json({ appliedJobIds: apps.map((a) => a.jobId) });
  } catch (error) {
    console.error('Application GET error:', error);
    return NextResponse.json({ appliedJobIds: [] });
  }
}
