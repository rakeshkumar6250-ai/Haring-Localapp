import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const employers = await getEmployers();
    const employer = await employers.findOne({ _id: auth.employer_id });

    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    return NextResponse.json({
      employer: {
        id: employer._id,
        company_name: employer.company_name,
        phone: employer.phone,
        phone_verified: employer.phone_verified || false,
        verification_status: employer.verification_status,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
