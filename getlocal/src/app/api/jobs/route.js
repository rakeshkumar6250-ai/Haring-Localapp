import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/mongodb';

export async function GET() {
  try {
    const jobs = await getJobs();
    const allJobs = await jobs.find({}).sort({ created_at: -1 }).toArray();
    
    // Calculate total credits from jobs
    const totalCredits = allJobs.reduce((sum, job) => sum + (job.credits_used || 0), 0);

    return NextResponse.json({
      jobs: allJobs,
      total: allJobs.length,
      totalCredits
    });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, business_name, location, credits_required } = body;

    const jobs = await getJobs();
    
    const job = {
      title: title || 'Untitled Job',
      business_name: business_name || 'Unknown Business',
      location: location || { city: 'Unknown', lat: 28.6139, lng: 77.2090 },
      status: 'Open',
      credits_required: credits_required || 10,
      credits_used: 0,
      created_at: new Date()
    };

    const result = await jobs.insertOne(job);

    return NextResponse.json({
      success: true,
      jobId: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Job create error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}