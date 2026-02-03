import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Total customers
    const totalCustomers = await prisma.user.count();

    // Stamps given today
    const stampsToday = await prisma.transaction.count({
      where: {
        type: 'EARN',
        timestamp: {
          gte: today
        }
      }
    });

    // Total rewards redeemed (all time)
    const totalRedemptions = await prisma.transaction.count({
      where: {
        type: 'REDEEM'
      }
    });

    // Redemptions today
    const redemptionsToday = await prisma.transaction.count({
      where: {
        type: 'REDEEM',
        timestamp: {
          gte: today
        }
      }
    });

    // Recent activity (last 10 transactions)
    const recentActivity = await prisma.transaction.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    // Active users (users with at least 1 stamp)
    const activeUsers = await prisma.user.count({
      where: {
        currentStamps: { gt: 0 }
      }
    });

    // Users ready to redeem (10 stamps)
    const readyToRedeem = await prisma.user.count({
      where: {
        currentStamps: 10
      }
    });

    return NextResponse.json({
      totalCustomers,
      stampsToday,
      totalRedemptions,
      redemptionsToday,
      activeUsers,
      readyToRedeem,
      recentActivity: recentActivity.map(t => ({
        id: t.id,
        type: t.type,
        userName: t.user.name,
        timestamp: t.timestamp
      }))
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}