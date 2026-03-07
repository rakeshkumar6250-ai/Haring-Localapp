import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';

// Mock names for testing
const MOCK_NAMES = [
  'Rajesh Kumar',
  'Priya Singh', 
  'Amit Sharma',
  'Sunita Devi',
  'Vikram Yadav',
  'Meera Patel'
];

const MOCK_ROLES = ['Driver', 'Cook', 'Security Guard', 'House Helper', 'Delivery Executive'];

const MOCK_SUMMARIES = [
  'Experienced professional with strong communication skills. Has worked in multiple household and commercial settings with excellent references.',
  'Dedicated worker with proven track record in customer-facing roles. Known for punctuality and reliability.',
  'Skilled candidate with hands-on experience in the service industry. Demonstrates strong work ethic and adaptability.',
  'Reliable professional seeking stable employment. Previous employers praise attention to detail and positive attitude.'
];

export async function POST(request) {
  console.log('[MOCK PROCESS] ========== TRANSCRIPTION REQUEST ==========');
  
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    console.log('[MOCK PROCESS] Processing candidate:', candidateId);

    // Get candidate from MongoDB
    const candidates = await getCandidates();
    const candidate = await candidates.findOne({ _id: candidateId });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.audio_interview_url) {
      return NextResponse.json({ error: 'No audio file for this candidate' }, { status: 400 });
    }

    console.log('[MOCK PROCESS] Audio URL:', candidate.audio_interview_url);
    console.log('[MOCK PROCESS] Simulating 5 second AI processing delay...');

    // Simulate AI processing time (5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Generate mock data
    const mockName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    const mockRole = MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)];
    const mockExperience = Math.floor(Math.random() * 8) + 1; // 1-8 years
    const mockSummary = MOCK_SUMMARIES[Math.floor(Math.random() * MOCK_SUMMARIES.length)];
    
    const mockTranscript = `[MOCK TRANSCRIPT] My name is ${mockName}. I am looking for work as a ${mockRole}. I have ${mockExperience} years of experience in this field. I am hardworking and reliable.`;

    console.log('[MOCK PROCESS] Generated mock data:');
    console.log('[MOCK PROCESS] Name:', mockName);
    console.log('[MOCK PROCESS] Role:', mockRole);
    console.log('[MOCK PROCESS] Experience:', mockExperience, 'years');

    // Update MongoDB with mock data
    await candidates.updateOne(
      { _id: candidateId },
      {
        $set: {
          name: mockName,
          role_category: mockRole,
          experience_years: mockExperience,
          professional_summary: mockSummary,
          transcription: mockTranscript,
          moltbot_processed: true,
          processed_at: new Date()
        }
      }
    );

    console.log('[MOCK PROCESS] ========== SUCCESS ==========');
    console.log('[MOCK PROCESS] MongoDB updated with mock profile data');

    return NextResponse.json({
      success: true,
      candidateId,
      mock: true,
      extracted: {
        name: mockName,
        role: mockRole,
        experience_years: mockExperience,
        summary: mockSummary
      },
      message: 'Mock transcription complete. Ready for real API key connection.'
    });

  } catch (error) {
    console.error('[MOCK PROCESS ERROR]', error.message);
    console.error('[MOCK PROCESS ERROR] Stack:', error.stack);
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 }
    );
  }
}
