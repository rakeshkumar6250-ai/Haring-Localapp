import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { onCandidateCreatedOrUpdated } from '@/lib/matching';

// ─── Mock fallback data ───
const MOCK_NAMES = ['Rajesh Kumar', 'Priya Singh', 'Amit Sharma', 'Sunita Devi', 'Vikram Yadav', 'Meera Patel'];
const MOCK_SUMMARIES = [
  'Experienced professional with strong communication skills. Has worked in multiple household and commercial settings.',
  'Dedicated worker with proven track record in customer-facing roles. Known for punctuality and reliability.',
  'Skilled candidate with hands-on experience in the service industry. Demonstrates strong work ethic.',
  'Reliable professional seeking stable employment. Previous employers praise attention to detail.'
];

function generateMockPhone() {
  const prefixes = ['98765', '99887', '97654', '96543', '95432', '94321', '93210', '92109'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `+91 ${prefix} ${suffix}`;
}

function getMockProfile() {
  return {
    name: MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
    experience_years: Math.floor(Math.random() * 8) + 1,
    professional_summary: MOCK_SUMMARIES[Math.floor(Math.random() * MOCK_SUMMARIES.length)],
  };
}

// ─── Real OpenAI processing: Whisper → GPT-4o-mini ───
async function processWithOpenAI(candidateId, langCode, filePath) {
  console.log(`[OPENAI] Starting real transcription for ${candidateId} (lang: ${langCode})`);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const openai = new OpenAI({ apiKey });

    // Step 1: Whisper transcription
    console.log(`[OPENAI] Sending audio to Whisper (whisper-1, lang=${langCode})...`);
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      language: langCode,
      response_format: 'text',
    });

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Whisper returned empty transcript');
    }

    // Step 2: GPT-4o-mini extraction
    console.log(`[OPENAI] Extracting profile via GPT-4o-mini...`);
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
        {
          role: 'user',
          content: `Extract the candidate profile from this interview transcript:\n\n${transcription}`
        }
      ],
      temperature: 0.2,
    });

    const extracted = JSON.parse(completion.choices[0].message.content);

    if (!extracted.name || typeof extracted.name !== 'string') throw new Error('Missing name in GPT response');
    const expYears = Number(extracted.experience_years) || 0;
    const summary = extracted.professional_summary || 'Profile extracted from voice interview.';

    // Step 3: Update MongoDB
    const candidates = await getCandidates();
    await candidates.updateOne(
      { _id: candidateId },
      {
        $set: {
          name: extracted.name,
          phone: generateMockPhone(),
          experience_years: expYears,
          professional_summary: summary,
          transcription: transcription,
          moltbot_processed: true,
          ai_source: 'openai',
          processed_at: new Date()
        }
      }
    );

    console.log(`[OPENAI] SUCCESS for ${candidateId}`);

    // Trigger matching
    const updatedCandidate = await candidates.findOne({ _id: candidateId });
    if (updatedCandidate) {
      onCandidateCreatedOrUpdated(updatedCandidate).catch(err =>
        console.error('[MATCH] Voice candidate match trigger error:', err.message)
      );
    }

  } catch (error) {
    console.error(`[OPENAI] FAILED for ${candidateId}: ${error.message}`);
    const mock = getMockProfile();
    try {
      const candidates = await getCandidates();
      await candidates.updateOne(
        { _id: candidateId },
        {
          $set: {
            name: mock.name,
            phone: generateMockPhone(),
            experience_years: mock.experience_years,
            professional_summary: mock.professional_summary,
            transcription: `[MOCK FALLBACK] OpenAI unavailable, used mock data.`,
            moltbot_processed: true,
            ai_source: 'mock_fallback',
            processed_at: new Date()
          }
        }
      );
    } catch (dbErr) {
      console.error(`[OPENAI] Fallback DB update failed: ${dbErr.message}`);
    }
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'No valid audio file provided' }, { status: 400 });
    }

    const language = formData.get('language') || 'en';
    const langCode = formData.get('lang_code') || language;
    const interviewType = formData.get('interview_type') || 'freeform';
    const extractedName = formData.get('extracted_name') || null;
    const candidateId = uuidv4();
    const fileName = `${candidateId}_lang-${langCode}.webm`;

    // 1. Upload to Vercel Blob for permanent public URL
    const blob = await put(`audio/${fileName}`, audioFile, { access: 'public' });
    const permanentAudioUrl = blob.url;

    // 2. Save to Vercel's temporary /tmp folder for OpenAI to process right now
    const tmpPath = path.join('/tmp', fileName);
    const bytes = await audioFile.arrayBuffer();
    await writeFile(tmpPath, Buffer.from(bytes));

    // 3. Save to MongoDB
    const isManualEntry = interviewType === 'manual';
    const candidates = await getCandidates();
    
    const candidate = {
      _id: candidateId,
      name: extractedName || `Candidate ${candidateId.slice(0, 6)}`,
      phone: isManualEntry ? generateMockPhone() : '',
      location: { 
        lat: parseFloat(formData.get('lat')) || 28.6139, 
        lng: parseFloat(formData.get('lng')) || 77.2090 
      },
      address: formData.get('address') || '',
      will_relocate: formData.get('will_relocate') === 'true',
      trust_score: 100,
      role_category: formData.get('extracted_role') || 'General',
      audio_interview_url: isManualEntry ? null : permanentAudioUrl,
      language: language,
      lang_code: langCode,
      interview_metadata: {
        type: interviewType,
        file_size_bytes: audioFile.size,
        recorded_at: new Date()
      },
      verification_status: 'Unverified',
      created_at: new Date(),
      moltbot_processed: isManualEntry,
    };

    await candidates.insertOne(candidate);
    
    // 4. Trigger OpenAI
    if (!isManualEntry) {
      processWithOpenAI(candidateId, langCode, tmpPath).catch(err => {
        console.error('[OPENAI] Background processing error:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      candidateId,
      audioUrl: permanentAudioUrl,
      message: 'Audio uploaded successfully. AI Agent will process shortly.'
    }, { status: 201 });

  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}