import { NextResponse } from 'next/server';
import { getSupportTickets } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const tickets = await getSupportTickets();
    const allTickets = await tickets.find({}).sort({ created_at: -1 }).toArray();

    return NextResponse.json({
      tickets: allTickets,
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'Open').length,
      resolved: allTickets.filter(t => t.status === 'Resolved').length
    });
  } catch (error) {
    console.error('Tickets fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      user_type, 
      phone_number, 
      issue_description,
      requires_call = false
    } = body;

    if (!phone_number || !issue_description) {
      return NextResponse.json(
        { error: 'Phone number and issue description are required' },
        { status: 400 }
      );
    }

    const tickets = await getSupportTickets();
    
    const ticket = {
      _id: uuidv4(),
      user_type: user_type || 'candidate',
      phone_number: phone_number,
      issue_description: issue_description,
      status: 'Open',
      requires_call: requires_call,
      created_at: new Date(),
      updated_at: new Date()
    };

    await tickets.insertOne(ticket);

    console.log(`[SUPPORT] New ticket created: ${ticket._id} (requires_call: ${requires_call})`);

    return NextResponse.json({
      success: true,
      ticket: ticket,
      message: requires_call ? 'Our team will call you shortly' : 'Ticket created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Ticket create error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { ticketId, status, notes } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const tickets = await getSupportTickets();
    
    const updateData = {
      updated_at: new Date()
    };
    
    if (status) updateData.status = status;
    if (notes) updateData.resolution_notes = notes;

    await tickets.updateOne(
      { _id: ticketId },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: `Ticket ${status === 'Resolved' ? 'resolved' : 'updated'}`
    });
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
