import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const language = formData.get('language') || 'en';
    const langCode = formData.get('lang_code') || language; // For translation model
    const interviewType = formData.get('interview_type') || 'freeform';
    const questionsAnswered = parseInt(formData.get('questions_answered')) || 0;
    const lat = parseFloat(formData.get('lat')) || 28.6139;
    const lng = parseFloat(formData.get('lng')) || 77.2090;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename with language tag
    const candidateId = uuidv4();
    const fileName = `${candidateId}_lang-${langCode}.webm`;
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await mkdir(audioDir, { recursive: true });
    
    // Save audio file
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(audioDir, fileName);
    await writeFile(filePath, buffer);

    // Create candidate record in MongoDB with language metadata
    const candidates = await getCandidates();
    
    const candidate = {
      _id: candidateId,
      name: `Candidate ${candidateId.slice(0, 6)}`, // Placeholder, MoltBot will extract
      phone: '', // To be filled by MoltBot transcription
      location: { lat, lng },
      role_category: 'General', // MoltBot will categorize
      audio_interview_url: `/audio/${fileName}`,
      
      // Language metadata for translation model
      language: language,
      lang_code: langCode,
      interview_metadata: {
        type: interviewType,
        questions_answered: questionsAnswered,
        translation_model: getTranslationModel(langCode),
        recorded_at: new Date()
      },
      
      is_verified: false,
      created_at: new Date(),
      transcription: null, // MoltBot will populate
      moltbot_processed: false
    };

    await candidates.insertOne(candidate);

    console.log(`[UPLOAD] Audio saved: ${fileName}`);
    console.log(`[UPLOAD] Language: ${langCode} | Translation Model: ${getTranslationModel(langCode)}`);
    console.log(`[UPLOAD] Interview Type: ${interviewType} | Questions: ${questionsAnswered}`);
    console.log(`[MOLTBOT HOOK] Ready for processing: /audio/${fileName}`);

    return NextResponse.json({
      success: true,
      candidateId,
      audioUrl: `/audio/${fileName}`,
      language: langCode,
      translationModel: getTranslationModel(langCode),
      message: 'Audio uploaded successfully. AI Agent will process shortly.'
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio: ' + error.message },
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