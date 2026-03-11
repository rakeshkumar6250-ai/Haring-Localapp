import { NextResponse } from 'next/server';
import { getOutgoingLog } from '@/lib/mongodb';

// GET: Fetch notification log with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const jobId = searchParams.get('job_id');
    const candidateId = searchParams.get('candidate_id');
    const limit = parseInt(searchParams.get('limit')) || 50;

    const filter = {};
    if (type) filter.type = type;
    if (jobId) filter.job_id = jobId;
    if (candidateId) filter.candidate_id = candidateId;

    const outgoingLog = await getOutgoingLog();
    const logs = await outgoingLog.find(filter).sort({ created_at: -1 }).limit(limit).toArray();

    const stats = {
      total: await outgoingLog.countDocuments(),
      employer_alerts: await outgoingLog.countDocuments({ type: 'employer_match_alert' }),
      candidate_alerts: await outgoingLog.countDocuments({ type: 'candidate_job_alert' }),
    };

    return NextResponse.json({ notifications: logs, stats, count: logs.length });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
