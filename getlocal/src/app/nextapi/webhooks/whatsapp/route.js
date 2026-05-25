import { NextResponse } from 'next/server';
import twilio from 'twilio';
import dbConnect from '@/lib/mongoose';
import ChatState from '@/models/ChatState';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await dbConnect();
    const formData = await request.formData();
    const incomingMsg = formData.get('Body');
    const sender = formData.get('From'); 

    // 1. Get or Create Conversation State
    let chatState = await ChatState.findOne({ phoneNumber: sender });
    if (!chatState) {
      chatState = await ChatState.create({ phoneNumber: sender });
    }

    // 2. The AI Brain (Groq Cloud)
    const systemPrompt = `You are Kaam.ai, an AI hiring assistant for Hyderabad. Your goal is to help employers post a job.
    You receive the user's message and their current JSON state.
    Current State: ${JSON.stringify({
      jobCategory: chatState.jobCategory,
      location: chatState.location,
      salary: chatState.salary,
      isComplete: chatState.isComplete
    })}
    
    Instructions:
    1. Extract any mentioned job category (e.g., Maid, Driver), location (e.g., Gachibowli), or salary.
    2. If any of those three are missing (null), your reply MUST be a short, polite question asking for ONE missing piece of info.
    3. If all three are filled, set isComplete to true and reply: "Perfect! I have saved your requirement. I am searching for verified staff now and will send profiles shortly."
    
    You MUST respond ONLY in valid JSON format matching this exact structure:
    {
      "updatedState": { "jobCategory": "string or null", "location": "string or null", "salary": "string or null", "isComplete": boolean },
      "replyToUser": "The actual conversational text you want to send back to the user on WhatsApp"
    }`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemma2-9b-it',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: incomingMsg }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    
    // Fallback if AI fails to return JSON
    if (!aiData.choices || !aiData.choices[0].message.content) {
        throw new Error("Invalid AI Response");
    }

    const parsedAI = JSON.parse(aiData.choices[0].message.content);

    // 3. Update Database with AI's extraction
    chatState.jobCategory = parsedAI.updatedState.jobCategory;
    chatState.location = parsedAI.updatedState.location;
    chatState.salary = parsedAI.updatedState.salary;
    chatState.isComplete = parsedAI.updatedState.isComplete;
    await chatState.save();

    // 4. If AI finished the form, convert it to a live Job post
    if (chatState.isComplete) {
      await Job.create({
        employerPhone: sender,
        category: chatState.jobCategory,
        location: chatState.location,
        salary: chatState.salary
      });
      // Reset state so they can post another job later
      await ChatState.deleteOne({ phoneNumber: sender }); 
    }

    // 5. Send AI's conversational reply back to WhatsApp
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(parsedAI.replyToUser);

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, our AI is experiencing a temporary glitch. Please try again in a minute.");
    return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
}
