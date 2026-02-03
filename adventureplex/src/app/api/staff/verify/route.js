import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// For MVP, hardcode staff PIN as 1234
const MVP_PIN = '1234';
const MVP_STAFF_ID = 'STAFF_001';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }

    // MVP: Simple PIN check
    if (pin === MVP_PIN) {
      return NextResponse.json({
        success: true,
        staffId: MVP_STAFF_ID,
        staffName: 'Staff Member'
      });
    }

    // Check database for staff (future implementation)
    const staff = await prisma.staff.findFirst({
      where: { pin }
    });

    if (staff) {
      return NextResponse.json({
        success: true,
        staffId: staff.id,
        staffName: staff.name
      });
    }

    return NextResponse.json(
      { error: 'Invalid PIN' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Staff verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify staff' },
      { status: 500 }
    );
  }
}