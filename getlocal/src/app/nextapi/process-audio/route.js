import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { createReadStream } from 'fs';
import { access, constants } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

// Mock fallback data
const MOCK_NAMES = ['Rajesh Kumar', 'Priya Singh', 'Amit Sharma', 'Sunita Devi', 'Vikram Yadav', 'Meera Patel'];
const MOCK_ROLES = ['Driver', 'Cook', 'Security Guard', 'House Helper', 'Delivery Executive'];
const MOCK_SUMMARIES = [
  'Experienced professional with strong communication skills. Has worked in multiple household and commercial settings with excellent references.',
  'Dedicated worker with proven track record in customer-facing roles. Known for punctuality and reliability.',
  'Skilled candidate with hands-on experience in the service industry. Demonstrates strong work ethic and adaptability.',
  'Reliable professional seeking stable employment. Previous employers praise attention to detail and positive attitude.'
];

export async function POST(request) {
  console.log('[PROCESS] ========== TRANSCRIPTION REQUEST ==========');

  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    console.log('[PROCESS] Processing candidate:', candidateId);

    const candidates = await getCandidates();
    const candidate = await candidates.findOne({ _id: candidateId });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.audio_interview_url) {
      return NextResponse.json({ error: 'No audio file for this candidate' }, { status: 400 });
    }

    const audioPath = path.join(process.cwd(), 'public', candidate.audio_interview_url);
    console.log('[PROCESS] Audio path:', audioPath);

    // Try real OpenAI, fall back to mock
    let result;
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY not set');

      await access(audioPath, constants.R_OK);

      const openai = new OpenAI({ apiKey });
      const langCode = candidate.lang_code || 'en';

      // Whisper transcription
      console.log(`[PROCESS] Whisper transcription (lang=${langCode})...`);
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-1',
        language: langCode,
        response_format: 'text',
      });

      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Whisper returned empty transcript');
      }

      console.log(`[PROCESS] Transcript: ${transcription.substring(0, 200)}...`);

      // GPT-4o-mini extraction
      console.log('[PROCESS] GPT-4o-mini extraction...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a hiring assistant for blue-collar workers in India. Extract candidate info from interview transcripts (which may be in regional Indian languages). Always respond in English. Return ONLY a JSON object with exactly these three fields:
- "name": the candidate's full name (string)
- "experience_years": years of work experience (number, 0 if unknown)
- "professional_summary": a 2-sentence professional summary in English (string)`
          },
          { role: 'user', content: `Extract the candidate profile from this interview transcript:\n\n${transcription}` }
        ],
        temperature: 0.2,
      });

      const extracted = JSON.parse(completion.choices[0].message.content);

      result = {
        name: extracted.name || 'Unknown',
        role: candidate.role_category || 'General',
        experience_years: Number(extracted.experience_years) || 0,
        summary: extracted.professional_summary || 'Profile extracted from voice interview.',
        transcription,
        ai_source: 'openai',
        mock: false,
      };

    } catch (aiError) {
      console.error(`[PROCESS] OpenAI failed: ${aiError.message}, using mock data`);
      result = {
        name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
        role: MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)],
        experience_years: Math.floor(Math.random() * 8) + 1,
        summary: MOCK_SUMMARIES[Math.floor(Math.random() * MOCK_SUMMARIES.length)],
        transcription: `[MOCK FALLBACK] OpenAI unavailable: ${aiError.message}`,
        ai_source: 'mock_fallback',
        mock: true,
      };
    }

    // Update MongoDB
    await candidates.updateOne(
      { _id: candidateId },
      {
        $set: {
          name: result.name,
          role_category: result.role,
          experience_years: result.experience_years,
          professional_summary: result.summary,
          transcription: result.transcription,
          moltbot_processed: true,
          ai_source: result.ai_source,
          processed_at: new Date()
        }
      }
    );

    console.log('[PROCESS] ========== SUCCESS ==========');

    return NextResponse.json({
      success: true,
      candidateId,
      mock: result.mock,
      ai_source: result.ai_source,
      extracted: {
        name: result.name,
        role: result.role,
        experience_years: result.experience_years,
        summary: result.summary
      },
      message: result.mock
        ? 'OpenAI unavailable, used mock data. Profile saved.'
        : 'Real transcription complete via Whisper + GPT-4o-mini.'
    });

  } catch (error) {
    console.error('[PROCESS ERROR]', error.message);
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 }
    );
  }
}
