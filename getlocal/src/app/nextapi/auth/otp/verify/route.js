import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getEmployers, getWallets } from '@/lib/mongodb';
import { signToken } from '@/lib/auth';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function formatPhone(phone) {
  let p = phone.trim().replace(/\s/g, '');
  if (!p.startsWith('+')) {
    p = p.startsWith('91') ? `+${p}` : `+91${p}`;
  }
  return p;
}

export async function POST(request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code: code.trim() });

    if (verificationCheck.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // --- SUCCESSFUL AUTHENTICATION ---
    // Create the employer from the pending signup registration, or log in an
    // existing employer. Then issue the existing JWT.
    const employers = await getEmployers();
    const pending = global._otpStore?.[formattedPhone];
    let employer = await employers.findOne({ phone: formattedPhone });

    if (!employer) {
      if (!pending) {
        return NextResponse.json(
          { error: 'No pending registration found. Please sign up first.' },
          { status: 404 }
        );
      }
      employer = {
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
      await employers.insertOne(employer);

      const wallets = await getWallets();
      await wallets.insertOne({
        user_id: pending.pendingId,
        credit_balance: 0,
        unlocked_candidates: [],
        transactions: [],
        created_at: new Date(),
      });
    } else if (!employer.phone_verified) {
      await employers.updateOne(
        { _id: employer._id },
        { $set: { phone_verified: true, updated_at: new Date() } }
      );
    }

    if (pending) delete global._otpStore[formattedPhone];

    const token = signToken({
      employer_id: employer._id,
      phone: employer.phone,
      company_name: employer.company_name,
    });

    return NextResponse.json({
      success: true,
      isComplete: true,
      token,
      employer: {
        id: employer._id,
        company_name: employer.company_name,
        phone: employer.phone,
        phone_verified: true,
      },
    });
  } catch (error) {
    console.error('Twilio Verify Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
