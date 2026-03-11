import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

const CREDIT_PACKS = {
  10: 50000,   // 10 credits = ₹500 (in paise)
  25: 100000,  // 25 credits = ₹1000
  50: 175000,  // 50 credits = ₹1750
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { credits, employer_id } = body;

    if (!credits || !CREDIT_PACKS[credits]) {
      return NextResponse.json(
        { error: 'Invalid credit pack. Choose 10, 25, or 50.' },
        { status: 400 }
      );
    }
    if (!employer_id) {
      return NextResponse.json({ error: 'employer_id is required' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'rzp_test_PLACEHOLDER') {
      // Return a mock order when keys aren't configured yet
      const mockOrderId = `order_mock_${uuidv4().slice(0, 12)}`;
      console.log(`[PAYMENTS] Mock order created: ${mockOrderId} (${credits} credits for employer ${employer_id})`);
      return NextResponse.json({
        success: true,
        order: {
          id: mockOrderId,
          amount: CREDIT_PACKS[credits],
          currency: 'INR',
        },
        credits_to_add: credits,
        key_id: keyId,
        mock: true,
        message: 'Mock order (Razorpay keys not configured). Credits will be added directly.'
      });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: CREDIT_PACKS[credits],
      currency: 'INR',
      receipt: `rcpt_${employer_id.slice(0, 10)}_${Date.now()}`.slice(0, 40),
      notes: {
        employer_id,
        credits: credits.toString(),
      },
    });

    console.log(`[PAYMENTS] Razorpay order created: ${order.id} (${credits} credits, ₹${CREDIT_PACKS[credits] / 100})`);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      credits_to_add: credits,
      key_id: keyId,
      mock: false,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order', details: error.message },
      { status: 500 }
    );
  }
}
