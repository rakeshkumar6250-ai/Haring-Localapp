import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// Approves an employer's manual UPI payment: grants premium, clears pending flag.
// Gated by ADMIN_SECRET (passed as ?key=).
export async function PATCH(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employerId } = params;
    if (!employerId) {
      return NextResponse.json({ error: 'employerId is required' }, { status: 400 });
    }

    const employers = await getEmployers();
    const result = await employers.updateOne(
      { _id: employerId },
      { $set: { hasPremiumAccess: true, paymentVerificationPending: false, payment_approved_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, employerId, hasPremiumAccess: true });
  } catch (error) {
    console.error('Approve payment error:', error);
    return NextResponse.json({ error: 'Failed to approve payment' }, { status: 500 });
  }
}
