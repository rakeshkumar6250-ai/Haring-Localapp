import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import ChatState from '@/models/ChatState';
import { getJobs, getCandidates } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Simple MVP Security: Require a secret key in the header or query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const chatStates = await ChatState.find().sort({ updatedAt: -1 });

    // Unified data: read jobs & candidates directly from native MongoDB.
    const jobsCol = await getJobs();
    const candidatesCol = await getCandidates();

    const rawJobs = await jobsCol.find().sort({ created_at: -1 }).limit(100).toArray();
    const rawCandidates = await candidatesCol
      .find()
      .sort({ updated_at: -1, created_at: -1 })
      .limit(200)
      .toArray();

    // Normalize to the shape the admin dashboard renders.
    const jobs = rawJobs.map((j) => ({
      _id: String(j._id),
      createdAt: j.created_at || j.createdAt || null,
      employerPhone: j.employer_phone || j.employerPhone || '—',
      category: j.category || '—',
      location: j.location?.label || j.location || '—',
      salary: j.salary || '—',
    }));

    const workers = rawCandidates.map((c) => ({
      _id: String(c._id),
      workerPhone: c.phone || c.workerPhone || '—',
      category: c.role_category || c.category || '—',
      location: c.address || c.location || '—',
      salary: c.salary_expected || c.salary || '—',
      audio_interview_url: c.audio_interview_url || null,
      source: c.source || 'web',
    }));

    return NextResponse.json({ chatStates, jobs, workers });
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
