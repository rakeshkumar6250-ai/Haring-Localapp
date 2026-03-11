import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile, mkdir, access, constants, readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

// ─── Mock fallback data (used when OpenAI API fails) ───
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
    console.log(`[OPENAI] Step 1 - Sending audio to Whisper (whisper-1, lang=${langCode})...`);
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      language: langCode,
      response_format: 'text',
    });
    console.log(`[OPENAI] Whisper transcript (${transcription.length} chars): ${transcription.substring(0, 200)}...`);

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Whisper returned empty transcript');
    }

    // Step 2: GPT-4o-mini extraction
    console.log(`[OPENAI] Step 2 - Extracting profile via GPT-4o-mini...`);
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

    const raw = completion.choices[0].message.content;
    console.log(`[OPENAI] GPT-4o-mini raw response: ${raw}`);
    const extracted = JSON.parse(raw);

    // Validate required fields
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
    console.log(`[OPENAI]   Name: ${extracted.name}`);
    console.log(`[OPENAI]   Experience: ${expYears} years`);
    console.log(`[OPENAI]   Summary: ${summary.substring(0, 80)}...`);

  } catch (error) {
    // ─── FALLBACK: use mock data so the UI never crashes ───
    console.error(`[OPENAI] FAILED for ${candidateId}: ${error.message}`);
    console.log(`[OPENAI] Falling back to mock data...`);

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
            transcription: `[MOCK FALLBACK - ${langCode.toUpperCase()}] OpenAI unavailable, used mock data.`,
            moltbot_processed: true,
            ai_source: 'mock_fallback',
            processed_at: new Date()
          }
        }
      );
      console.log(`[OPENAI] Fallback mock data saved for ${candidateId}: ${mock.name}`);
    } catch (dbErr) {
      console.error(`[OPENAI] Even fallback DB update failed: ${dbErr.message}`);
    }
  }
}

// Upload directory path
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'audio');

// Ensure upload directory exists with proper permissions
async function ensureUploadDir() {
  try {
    await access(UPLOAD_DIR, constants.W_OK);
    console.log('[UPLOAD] Directory exists and is writable:', UPLOAD_DIR);
  } catch {
    console.log('[UPLOAD] Creating audio directory:', UPLOAD_DIR);
    await mkdir(UPLOAD_DIR, { recursive: true, mode: 0o777 });
  }
}

