import { NextResponse } from 'next/server';
import connectMongoose from '@/lib/mongoose';
import ChatState from '@/models/ChatState'; // ChatState is the only Mongoose model left
import { getCandidates, getJobs } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Simple MVP Security: Require a secret key in the query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unified data: read jobs & candidates directly from native MongoDB.
    const candidatesCol = await getCandidates();
    const jobsCol = await getJobs();

    const workers = await candidatesCol.find({}).sort({ created_at: -1 }).limit(200).toArray();
    const jobs = await jobsCol.find({}).sort({ created_at: -1 }).limit(100).toArray();

    // Live WhatsApp conversations still in progress (Mongoose ChatState).
    await connectMongoose();
    const activeChats = await ChatState.find({ isComplete: false }).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ workers, jobs, activeChats });
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
