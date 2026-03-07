import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';

export async function GET() {
  try {
    const candidates = await getCandidates();
    const allCandidates = await candidates.find({}).sort({ created_at: -1 }).toArray();

    return NextResponse.json({
      candidates: allCandidates,
      total: allCandidates.length
    });
  } catch (error) {
    console.error('Candidates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
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
      is_verified: false,
      created_at: new Date()
    };

    const result = await candidates.insertOne(candidate);

    return NextResponse.json({
      success: true,
      candidateId: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Candidate create error:', error);
    return NextResponse.json(
      { error: 'Failed to create candidate' },
      { status: 500 }
    );
  }
}