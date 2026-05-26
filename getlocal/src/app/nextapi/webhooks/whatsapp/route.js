import { NextResponse } from 'next/server';
import twilio from 'twilio';
import dbConnect from '@/lib/mongoose';
import ChatState from '@/models/ChatState';
import Job from '@/models/Job';
import Worker from '@/models/Worker';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await dbConnect();
    const formData = await request.formData();
    const incomingMsg = formData.get('Body') || '';
    const sender = formData.get('From'); 
    
    // Check for attached media (Images/PDFs)
    const numMedia = parseInt(formData.get('NumMedia') || '0');
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0') : null;

    let chatState = await ChatState.findOne({ phoneNumber: sender });
    if (!chatState) {
      chatState = await ChatState.create({ phoneNumber: sender });
    }

    // If they sent a document, save it to their state immediately
    if (mediaUrl) {
      chatState.documentUrl = mediaUrl;
      await chatState.save();
    }

    const systemPrompt = `You are Kaam.ai, a hiring assistant in Hyderabad connecting employers with workers.
    
    CRITICAL LANGUAGE RULE: Detect if the user is typing in English, Telugu script, or Transliterated Telugu (Telugu typed in English letters, e.g., "Nenu job chustunnanu"). You MUST reply in the EXACT SAME language and script the user is using. Be polite and professional.

    Current State: ${JSON.stringify({
      userType: chatState.userType,
      category: chatState.category,
      location: chatState.location,
      salary: chatState.salary,
      documentUrl: chatState.documentUrl,
      isComplete: chatState.isComplete
    })}
    
    Instructions:
    1. If userType is null, ask if they want to HIRE someone ('employer') or FIND a job ('worker').
    2. If userType is 'employer':
       a. Ask for missing category, location, and salary.
       b. If those three are filled but documentUrl is null, you MUST ask them to upload a photo of their Company Registration, GST, or Govt ID card to verify their business.
       c. Do NOT mark isComplete as true for an employer until documentUrl is NOT null.
    3. If userType is 'worker': Ask for missing category, location, and expected salary. (No ID upload required yet).
    4. Ask for only ONE missing piece of info at a time.
    5. If all required fields are filled (including documentUrl for employers), set isComplete to true and reply with a final confirmation.
    
    Respond ONLY in JSON format:
    {
      "updatedState": { "userType": "employer or worker or null", "category": "string or null", "location": "string or null", "salary": "string or null", "isComplete": boolean },
      "replyToUser": "Your conversational text reply translated into the user's language"
    }`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mediaUrl ? `[User uploaded a document] ${incomingMsg}` : incomingMsg }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(`Groq Error: ${aiData.error.message}`);
    if (!aiData.choices) throw new Error("Invalid AI Response");

    const parsedAI = JSON.parse(aiData.choices[0].message.content);

    chatState.userType = parsedAI.updatedState.userType;
    chatState.category = parsedAI.updatedState.category;
    chatState.location = parsedAI.updatedState.location;
    chatState.salary = parsedAI.updatedState.salary;
    chatState.isComplete = parsedAI.updatedState.isComplete;
    await chatState.save();

    let finalMessage = parsedAI.replyToUser;

    if (chatState.isComplete) {
      if (chatState.userType === 'employer') {
        await Job.create({ employerPhone: sender, category: chatState.category, location: chatState.location, salary: chatState.salary });
        
        const matchedWorkers = await Worker.find({
          category: { $regex: new RegExp(chatState.category, "i") },
          status: 'available'
        }).limit(3);

        if (matchedWorkers.length > 0) {
          finalMessage += "\n\n🔥 *Verified Matches Found:*";
          matchedWorkers.forEach((worker, index) => {
            finalMessage += `\n\n*Profile ${index + 1}:* ${worker.category.toUpperCase()} \n📍 Location: ${worker.location} \n💰 Expected Pay: ${worker.salary} \n📞 Contact: ${worker.workerPhone}`;
          });
        } else {
          finalMessage += "\n\n⏳ *Your requirement and ID are verified. We will notify you when a match registers.*";
        }
      } else if (chatState.userType === 'worker') {
        await Worker.create({ workerPhone: sender, category: chatState.category, location: chatState.location, salary: chatState.salary });
      }
      
      await ChatState.deleteOne({ phoneNumber: sender }); 
    }

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(finalMessage);
    return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    console.error("Webhook Error:", error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, our AI is experiencing a glitch. Please try again.");
    return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
}
