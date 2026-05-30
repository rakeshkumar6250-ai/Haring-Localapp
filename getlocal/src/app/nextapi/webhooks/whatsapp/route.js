import { NextResponse } from 'next/server';
import twilio from 'twilio';
import connectMongoose from '@/lib/mongoose';
import ChatState from '@/models/ChatState';
import { getCandidates, getJobs } from '@/lib/mongodb';
import { processTwilioAudioWithWhisper } from '@/lib/audioProcessor';

export const dynamic = 'force-dynamic';

function twimlReply(message) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req) {
  try {
    await connectMongoose();
    const formData = await req.formData();

    const senderPhone = formData.get('From');
    const body = formData.get('Body') || '';
    const numMedia = parseInt(formData.get('NumMedia') || '0');

    let userInputText = body;
    let audioUrl = null;

    // Load (or create) the persistent conversation state for this sender.
    let chatState = await ChatState.findOne({ phoneNumber: senderPhone });
    if (!chatState) {
      chatState = await ChatState.create({ phoneNumber: senderPhone });
    }

    // ------------------------------------------------------------------
    // 1. MEDIA ROUTING (Document vs Audio)
    // ------------------------------------------------------------------
    if (numMedia > 0) {
      const mediaType = formData.get('MediaContentType0') || '';
      const mediaUrl = formData.get('MediaUrl0');

      if (mediaType.startsWith('image/') || mediaType === 'application/pdf') {
        // Verification document (e.g. employer GST / Govt ID).
        chatState.documentUrl = mediaUrl;
        await chatState.save();
        userInputText = '[System: User uploaded a verification document]';
      } else if (mediaType.startsWith('audio/')) {
        // Voice note: transcribe (original language preserved) and archive.
        const { transcriptionText, audio_interview_url } =
          await processTwilioAudioWithWhisper(mediaUrl);

        if (transcriptionText) {
          userInputText = `[User sent a voice note. Transcription]: ${transcriptionText}`;
          audioUrl = audio_interview_url;
          // Persist the archive URL so it survives until profile completion.
          if (audioUrl) {
            chatState.audioInterviewUrl = audioUrl;
            await chatState.save();
          }
        } else {
          userInputText = '[System: User sent audio but transcription failed.]';
        }
      }
    }

    // ------------------------------------------------------------------
    // 2. GROQ AI STATE MACHINE
    // ------------------------------------------------------------------
    const systemPrompt = `You are Kaam.ai, a friendly local hiring assistant in Hyderabad helping daily-wage and blue-collar workers and small employers.

CRITICAL LANGUAGE & TONE RULES (follow strictly):
- Audience: blue-collar / daily-wage workers and small shop owners. Many are not highly educated. Talk to them like a helpful friend on the street, NOT like a textbook.
- NEVER use formal, academic, literary, or textbook Telugu. No complicated or "shudh" words.
- Detect the user's language. Reply in the SAME style they use:
  - If they type in English -> reply in simple, casual English.
  - If they type in Telugu script -> reply in VERY basic, everyday spoken Telugu script (the way people actually talk, not formal).
  - If they type in transliterated Telugu (Telugu in English letters, e.g. "Nenu job kavali") -> reply in casual "Tinglish" (Telugu words in English/Latin letters), mixing in common English words people use daily.
- Keep it warm, simple, and respectful. Use everyday words like "kaavali", " enti", "cheppandi", "ela", "ekkada", "entha".
- LENGTH: Every reply MUST be very short and direct — ideally one short line. Ask only ONE simple question at a time. No long explanations, no lists, no jargon.

CRITICAL LANGUAGE RULE: Always reply in the EXACT SAME language/script the user is using.

Current State: ${JSON.stringify({
      userType: chatState.userType,
      name: chatState.name,
      category: chatState.category,
      location: chatState.location,
      salary: chatState.salary,
      documentUrl: chatState.documentUrl,
      isComplete: chatState.isComplete,
    })}

Instructions:
1. If userType is null, ask if they want to HIRE someone ('employer') or FIND a job ('worker').
2. Collect the user's name if it is still null.
3. If userType is 'employer':
   a. Ask for missing category, location, and salary.
   b. If those are filled but documentUrl is null, you MUST ask them to upload a photo of their Company Registration, GST, or Govt ID card to verify their business.
   c. Do NOT mark isComplete as true for an employer until documentUrl is NOT null.
4. If userType is 'worker': Ask for missing name, category, location, and expected salary. (No ID upload required yet).
5. Ask for only ONE missing piece of info at a time.
6. If all required fields are filled (including documentUrl for employers), set isComplete to true and reply with a final confirmation.

Respond ONLY in JSON format:
{
  "updatedState": { "userType": "employer or worker or null", "name": "string or null", "category": "string or null", "location": "string or null", "salary": "string or null", "isComplete": boolean },
  "replyToUser": "Your SHORT, casual, friendly reply in the user's exact language/style (one line, one question at a time)"
}`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInputText },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(`Groq Error: ${aiData.error.message}`);
    if (!aiData.choices) throw new Error('Invalid AI Response');

    const parsed = JSON.parse(aiData.choices[0].message.content);
    const state = parsed.updatedState || {};

    // Persist updated state.
    chatState.userType = state.userType ?? chatState.userType;
    chatState.name = state.name ?? chatState.name;
    chatState.category = state.category ?? chatState.category;
    chatState.location = state.location ?? chatState.location;
    chatState.salary = state.salary ?? chatState.salary;
    chatState.isComplete = !!state.isComplete;
    await chatState.save();

    let reply = parsed.replyToUser || '';

    // ------------------------------------------------------------------
    // 3. DATABASE UNIFICATION — WRITE DIRECTLY TO NATIVE MONGODB
    // ------------------------------------------------------------------
    if (chatState.isComplete) {
      const finalAudioUrl = chatState.audioInterviewUrl || audioUrl || null;

      if (chatState.userType === 'worker') {
        const candidatesCol = await getCandidates();
        await candidatesCol.updateOne(
          { phone: senderPhone },
          {
            $set: {
              phone: senderPhone,
              name: chatState.name || 'WhatsApp User',
              role_category: chatState.category,
              address: chatState.location,
              salary_expected: chatState.salary,
              source: 'whatsapp',
              ai_source: 'whatsapp_groq_whisper',
              audio_interview_url: finalAudioUrl,
              trust_score: 70,
              verification_status: 'pending',
              updated_at: new Date(),
            },
            $setOnInsert: { created_at: new Date(), _id: `wa_${Date.now()}` },
          },
          { upsert: true }
        );

        reply +=
          '\n\n✅ Your profile is live! Employers can now find you' +
          (finalAudioUrl ? ' and listen to your voice note.' : '.');
      } else if (chatState.userType === 'employer') {
        const jobsCol = await getJobs();
        const candidatesCol = await getCandidates();

        await jobsCol.insertOne({
          _id: `wa_job_${Date.now()}`,
          category: chatState.category,
          employer_phone: senderPhone,
          location: { label: chatState.location },
          salary: chatState.salary,
          status: 'active',
          source: 'whatsapp',
          created_at: new Date(),
        });

        const matches = await candidatesCol
          .find({
            role_category: { $regex: new RegExp(chatState.category, 'i') },
            verification_status: { $ne: 'rejected' },
          })
          .limit(3)
          .toArray();

        reply += '\n\n🔥 *Your job is posted. Here are your top matches:*';
        if (matches.length === 0) {
          reply +=
            "\n\n⏳ We're still looking for candidates in this category. We'll notify you as soon as one registers.";
        } else {
          matches.forEach((c) => {
            reply += `\n\n👤 *${c.name || 'Worker'}* — 📍 ${c.address || 'Local'}`;
            if (c.salary_expected) reply += `\n💰 ${c.salary_expected}`;
            if (c.phone) reply += `\n📞 ${c.phone}`;
            if (c.audio_interview_url) {
              reply += `\n🎤 Listen to interview: ${c.audio_interview_url}`;
            }
          });
        }
      }

      // Cleanup conversation memory once the DB writes are done.
      await ChatState.deleteOne({ phoneNumber: senderPhone });
    }

    // ------------------------------------------------------------------
    // 4. SEND TWILIO RESPONSE
    // ------------------------------------------------------------------
    return twimlReply(reply);
  } catch (error) {
    console.error('Webhook Error:', error);
    return twimlReply('Sorry, our AI is experiencing a glitch. Please try again.');
  }
}
