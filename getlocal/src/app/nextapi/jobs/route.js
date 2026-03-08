import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

const JOB_CATEGORIES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper', 
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Gardener', 'General'
];

export async function GET() {
  try {
    const jobs = await getJobs();
    const allJobs = await jobs.find({}).sort({ created_at: -1 }).toArray();

    return NextResponse.json({
      jobs: allJobs,
      total: allJobs.length,
      categories: JOB_CATEGORIES
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
    const { 
      title, 
      category, 
      required_experience, 
      location_radius,
      location,
      // New fields
      salary,
      perks,
      training_provided,
      job_expectations
    } = body;

    // Validation
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    const jobs = await getJobs();
    
    const job = {
      _id: uuidv4(),
      title: title.trim(),
      category: category,
      required_experience: parseInt(required_experience) || 0,
      location_radius: parseInt(location_radius) || 10,
      location: location || { lat: 28.6139, lng: 77.2090 },
      // New fields
      salary: salary || null,
      perks: perks || [],
      training_provided: training_provided || false,
      job_expectations: job_expectations || '',
      status: 'active',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await jobs.insertOne(job);

    console.log(`[JOB] Created new job: ${job.title} (${job.category})`);

    return NextResponse.json({
      success: true,
      job: job,
      message: 'Job posted successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Job create error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

// Update job status
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { jobId, is_active } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobs = await getJobs();
    
    await jobs.updateOne(
      { _id: jobId },
      { 
        $set: { 
          is_active: is_active,
          status: is_active ? 'active' : 'paused',
          updated_at: new Date() 
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: `Job ${is_active ? 'activated' : 'paused'}`
    });
  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// Delete job
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobs = await getJobs();
    await jobs.deleteOne({ _id: jobId });

    return NextResponse.json({
      success: true,
      message: 'Job deleted'
    });
  } catch (error) {
    console.error('Job delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
