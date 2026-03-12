import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getWallets } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

const CREDIT_PACKS = {
  10: 50000,
  25: 100000,
  50: 175000,
};

async function addCredits(employerId, credits) {
  const wallets = await getWallets();

  await wallets.updateOne(
    { user_id: employerId },
    {
      $inc: { credit_balance: credits },
      $setOnInsert: { unlocked_candidates: [], created_at: new Date() },
      $push: {
        transactions: {
          type: 'purchase',
          credits,
          timestamp: new Date(),
        }
      }
    },
    { upsert: true }
  );

  const wallet = await wallets.findOne({ user_id: employerId });
  return wallet.credit_balance;
}

export async function POST(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, mock } = body;
    const employer_id = auth.employer_id;

    if (!credits) {
      return NextResponse.json({ error: 'credits required' }, { status: 400 });
    }

    // Mock mode: just add credits directly (when Razorpay keys aren't configured)
    if (mock === true) {
      const creditAmount = parseInt(credits);
      if (!CREDIT_PACKS[creditAmount]) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
      }

      const newBalance = await addCredits(employer_id, creditAmount);
      console.log(`[PAYMENTS] Mock payment verified. Added ${creditAmount} credits to ${employer_id}. Balance: ${newBalance}`);

      return NextResponse.json({
        success: true,
        verified: true,
        mock: true,
        credits_added: creditAmount,
        new_balance: newBalance,
        message: `${creditAmount} credits added (mock mode).`
      });
    }

    // Real Razorpay verification
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret === 'PLACEHOLDER_SECRET') {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.error(`[PAYMENTS] Signature mismatch for order ${razorpay_order_id}`);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Signature valid - add credits
    const creditAmount = parseInt(credits);
    const newBalance = await addCredits(employer_id, creditAmount);

    console.log(`[PAYMENTS] Payment verified! Order: ${razorpay_order_id}, Added ${creditAmount} credits. Balance: ${newBalance}`);

    return NextResponse.json({
      success: true,
      verified: true,
      mock: false,
      credits_added: creditAmount,
      new_balance: newBalance,
      payment_id: razorpay_payment_id,
      message: `${creditAmount} credits added successfully!`
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', details: error.message },
      { status: 500 }
    );
  }
}
