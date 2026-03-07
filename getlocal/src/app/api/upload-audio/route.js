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
    const lat = parseFloat(formData.get('lat')) || 28.6139;
    const lng = parseFloat(formData.get('lng')) || 77.2090;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const candidateId = uuidv4();
    const fileName = `${candidateId}.webm`;
    
    // Ensure audio directory exists
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await mkdir(audioDir, { recursive: true });
    
    // Save audio file
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(audioDir, fileName);
    await writeFile(filePath, buffer);

    // Create candidate record in MongoDB
    const candidates = await getCandidates();
    
    const candidate = {
      _id: candidateId,
      name: `Candidate ${candidateId.slice(0, 6)}`, // Placeholder, MoltBot will extract
      phone: '', // To be filled by MoltBot transcription
      location: { lat, lng },
      role_category: 'General', // MoltBot will categorize
      audio_interview_url: `/audio/${fileName}`,
      language,
      is_verified: false,
      created_at: new Date(),
      transcription: null, // MoltBot will populate
      moltbot_processed: false
    };

    await candidates.insertOne(candidate);

    console.log(`[UPLOAD] Audio saved: ${fileName}`);
    console.log(`[UPLOAD] Candidate created: ${candidateId}`);
    console.log(`[MOLTBOT HOOK] Ready for processing: /audio/${fileName}`);

    return NextResponse.json({
      success: true,
      candidateId,
      audioUrl: `/audio/${fileName}`,
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

export const config = {
  api: {
    bodyParser: false,
  },
};