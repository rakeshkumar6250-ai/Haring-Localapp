import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, reason } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const candidates = await getCandidates();
    const candidate = await candidates.findOne({ _id: candidateId });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const currentScore = candidate.trust_score || 100;
    const newScore = Math.max(0, currentScore - 10); // Deduct 10 points, min 0

    await candidates.updateOne(
      { _id: candidateId },
      { 
        $set: { 
          trust_score: newScore,
          last_noshow_report: new Date()
        },
        $push: {
          noshow_history: {
            reported_at: new Date(),
            reason: reason || 'No-show for interview',
            score_deducted: 10
          }
        }
      }
    );

    console.log(`[TRUST] Reported no-show for ${candidateId}. Score: ${currentScore} -> ${newScore}`);

    return NextResponse.json({
      success: true,
      previousScore: currentScore,
      newScore: newScore,
      message: 'No-show reported. Trust score updated.'
    });
  } catch (error) {
    console.error('Report no-show error:', error);
    return NextResponse.json({ error: 'Failed to report no-show' }, { status: 500 });
  }
}
