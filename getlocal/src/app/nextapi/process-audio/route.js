import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { readFile } from 'fs/promises';
import path from 'path';

const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY || 'sk-emergent-62b09E4A6Ab2c772aF';

// Language code to Whisper language mapping
const LANG_MAP = {
  'en': 'en',
  'hi': 'hi',
  'te': 'te',
  'ta': 'ta'
};

export async function POST(request) {
  console.log('[PROCESS] ========== TRANSCRIPTION REQUEST ==========');
  
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    console.log('[PROCESS] Processing candidate:', candidateId);

    // Get candidate from MongoDB
    const candidates = await getCandidates();
    const candidate = await candidates.findOne({ _id: candidateId });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.audio_interview_url) {
      return NextResponse.json({ error: 'No audio file for this candidate' }, { status: 400 });
    }

    console.log('[PROCESS] Audio URL:', candidate.audio_interview_url);
    console.log('[PROCESS] Language:', candidate.lang_code);

    // Read the audio file
    const audioPath = path.join(process.cwd(), 'public', candidate.audio_interview_url);
    console.log('[PROCESS] Reading file:', audioPath);
    
    const audioBuffer = await readFile(audioPath);
    console.log('[PROCESS] Audio buffer size:', audioBuffer.length, 'bytes');

    // Step 1: Transcribe with Whisper
    console.log('[PROCESS] Starting Whisper transcription...');
    const transcript = await transcribeAudio(audioBuffer, candidate.lang_code);
    console.log('[PROCESS] Transcript:', transcript.substring(0, 200) + '...');

    // Step 2: Extract info with GPT-4o
    console.log('[PROCESS] Starting GPT-4o extraction...');
    const extractedInfo = await extractCandidateInfo(transcript, candidate.lang_code);
    console.log('[PROCESS] Extracted:', extractedInfo);

    // Step 3: Update MongoDB
    console.log('[PROCESS] Updating MongoDB...');
    await candidates.updateOne(
      { _id: candidateId },
      {
        $set: {
          name: extractedInfo.name || candidate.name,
          experience_years: extractedInfo.experience_years,
          professional_summary: extractedInfo.summary,
          transcription: transcript,
          moltbot_processed: true,
          processed_at: new Date()
        }
      }
    );

    console.log('[PROCESS] ========== SUCCESS ==========');

    return NextResponse.json({
      success: true,
      candidateId,
      extracted: extractedInfo,
      transcript_preview: transcript.substring(0, 300)
    });

  } catch (error) {
    console.error('[PROCESS ERROR]', error.message);
    console.error('[PROCESS ERROR] Stack:', error.stack);
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Transcribe audio using OpenAI Whisper API
async function transcribeAudio(audioBuffer, langCode) {
  const language = LANG_MAP[langCode] || 'en';
  
  // Create form data for the API
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  formData.append('response_format', 'json');

  // Determine the API URL based on key type
  const isEmergentKey = EMERGENT_LLM_KEY.startsWith('sk-emergent-');
  const apiUrl = isEmergentKey 
    ? 'https://integrations.emergentagent.com/api/providers/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';

  console.log('[WHISPER] Calling API:', apiUrl);
  console.log('[WHISPER] Language:', language);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[WHISPER ERROR] Status:', response.status);
    console.error('[WHISPER ERROR] Response:', errorText);
    throw new Error(`Whisper API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.text || '';
}

// Extract candidate info using GPT-4o
async function extractCandidateInfo(transcript, langCode) {
  const systemPrompt = `You are an AI assistant that extracts structured information from job candidate interview transcripts.
The transcript may be in Hindi, Telugu, or English. Extract the information regardless of language.
Respond ONLY with a valid JSON object, no markdown, no explanation.`;

  const userPrompt = `Extract the following from this interview transcript:
1. Candidate's full name
2. Total years of work experience (as a number)
3. A 2-sentence professional summary in English

Transcript:
"""${transcript}"""

Respond with JSON format:
{"name": "...", "experience_years": 0, "summary": "..."}

If any field cannot be determined, use null for name, 0 for experience, or "Profile pending review" for summary.`;

  // Determine the API URL based on key type
  const isEmergentKey = EMERGENT_LLM_KEY.startsWith('sk-emergent-');
  const apiUrl = isEmergentKey 
    ? 'https://integrations.emergentagent.com/api/providers/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  console.log('[GPT-4o] Calling API for extraction...');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMERGENT_LLM_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GPT-4o ERROR] Status:', response.status);
    console.error('[GPT-4o ERROR] Response:', errorText);
    throw new Error(`GPT-4o API failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  
  console.log('[GPT-4o] Raw response:', content);

  try {
    // Clean up the response - remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error('[GPT-4o] Failed to parse JSON:', e);
    return {
      name: null,
      experience_years: 0,
      summary: 'Profile pending review'
    };
  }
}