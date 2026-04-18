import { NextResponse } from 'next/server';
import { getJobs, getEmployers } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { onJobCreated } from '@/lib/matching';

const JOB_CATEGORIES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper', 
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Gardener', 'General'
];

export async function GET() {
  try {
    const jobs = await getJobs();
    const allJobs = await jobs
      .find({ status: { $in: ['Open', 'active'] } })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();

    // Enrich jobs with employer verification status
    const employers = await getEmployers();
    const enrichedJobs = await Promise.all(allJobs.map(async (job) => {
      if (job.employer_id) {
        const employer = await employers.findOne({ _id: job.employer_id });
        return {
          ...job,
          employer_verified: employer?.verification_status === 'Verified',
          employer_company: employer?.company_name || job.company_name || ''
        };
      }
      return { ...job, employer_verified: false, employer_company: job.company_name || '' };
    }));

    return NextResponse.json({
      jobs: enrichedJobs,
      total: enrichedJobs.length,
      categories: JOB_CATEGORIES
    });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      // New simplified fields
      role, salary, jobType,
      // Existing expanded fields (backward compat)
      title, category, required_experience, location_radius, location,
      perks, training_provided, job_expectations, employer_location,
      employer_id, company_name, job_type, work_location_type, pay_type,
      requires_joining_fee, minimum_education, english_level,
      experience_required, is_walk_in, contact_preference, job_description
    } = body;

    // Use `role` as primary, fall back to `title` for backward compat
    const jobRole = role || title;
    const jobCategory = category || role || 'General';
    const jobSalary = salary;
    const jobLocation = location || { lat: 28.6139, lng: 77.2090 };

    if (!jobRole || !jobLocation || !jobSalary) {
      return NextResponse.json(
        { error: 'role, location, and salary are required' },
        { status: 400 }
      );
    }

    const jobs = await getJobs();

    const job = {
      _id: uuidv4(),
      title: typeof jobRole === 'string' ? jobRole.trim() : jobRole,
      category: jobCategory,
      company_name: company_name || '',
      employer_id: employer_id || null,
      required_experience: parseInt(required_experience) || 0,
      location_radius: parseInt(location_radius) || 10,
      location: jobLocation,
      salary: jobSalary,
      perks: perks || [],
      training_provided: training_provided || false,
      job_expectations: job_expectations || '',
      employer_location: employer_location || '',
      job_type: jobType || job_type || 'Full Time',
      work_location_type: work_location_type || 'Office',
      pay_type: pay_type || 'Fixed',
      requires_joining_fee: requires_joining_fee || false,
      minimum_education: minimum_education || '',
      english_level: english_level || '',
      experience_required: experience_required || 'Fresher',
      is_walk_in: is_walk_in || false,
      contact_preference: contact_preference || 'WhatsApp',
      job_description: job_description || '',
      status: 'Open',
      is_active: true,
      createdAt: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    await jobs.insertOne(job);
    console.log(`[JOB] Created: ${job.title} (${job.category}) by employer ${job.employer_id || 'anonymous'}`);

    // Trigger candidate matching (non-blocking)
    onJobCreated(job).catch(err =>
      console.error('[MATCH] Job match trigger error:', err.message)
    );

    return NextResponse.json({ success: true, job, message: 'Job posted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Job create error:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
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
