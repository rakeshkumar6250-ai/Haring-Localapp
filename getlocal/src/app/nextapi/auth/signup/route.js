import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { hashPassword, signToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Mock OTP store (in-memory, resets on restart)
// In production, replace with Redis/DB + real SMS provider
if (!global._otpStore) global._otpStore = {};

const MOCK_OTP = '123456';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, company_name, password } = body;

    if (!phone || !company_name || !password) {
      return NextResponse.json({ error: 'phone, company_name, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Normalize phone
    const cleanPhone = phone.replace(/\s/g, '').replace(/^(\+91)?/, '+91');

    const employers = await getEmployers();
    const existing = await employers.findOne({ phone: cleanPhone });
    if (existing) {
      return NextResponse.json({ error: 'An account with this phone number already exists. Please login.' }, { status: 409 });
    }

    // Store pending registration in memory (awaiting OTP verification)
    const pendingId = uuidv4();
    const passwordHash = await hashPassword(password);

    global._otpStore[cleanPhone] = {
      pendingId,
      company_name: company_name.trim(),
      phone: cleanPhone,
      passwordHash,
      otp: MOCK_OTP,
      createdAt: Date.now(),
    };

    console.log(`[AUTH] OTP sent to ${cleanPhone}: ${MOCK_OTP} (mock mode)`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your phone number. Please verify.',
      phone: cleanPhone,
      mock_hint: 'Use OTP: 123456',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
