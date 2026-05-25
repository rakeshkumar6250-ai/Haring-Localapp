import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const incomingMsg = formData.get('Body');
    const sender = formData.get('From'); 

    console.log(`Incoming WhatsApp from ${sender}: ${incomingMsg}`);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Hello! Kaam.ai received your message. Our AI agent is coming online shortly.");

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
