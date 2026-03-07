import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ensure upload directory exists on startup
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'audio');

async function ensureUploadDir() {
  try {
    await access(UPLOAD_DIR);
  } catch {
    console.log('[UPLOAD] Creating audio directory:', UPLOAD_DIR);
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request) {
  console.log('[UPLOAD] Received upload request');
  
  try {
    // Ensure directory exists
    await ensureUploadDir();
    
    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract audio file
    const audioFile = formData.get('audio');
    if (!audioFile || !(audioFile instanceof Blob)) {
      console.error('[UPLOAD ERROR] No audio file in request');
      return NextResponse.json(
        { error: 'No audio file provided', details: 'Expected multipart/form-data with audio field' },
        { status: 400 }
      );
    }
    
    console.log('[UPLOAD] Audio file received, size:', audioFile.size, 'bytes');
    
    // Extract metadata from form
    const language = formData.get('language') || 'en';
    const langCode = formData.get('lang_code') || language;
    const interviewType = formData.get('interview_type') || 'freeform';
    const questionsAnswered = parseInt(formData.get('questions_answered')) || 0;
    const lat = parseFloat(formData.get('lat')) || 28.6139;
    const lng = parseFloat(formData.get('lng')) || 77.2090;
    const extractedName = formData.get('extracted_name') || null;
    const extractedRole = formData.get('extracted_role') || null;
    
    console.log('[UPLOAD] Metadata:', { langCode, interviewType, questionsAnswered, extractedName, extractedRole });

    // Generate unique candidate ID and filename
    const candidateId = uuidv4();
    const fileName = `${candidateId}_lang-${langCode}.webm`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Convert blob to buffer and save
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log('[UPLOAD] Writing file to:', filePath);
    await writeFile(filePath, buffer);
    console.log('[UPLOAD] File written successfully');

    // Create candidate record in MongoDB
    const candidates = await getCandidates();
    
    const candidate = {
      _id: candidateId,
      name: extractedName || `Candidate ${candidateId.slice(0, 6)}`,
      phone: '',
      location: { lat, lng },
      role_category: extractedRole || 'General',
      audio_interview_url: `/audio/${fileName}`,
      
      // Language metadata for translation model
      language: language,
      lang_code: langCode,
      interview_metadata: {
        type: interviewType,
        questions_answered: questionsAnswered,
        translation_model: getTranslationModel(langCode),
        file_size_bytes: audioFile.size,
        recorded_at: new Date()
      },
      
      is_verified: false,
      created_at: new Date(),
      transcription: null,
      moltbot_processed: false
    };

    const result = await candidates.insertOne(candidate);
    console.log('[UPLOAD] MongoDB insert result:', result.insertedId);
    
    console.log(`[UPLOAD SUCCESS] Audio saved: ${fileName}`);
    console.log(`[UPLOAD SUCCESS] Language: ${langCode} | Model: ${getTranslationModel(langCode)}`);
    console.log(`[MOLTBOT HOOK] Ready for processing: /audio/${fileName}`);

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
    // Detailed error logging
    console.error('[UPLOAD ERROR] Failed to process upload:');
    console.error('[UPLOAD ERROR] Name:', error.name);
    console.error('[UPLOAD ERROR] Message:', error.message);
    console.error('[UPLOAD ERROR] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload audio',
        details: error.message,
        type: error.name
      },
      { status: 500 }
    );
  }
}

// Map language codes to appropriate translation/transcription models
function getTranslationModel(langCode) {
  const models = {
    'en': 'whisper-large-v3',
    'hi': 'whisper-large-v3-hindi',
    'te': 'whisper-large-v3-telugu',
    'ta': 'whisper-large-v3-tamil',
    'default': 'whisper-large-v3'
  };
  return models[langCode] || models.default;
}

export const config = {
  api: {
    bodyParser: false,
  },
};