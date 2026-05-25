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
    const incomingMsg = formData.get('Body');
    const sender = formData.get('From'); 

    let chatState = await ChatState.findOne({ phoneNumber: sender });
    if (!chatState) {
      chatState = await ChatState.create({ phoneNumber: sender });
    }

    const systemPrompt = `You are Kaam.ai, a hiring assistant in Hyderabad. You connect employers with workers.
    Current State: ${JSON.stringify({
      userType: chatState.userType,
      category: chatState.category,
      location: chatState.location,
      salary: chatState.salary,
      isComplete: chatState.isComplete
    })}
    
    Instructions:
    1. If userType is null, you MUST figure out if they want to HIRE someone ('employer') or FIND a job ('worker'). Ask them directly if unclear.
    2. If userType is 'employer', ask for missing category (who they want to hire), location, and salary offered.
    3. If userType is 'worker', ask for missing category (their profession/skills), location, and expected salary.
    4. Ask for only ONE missing piece of info at a time.
    5. If userType, category, location, and salary are all filled, set isComplete to true and reply with a final confirmation.
    
    Respond ONLY in JSON format:
    {
      "updatedState": { "userType": "employer or worker or null", "category": "string or null", "location": "string or null", "salary": "string or null", "isComplete": boolean },
      "replyToUser": "Your conversational text reply"
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
          { role: 'user', content: incomingMsg }
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
        // 1. Save the Job
        await Job.create({ employerPhone: sender, category: chatState.category, location: chatState.location, salary: chatState.salary });
        
        // 2. The Matching Engine: Find up to 3 workers with a similar category (case-insensitive)
        const matchedWorkers = await Worker.find({
          category: { $regex: new RegExp(chatState.category, "i") },
          status: 'available'
        }).limit(3);

        // 3. Append matches to the final message
        if (matchedWorkers.length > 0) {
          finalMessage += "\n\n🔥 *Good news! We found immediate matches:*";
          matchedWorkers.forEach((worker, index) => {
            finalMessage += `\n\n*Profile ${index + 1}:* ${worker.category.toUpperCase()} \n📍 Location: ${worker.location} \n💰 Expected Pay: ${worker.salary} \n📞 Contact: ${worker.workerPhone}`;
          });
        } else {
          finalMessage += "\n\n⏳ *We have saved your job post. We will notify you the second a verified worker matching this description registers on Kaam.ai.*";
        }

      } else if (chatState.userType === 'worker') {
        await Worker.create({ workerPhone: sender, category: chatState.category, location: chatState.location, salary: chatState.salary });
      }
      
      // Reset state so they can use the AI again
      await ChatState.deleteOne({ phoneNumber: sender }); 
    }

    // Send the final compiled message back to WhatsApp
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
