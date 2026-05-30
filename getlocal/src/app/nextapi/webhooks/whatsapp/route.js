import { NextResponse } from 'next/server';
import twilio from 'twilio';
import OpenAI from 'openai';
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
    const systemPrompt = `You are a friendly hiring assistant. You MUST reply in conversational 'Tinglish' (Telugu words written in the English alphabet) or very simple, spoken street Telugu. Keep questions extremely short and easy to understand for a blue-collar worker.

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

Current State (info already collected — TREAT THESE AS CONFIRMED, never ask for a field that is already filled): ${JSON.stringify({
      userType: chatState.userType,
      name: chatState.name,
      category: chatState.category,
      location: chatState.location,
      salary: chatState.salary,
      documentUrl: chatState.documentUrl,
      isComplete: chatState.isComplete,
    })}

How to decide your reply (follow in order, every turn):
1. First merge any new info from the user's latest message into the Current State above. Echo back every value you already know — do NOT reset known fields to null.
2. If userType is null -> ask: do they want to FIND a job (worker) or HIRE someone (employer)?
3. WORKER required fields: name, category (job type), location, salary. Ask for ONLY the first field that is still null — one short question.
4. EMPLOYER required fields: category, location, salary, AND a verification document (documentUrl). If category/location/salary are filled but documentUrl is null, ask them to send a photo of their GST / shop / Govt ID.
5. COMPLETION RULE (very important): The moment ALL required fields for the user's type are non-null (worker: name+category+location+salary; employer: category+location+salary+documentUrl), you MUST set "isComplete": true and make "reply" a short friendly confirmation. Do NOT ask any more questions once everything is filled.
6. Never ask two things at once. Keep it to one short line.

Respond ONLY in JSON format. You MUST output ONLY a raw JSON object. Do not output plain text. Do not include markdown, backticks, or any text outside the JSON. Always include EVERY field, carrying forward known values from Current State. Use this EXACT schema:
{ "reply": "<Write your conversational Tinglish/Telugu response here>", "isComplete": <boolean: true or false>, "userType": "<worker or employer, or null if not yet known>", "name": "<the person's name, or null>", "category": "<the job type, e.g., driver, cook, or null>", "location": "<the city/location, or null>", "salary": "<the salary/expected pay, or null>" }`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInputText },
      ],
      response_format: { type: 'json_object' },
    });

    if (!completion.choices) throw new Error('Invalid AI Response');

    const parsed = JSON.parse(completion.choices[0].message.content);

    // Persist updated state (flat format; missing fields keep their existing value).
    chatState.userType = parsed.userType ?? chatState.userType;
    chatState.name = parsed.name ?? chatState.name;
    chatState.category = parsed.category ?? chatState.category;
    chatState.location = parsed.location ?? chatState.location;
    chatState.salary = parsed.salary ?? chatState.salary;

    // Deterministic completion guard: the LLM is inconsistent about flipping
    // isComplete, so derive it server-side once every required field is present.
    // (Worker: name+category+location+salary. Employer: + verification document.)
    const workerComplete =
      chatState.userType === 'worker' &&
      !!chatState.name && !!chatState.category && !!chatState.location && !!chatState.salary;
    const employerComplete =
      chatState.userType === 'employer' &&
      !!chatState.category && !!chatState.location && !!chatState.salary && !!chatState.documentUrl;

    chatState.isComplete = !!parsed.isComplete || workerComplete || employerComplete;
    await chatState.save();

    let reply = parsed.reply || '';

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
