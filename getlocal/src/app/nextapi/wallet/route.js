import { NextResponse } from 'next/server';
import { getWallets } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    const employerId = auth.employer_id;

    const wallets = await getWallets();
    let wallet = await wallets.findOne({ user_id: employerId });

    if (!wallet) {
      wallet = {
        user_id: employerId,
        credit_balance: 0,
        unlocked_candidates: [],
        transactions: [],
        created_at: new Date()
      };
      await wallets.insertOne(wallet);
    }

    return NextResponse.json({
      balance: wallet.credit_balance,
      unlockedCandidates: wallet.unlocked_candidates || []
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount } = body;
    const userId = auth.employer_id;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const wallets = await getWallets();

    await wallets.updateOne(
      { user_id: userId },
      {
        $inc: { credit_balance: amount },
        $setOnInsert: { unlocked_candidates: [], transactions: [], created_at: new Date() }
      },
      { upsert: true }
    );

    const wallet = await wallets.findOne({ user_id: userId });

    return NextResponse.json({
      success: true,
      newBalance: wallet.credit_balance
    });
  } catch (error) {
    console.error('Wallet update error:', error);
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
  }
}
