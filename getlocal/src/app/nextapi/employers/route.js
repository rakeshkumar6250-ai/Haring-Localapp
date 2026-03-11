import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

// GET: Fetch employer by ID or all employers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employerId = searchParams.get('id');
    const status = searchParams.get('status');

    const employers = await getEmployers();

    if (employerId) {
      const employer = await employers.findOne({ _id: employerId });
      if (!employer) {
        return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
      }
      return NextResponse.json({ employer });
    }

    const filter = {};
    if (status) filter.verification_status = status;

    const allEmployers = await employers.find(filter).sort({ created_at: -1 }).toArray();
    return NextResponse.json({ employers: allEmployers, total: allEmployers.length });
  } catch (error) {
    console.error('Employers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch employers' }, { status: 500 });
  }
}

// POST: Create or update employer profile
export async function POST(request) {
  try {
    const body = await request.json();
    const { employer_id, company_name, phone } = body;

    if (!company_name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const employers = await getEmployers();

    // If employer_id provided, update existing
    if (employer_id) {
      const existing = await employers.findOne({ _id: employer_id });
      if (existing) {
        await employers.updateOne(
          { _id: employer_id },
          { $set: { company_name, phone: phone || existing.phone, updated_at: new Date() } }
        );
        const updated = await employers.findOne({ _id: employer_id });
        return NextResponse.json({ employer: updated, message: 'Profile updated' });
      }
    }

    // Create new employer
    const newEmployer = {
      _id: employer_id || uuidv4(),
      company_name: company_name.trim(),
      phone: phone || '',
      verification_status: 'Unverified',
      verification_document_url: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await employers.insertOne(newEmployer);
    return NextResponse.json({ employer: newEmployer, message: 'Employer created' }, { status: 201 });
  } catch (error) {
    console.error('Employer create error:', error);
    return NextResponse.json({ error: 'Failed to create employer' }, { status: 500 });
  }
}

// PATCH: Admin approve/reject KYC
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { employer_id, action } = body;

    if (!employer_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'employer_id and action (approve/reject) required' }, { status: 400 });
    }

    const employers = await getEmployers();
    const employer = await employers.findOne({ _id: employer_id });

    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'Verified' : 'Unverified';

    await employers.updateOne(
      { _id: employer_id },
      {
        $set: {
          verification_status: newStatus,
          verified_at: action === 'approve' ? new Date() : null,
          updated_at: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Employer ${action === 'approve' ? 'verified' : 'rejected'}`,
      verification_status: newStatus
    });
  } catch (error) {
    console.error('Employer KYC update error:', error);
    return NextResponse.json({ error: 'Failed to update KYC status' }, { status: 500 });
  }
}
