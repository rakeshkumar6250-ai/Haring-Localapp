import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// Lists employers awaiting manual UPI payment verification. Gated by ADMIN_SECRET.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employers = await getEmployers();
    const pending = await employers
      .find({ paymentVerificationPending: true })
      .sort({ payment_requested_at: -1 })
      .toArray();

    const result = pending.map((e) => ({
      _id: String(e._id),
      company_name: e.company_name || '—',
      phone: e.phone || '—',
      payment_requested_at: e.payment_requested_at || null,
    }));

    return NextResponse.json({ pending: result, total: result.length });
  } catch (error) {
    console.error('Pending payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending payments' }, { status: 500 });
  }
}
