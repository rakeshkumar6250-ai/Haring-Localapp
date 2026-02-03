import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyRewardRedeemed, logEvent } from '@/lib/notifications';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, staffId = 'STAFF_001' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has 10 stamps
    if (user.currentStamps < 10) {
      return NextResponse.json(
        { 
          error: 'User needs 10 stamps to redeem',
          currentStamps: user.currentStamps,
          stampsNeeded: 10 - user.currentStamps
        },
        { status: 400 }
      );
    }

    // Reset stamps to 0
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentStamps: 0
      }
    });

    // Create redemption transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'REDEEM',
        staffId
      }
    });

    // Log event and notify
    logEvent('REWARD_REDEEMED', {
      userId,
      staffId,
      userName: user.name
    });

    await notifyRewardRedeemed(userId, user.name);

    return NextResponse.json({
      success: true,
      message: 'Reward redeemed successfully!',
      newStampCount: 0,
      lifetimeVisits: updatedUser.lifetimeVisits
    });

  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}