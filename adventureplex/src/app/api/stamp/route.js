import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyStampEarned, notifyRewardReady, logEvent } from '@/lib/notifications';

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

    // Check if already at max stamps
    if (user.currentStamps >= 10) {
      return NextResponse.json(
        { 
          error: 'User already has 10 stamps. Please redeem first.',
          currentStamps: user.currentStamps,
          canRedeem: true
        },
        { status: 400 }
      );
    }

    // Increment stamps and lifetime visits
    const newStampCount = user.currentStamps + 1;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentStamps: newStampCount,
        lifetimeVisits: { increment: 1 }
      }
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'EARN',
        staffId
      }
    });

    // Log event and send notifications
    logEvent('STAMP_EARNED', {
      userId,
      staffId,
      newCount: newStampCount,
      lifetimeVisits: updatedUser.lifetimeVisits
    });

    await notifyStampEarned(userId, user.name, newStampCount);

    // Check if user now has 10 stamps
    if (newStampCount === 10) {
      await notifyRewardReady(userId, user.name);
    }

    return NextResponse.json({
      success: true,
      newCount: newStampCount,
      lifetimeVisits: updatedUser.lifetimeVisits,
      canRedeem: newStampCount === 10,
      message: newStampCount === 10 
        ? 'Congratulations! Reward is ready!' 
        : `Stamp added! ${10 - newStampCount} more to go!`
    });

  } catch (error) {
    console.error('Stamp error:', error);
    return NextResponse.json(
      { error: 'Failed to add stamp' },
      { status: 500 }
    );
  }
}