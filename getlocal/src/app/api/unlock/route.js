import { NextResponse } from 'next/server';
import { getWallets, getCandidates } from '@/lib/mongodb';

const DEFAULT_USER_ID = 'default-employer';
const UNLOCK_COST = 10;

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    const wallets = await getWallets();
    const candidates = await getCandidates();

    // Check if candidate exists
    const candidate = await candidates.findOne({ _id: candidateId });
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get or create wallet
    let wallet = await wallets.findOne({ user_id: DEFAULT_USER_ID });
    if (!wallet) {
      wallet = {
        user_id: DEFAULT_USER_ID,
        credit_balance: 100,
        unlocked_candidates: [],
        created_at: new Date()
      };
      await wallets.insertOne(wallet);
    }

    // Check if already unlocked
    if (wallet.unlocked_candidates?.includes(candidateId)) {
      return NextResponse.json({
        success: true,
        message: 'Candidate already unlocked',
        newBalance: wallet.credit_balance,
        phone: candidate.phone
      });
    }

    // Check balance
    if (wallet.credit_balance < UNLOCK_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: UNLOCK_COST, available: wallet.credit_balance },
        { status: 400 }
      );
    }

    // Deduct credits and add to unlocked list
    await wallets.updateOne(
      { user_id: DEFAULT_USER_ID },
      {
        $inc: { credit_balance: -UNLOCK_COST },
        $push: { unlocked_candidates: candidateId }
      }
    );

    const updatedWallet = await wallets.findOne({ user_id: DEFAULT_USER_ID });

    console.log(`[UNLOCK] Candidate ${candidateId} unlocked. Credits: ${updatedWallet.credit_balance}`);

    return NextResponse.json({
      success: true,
      newBalance: updatedWallet.credit_balance,
      phone: candidate.phone,
      message: 'Candidate unlocked successfully'
    });

  } catch (error) {
    console.error('Unlock error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock candidate' },
      { status: 500 }
    );
  }
}