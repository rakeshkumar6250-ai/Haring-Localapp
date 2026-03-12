import { NextResponse } from 'next/server';
import { getEmployers, getWallets } from '@/lib/mongodb';
import { signToken } from '@/lib/auth';

const MOCK_OTP = '123456';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json({ error: 'phone and otp are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s/g, '').replace(/^(\+91)?/, '+91');

    // Check pending registration
    const pending = global._otpStore?.[cleanPhone];
    if (!pending) {
      return NextResponse.json({ error: 'No pending registration found. Please sign up first.' }, { status: 404 });
    }

    // Verify OTP (mock: always 123456)
    if (otp !== MOCK_OTP && otp !== pending.otp) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 401 });
    }

    // OTP verified - create the employer record
    const employers = await getEmployers();

    const newEmployer = {
      _id: pending.pendingId,
      company_name: pending.company_name,
      phone: pending.phone,
      password_hash: pending.passwordHash,
      phone_verified: true,
      verification_status: 'Unverified',
      verification_document_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await employers.insertOne(newEmployer);

    // Create wallet for this employer
    const wallets = await getWallets();
    await wallets.insertOne({
      user_id: pending.pendingId,
      credit_balance: 0,
      unlocked_candidates: [],
      transactions: [],
      created_at: new Date(),
    });

    // Clean up OTP store
    delete global._otpStore[cleanPhone];

    // Generate JWT
    const token = signToken({
      employer_id: pending.pendingId,
      phone: pending.phone,
      company_name: pending.company_name,
    });

    console.log(`[AUTH] Employer created & verified: ${pending.company_name} (${pending.phone})`);

    return NextResponse.json({
      success: true,
      token,
      employer: {
        id: pending.pendingId,
        company_name: pending.company_name,
        phone: pending.phone,
        phone_verified: true,
      },
      message: 'Phone verified. Account created successfully!',
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
