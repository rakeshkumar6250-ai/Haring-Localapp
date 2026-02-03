import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logEvent } from '@/lib/notifications';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    // Validation
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanedPhone }
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'Phone number already registered',
          existingId: existingUser.id 
        },
        { status: 409 }
      );
    }

    // Generate a high-entropy random suffix for the slug (>=32 bits = 4 bytes = 8 hex chars)
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const slug = `${randomSuffix}`;

    // Create new user with the slug as ID for unpredictable URLs
    const user = await prisma.user.create({
      data: {
        id: slug,
        name: name.trim(),
        phone: cleanedPhone,
        currentStamps: 0,
        lifetimeVisits: 0
      }
    });

    // Log the registration event
    logEvent('USER_REGISTERED', {
      userId: user.id,
      name: user.name,
      phone: user.phone
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        currentStamps: user.currentStamps,
        joinDate: user.joinDate
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This phone number is already registered. Please use a different number.' },
        { status: 409 }
      );
    }
    
    // Provide more detailed error message
    const errorMessage = error.message || 'Failed to register user';
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.toString() : undefined },
      { status: 500 }
    );
  }
}