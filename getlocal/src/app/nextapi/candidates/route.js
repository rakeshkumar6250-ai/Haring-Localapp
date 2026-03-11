import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const education = searchParams.get('education');
    const english = searchParams.get('english');
    const experience = searchParams.get('experience');
    const verifiedOnly = searchParams.get('verified') === 'true';

    const filter = {};

    if (education && education !== 'All') {
      filter.education_level = education;
    }
    if (english && english !== 'All') {
      filter.english_level = english;
    }
    if (experience && experience !== 'All') {
      filter.experience_type = experience;
    }
    if (verifiedOnly) {
      filter.verification_status = 'Verified';
    }

    const candidates = await getCandidates();
    const allCandidates = await candidates.find(filter).sort({ created_at: -1 }).toArray();

    return NextResponse.json({
      candidates: allCandidates,
      total: allCandidates.length
    });
  } catch (error) {
    console.error('Candidates fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, role_category, location } = body;

    const candidates = await getCandidates();
    
    const candidate = {
      name: name || 'Unknown',
      phone: phone || '',
      location: location || { lat: 28.6139, lng: 77.2090 },
      role_category: role_category || 'General',
      audio_interview_url: null,
      verification_status: 'Unverified',
      id_document_url: null,
      education_level: '',
      english_level: '',
      experience_type: 'Fresher',
      created_at: new Date()
    };

    const result = await candidates.insertOne(candidate);

    return NextResponse.json({
      success: true,
      candidateId: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Candidate create error:', error);
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 });
  }
}

// PATCH: Admin approve/reject candidate KYC
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { candidate_id, action } = body;

    if (!candidate_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'candidate_id and action (approve/reject) required' }, { status: 400 });
    }

    const candidates = await getCandidates();
    const candidate = await candidates.findOne({ _id: candidate_id });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'Verified' : 'Unverified';

    await candidates.updateOne(
      { _id: candidate_id },
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
      message: `Candidate ${action === 'approve' ? 'verified' : 'rejected'}`,
      verification_status: newStatus
    });
  } catch (error) {
    console.error('Candidate KYC update error:', error);
    return NextResponse.json({ error: 'Failed to update candidate KYC' }, { status: 500 });
  }
}
