import { NextResponse } from 'next/server';
import { getWallets, getCandidates } from '@/lib/mongodb';

const UNLOCK_COST = 1;

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId, employer_id } = body;
    const userId = employer_id || 'default-employer';

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const wallets = await getWallets();
    const candidates = await getCandidates();

    const candidate = await candidates.findOne({ _id: candidateId });
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    let wallet = await wallets.findOne({ user_id: userId });
    if (!wallet) {
      wallet = {
        user_id: userId,
        credit_balance: 0,
        unlocked_candidates: [],
        transactions: [],
        created_at: new Date()
      };
      await wallets.insertOne(wallet);
    }

    // Already unlocked
    if (wallet.unlocked_candidates?.includes(candidateId)) {
      return NextResponse.json({
        success: true,
        message: 'Already unlocked',
        newBalance: wallet.credit_balance,
        phone: candidate.phone
      });
    }

    // Insufficient credits
    if (wallet.credit_balance < UNLOCK_COST) {
      return NextResponse.json(
        { error: 'insufficient_credits', required: UNLOCK_COST, available: wallet.credit_balance },
        { status: 402 }
      );
    }

    // Deduct and unlock
    await wallets.updateOne(
      { user_id: userId },
      {
        $inc: { credit_balance: -UNLOCK_COST },
        $push: {
          unlocked_candidates: candidateId,
          transactions: { type: 'unlock', candidateId, credits: -UNLOCK_COST, timestamp: new Date() }
        }
      }
    );

    const updated = await wallets.findOne({ user_id: userId });
    console.log(`[UNLOCK] ${candidateId} unlocked by ${userId}. Balance: ${updated.credit_balance}`);

    return NextResponse.json({
      success: true,
      newBalance: updated.credit_balance,
      phone: candidate.phone,
      message: 'Candidate unlocked successfully'
    });
  } catch (error) {
    console.error('Unlock error:', error);
    return NextResponse.json({ error: 'Failed to unlock candidate' }, { status: 500 });
  }
}
