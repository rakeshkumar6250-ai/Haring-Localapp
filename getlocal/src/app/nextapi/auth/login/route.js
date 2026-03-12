import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'phone and password are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s/g, '').replace(/^(\+91)?/, '+91');

    const employers = await getEmployers();
    const employer = await employers.findOne({ phone: cleanPhone });

    if (!employer) {
      return NextResponse.json({ error: 'No account found with this phone number.' }, { status: 404 });
    }

    if (!employer.password_hash) {
      return NextResponse.json({ error: 'This account was created before auth was enabled. Please contact support.' }, { status: 400 });
    }

    const valid = await comparePassword(password, employer.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const token = signToken({
      employer_id: employer._id,
      phone: employer.phone,
      company_name: employer.company_name,
    });

    console.log(`[AUTH] Login: ${employer.company_name} (${employer.phone})`);

    return NextResponse.json({
      success: true,
      token,
      employer: {
        id: employer._id,
        company_name: employer.company_name,
        phone: employer.phone,
        phone_verified: employer.phone_verified || false,
        verification_status: employer.verification_status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
