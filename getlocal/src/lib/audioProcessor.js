import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processTwilioAudioWithWhisper(mediaUrl) {
  try {
    // 1. Fetch audio from Twilio 
    // (If your Twilio console requires auth for media, you need the headers. If public, standard fetch works)
    const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(mediaUrl, {
      headers: { 'Authorization': `Basic ${twilioAuth}` }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch Twilio audio: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Vercel Blob for a permanent public URL
    const filename = `whatsapp_audio_${Date.now()}.ogg`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'audio/ogg', // Twilio voice notes are typically ogg
    });

    // 3. Write temporarily to disk for Whisper
    const tmpPath = path.join('/tmp', filename);
    fs.writeFileSync(tmpPath, buffer);

    // 4. Send to OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
    });

    // Clean up tmp file
    fs.unlinkSync(tmpPath);

    return {
      transcriptionText: transcription.text,
      audio_interview_url: blob.url
    };
  } catch (error) {
    console.error("Audio Processing Error:", error);
    return {
      transcriptionText: null,
      audio_interview_url: null
    };
  }
}
