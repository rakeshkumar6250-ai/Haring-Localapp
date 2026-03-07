import { NextResponse } from 'next/server';
import { getWallets } from '@/lib/mongodb';

const DEFAULT_USER_ID = 'default-employer';

export async function GET() {
  try {
    const wallets = await getWallets();
    let wallet = await wallets.findOne({ user_id: DEFAULT_USER_ID });

    // Create default wallet if doesn't exist
    if (!wallet) {
      wallet = {
        user_id: DEFAULT_USER_ID,
        credit_balance: 100,
        unlocked_candidates: [],
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
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const wallets = await getWallets();
    
    const result = await wallets.updateOne(
      { user_id: DEFAULT_USER_ID },
      { 
        $inc: { credit_balance: amount },
        $setOnInsert: { created_at: new Date() }
      },
      { upsert: true }
    );

    const wallet = await wallets.findOne({ user_id: DEFAULT_USER_ID });

    return NextResponse.json({
      success: true,
      newBalance: wallet.credit_balance
    });
  } catch (error) {
    console.error('Wallet update error:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 }
    );
  }
}