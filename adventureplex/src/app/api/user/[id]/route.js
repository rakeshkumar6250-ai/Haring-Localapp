import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      currentStamps: user.currentStamps,
      lifetimeVisits: user.lifetimeVisits,
      joinDate: user.joinDate,
      recentTransactions: user.transactions.map(t => ({
        id: t.id,
        type: t.type,
        timestamp: t.timestamp
      }))
    });

  } catch (error) {
    console.error('Fetch user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}