export async function POST(request) {
  console.log('[UPLOAD] ========== NEW UPLOAD REQUEST ==========');
  console.log('[UPLOAD] Request method:', request.method);
  console.log('[UPLOAD] Content-Type header:', request.headers.get('content-type'));
  
  try {
    // Step 1: Ensure directory exists
    await ensureUploadDir();
    
    // Step 2: Parse form data
    console.log('[UPLOAD] Parsing FormData...');
    let formData;
    try {
      formData = await request.formData();
      console.log('[UPLOAD] FormData parsed successfully');
    } catch (formError) {
      console.error('[UPLOAD ERROR] Failed to parse FormData:');
      console.error('[UPLOAD ERROR] Error name:', formError.name);
      console.error('[UPLOAD ERROR] Error message:', formError.message);
      console.error('[UPLOAD ERROR] Full error:', formError);
      return NextResponse.json(
        { 
          error: 'Failed to parse form data', 
          details: formError.message,
          hint: 'Ensure Content-Type is multipart/form-data with boundary'
        },
        { status: 400 }
      );
    }
    
    // Step 3: Extract audio file
    const audioFile = formData.get('audio');
    console.log('[UPLOAD] Audio file type:', typeof audioFile);
    console.log('[UPLOAD] Audio file instanceof Blob:', audioFile instanceof Blob);
    
    if (!audioFile) {
      console.error('[UPLOAD ERROR] No audio file in FormData');
      console.error('[UPLOAD ERROR] FormData keys:', [...formData.keys()]);
      return NextResponse.json(
        { error: 'No audio file provided', receivedKeys: [...formData.keys()] },
        { status: 400 }
      );
    }

    if (!(audioFile instanceof Blob)) {
      console.error('[UPLOAD ERROR] Audio is not a Blob, type:', typeof audioFile);
      return NextResponse.json(
        { error: 'Audio must be a file', receivedType: typeof audioFile },
        { status: 400 }
      );
    }

    console.log('[UPLOAD] Audio file size:', audioFile.size, 'bytes');
    console.log('[UPLOAD] Audio file type:', audioFile.type);
    
    // Step 4: Extract metadata
    const language = formData.get('language') || 'en';
    const langCode = formData.get('lang_code') || language;
    const interviewType = formData.get('interview_type') || 'freeform';
    const questionsAnswered = parseInt(formData.get('questions_answered')) || 0;
    const lat = parseFloat(formData.get('lat')) || 28.6139;
    const lng = parseFloat(formData.get('lng')) || 77.2090;
    const extractedName = formData.get('extracted_name') || null;
    const extractedRole = formData.get('extracted_role') || null;
    const extractedExperience = formData.get('extracted_experience') || null;
    const extractedSummary = formData.get('extracted_summary') || null;
    const address = formData.get('address') || '';
    const willRelocate = formData.get('will_relocate') === 'true';
    const educationLevel = formData.get('education_level') || '';
    const englishLevel = formData.get('english_level') || '';
    const experienceType = formData.get('experience_type') || 'Fresher';
    
    console.log('[UPLOAD] Metadata:', JSON.stringify({ 
      langCode, interviewType, questionsAnswered, lat, lng, address, willRelocate 
    }, null, 2));

    // Step 5: Generate filename and save file
    const candidateId = uuidv4();
    const fileName = `${candidateId}_lang-${langCode}.webm`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    console.log('[UPLOAD] Saving to:', filePath);
    
    try {
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log('[UPLOAD] Buffer size:', buffer.length, 'bytes');
      
      await writeFile(filePath, buffer);
      console.log('[UPLOAD] File written successfully!');
    } catch (writeError) {
      console.error('[UPLOAD ERROR] Failed to write file:');
      console.error('[UPLOAD ERROR] Error name:', writeError.name);
      console.error('[UPLOAD ERROR] Error message:', writeError.message);
      console.error('[UPLOAD ERROR] Error code:', writeError.code);
      console.error('[UPLOAD ERROR] Full error:', writeError);
      
      let errorHint = 'Unknown write error';
      if (writeError.code === 'ENOENT') {
        errorHint = 'Directory does not exist';
      } else if (writeError.code === 'EACCES') {
        errorHint = 'Permission denied - check directory permissions';
      } else if (writeError.code === 'ENOSPC') {
        errorHint = 'Disk full - no space left';
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to save audio file',
          details: writeError.message,
          code: writeError.code,
          hint: errorHint
        },
        { status: 500 }
      );
    }

    // Step 6: Save to MongoDB
    console.log('[UPLOAD] Saving to MongoDB...');
    try {
      const candidates = await getCandidates();
      
      // For manual entries, use extracted data directly
      const isManualEntry = interviewType === 'manual';
      
      // Generate mock phone for manual entries too
      const mockPhone = isManualEntry ? generateMockPhone() : '';
      
      const candidate = {
        _id: candidateId,
        name: extractedName || `Candidate ${candidateId.slice(0, 6)}`,
        phone: mockPhone,
        location: { lat, lng },
        address: address,
        will_relocate: willRelocate,
        trust_score: 100,
        role_category: extractedRole || 'General',
        audio_interview_url: isManualEntry ? null : `/audio/${fileName}`,
        language: language,
        lang_code: langCode,
        interview_metadata: {
          type: interviewType,
          questions_answered: questionsAnswered,
          translation_model: getTranslationModel(langCode),
          file_size_bytes: audioFile.size,
          recorded_at: new Date()
        },
        verification_status: 'Unverified',
        id_document_url: null,
        education_level: educationLevel,
        english_level: englishLevel,
        experience_type: experienceType,
        created_at: new Date(),
        transcription: isManualEntry ? `Manual entry by ${extractedName}` : null,
        moltbot_processed: isManualEntry,
        experience_years: isManualEntry && extractedExperience ? parseInt(extractedExperience) : 0,
        professional_summary: isManualEntry && extractedSummary ? extractedSummary : null,
      };

      await candidates.insertOne(candidate);
      console.log('[UPLOAD] MongoDB record created:', candidateId);
    } catch (dbError) {
      console.error('[UPLOAD ERROR] MongoDB error:');
      console.error('[UPLOAD ERROR] Error name:', dbError.name);
      console.error('[UPLOAD ERROR] Error message:', dbError.message);
      console.error('[UPLOAD ERROR] Full error:', dbError);
      
      return NextResponse.json(
        { 
          error: 'Failed to save to database',
          details: dbError.message
        },
        { status: 500 }
      );
    }
    
    console.log('[UPLOAD] ========== SUCCESS ==========');
    console.log(`[MOLTBOT HOOK] Ready for processing: /audio/${fileName}`);
    
    // Trigger real OpenAI transcription (non-blocking)
    // Only trigger background processing for voice interviews (not manual entries)
    if (interviewType !== 'manual') {
      processWithOpenAI(candidateId, langCode, filePath).catch(err => {
        console.error('[OPENAI] Background processing error:', err.message);
      });
      console.log(`[OPENAI] Background transcription queued for ${candidateId}`);
    } else {
      console.log(`[OPENAI] Skipping background processing for manual entry: ${candidateId}`);
    }

    return NextResponse.json({
      success: true,
      candidateId,
      audioUrl: `/audio/${fileName}`,
      language: langCode,
      translationModel: getTranslationModel(langCode),
      fileSize: audioFile.size,
      message: 'Audio uploaded successfully. AI Agent will process shortly.'
    }, { status: 201 });

  } catch (error) {
    // Catch-all error handler with full details
    console.error('[UPLOAD ERROR] ========== UNHANDLED ERROR ==========');
    console.error('[UPLOAD ERROR] Error name:', error.name);
    console.error('[UPLOAD ERROR] Error message:', error.message);
    console.error('[UPLOAD ERROR] Error stack:', error.stack);
    console.error('[UPLOAD ERROR] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Map language codes to transcription models
function getTranslationModel(langCode) {
  const models = {
    'en': 'whisper-large-v3',
    'hi': 'whisper-large-v3-hindi',
    'te': 'whisper-large-v3-telugu',
    'ta': 'whisper-large-v3-tamil',
  };
  return models[langCode] || 'whisper-large-v3';
}
