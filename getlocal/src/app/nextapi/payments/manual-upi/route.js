import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Manual UPI MVP: employer claims they've paid → flag for manual verification.
export async function POST(request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employers = await getEmployers();
    await employers.updateOne(
      { _id: auth.employer_id },
      { $set: { paymentVerificationPending: true, payment_requested_at: new Date() } }
    );

    return NextResponse.json({ success: true, paymentVerificationPending: true });
  } catch (error) {
    console.error('Manual UPI error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

// Returns the employer's current premium/payment status (for UI state on load).
export async function GET(request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ paymentVerificationPending: false, hasPremiumAccess: false });

    const employers = await getEmployers();
    const emp = await employers.findOne({ _id: auth.employer_id });
    return NextResponse.json({
      paymentVerificationPending: !!emp?.paymentVerificationPending,
      hasPremiumAccess: !!emp?.hasPremiumAccess,
    });
  } catch (error) {
    console.error('Manual UPI status error:', error);
    return NextResponse.json({ paymentVerificationPending: false, hasPremiumAccess: false });
  }
}
