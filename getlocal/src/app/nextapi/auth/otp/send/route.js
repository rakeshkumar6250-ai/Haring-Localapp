import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getEmployers } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Pending signup registrations awaiting OTP verification (in-memory).
if (!global._otpStore) global._otpStore = {};

// Format to E.164 standard for India.
function formatPhone(phone) {
  let p = phone.trim().replace(/\s/g, '');
  if (!p.startsWith('+')) {
    p = p.startsWith('91') ? `+${p}` : `+91${p}`;
  }
  return p;
}

export async function POST(request) {
  try {
    const { phone, company_name, password } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const formattedPhone = formatPhone(phone);

    // Signup flow: stash the pending registration (company + hashed password)
    // so the verify step can create the account once the OTP is approved.
    if (company_name && password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const employers = await getEmployers();
      const existing = await employers.findOne({ phone: formattedPhone });
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please login.' },
          { status: 409 }
        );
      }
      global._otpStore[formattedPhone] = {
        pendingId: uuidv4(),
        company_name: company_name.trim(),
        phone: formattedPhone,
        passwordHash: await hashPassword(password),
        createdAt: Date.now(),
      };
    }

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhone, channel: 'sms' });

    return NextResponse.json({ success: true, message: 'OTP sent successfully', phone: formattedPhone });
  } catch (error) {
    console.error('Twilio Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
