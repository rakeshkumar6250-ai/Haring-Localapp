import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import ChatState from '@/models/ChatState';
import Job from '@/models/Job';
import Worker from '@/models/Worker';

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
    const jobs = await Job.find().sort({ createdAt: -1 });
    const workers = await Worker.find().sort({ createdAt: -1 });

    return NextResponse.json({ chatStates, jobs, workers });
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
