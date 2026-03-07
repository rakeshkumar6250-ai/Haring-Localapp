import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
    
    console.log('[UPLOAD] Metadata:', JSON.stringify({ 
      langCode, interviewType, questionsAnswered, lat, lng 
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
      
      const candidate = {
        _id: candidateId,
        name: extractedName || `Candidate ${candidateId.slice(0, 6)}`,
        phone: '',
        location: { lat, lng },
        role_category: extractedRole || 'General',
        audio_interview_url: `/audio/${fileName}`,
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
