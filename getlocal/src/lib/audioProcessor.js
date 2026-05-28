import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Downloads a Twilio voice note, transcribes it with OpenAI Whisper (preserving
 * the original spoken language), and optionally archives it to Vercel Blob.
 *
 * Transcription is the critical path. Blob archival is best-effort and never
 * blocks the returned transcript.
 *
 * @param {string} mediaUrl - Twilio media URL for the audio attachment.
 * @returns {Promise<{ transcriptionText: string|null, audio_interview_url: string|null }>}
 */
export async function processTwilioAudioWithWhisper(mediaUrl) {
  let tmpPath = null;
  let transcriptionText = null;
  let audio_interview_url = null;

  try {
    // 1. Fetch audio from Twilio (media URLs require basic auth)
    const twilioAuth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Twilio audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Write temporarily to disk for Whisper
    const filename = `whatsapp_audio_${Date.now()}.ogg`;
    tmpPath = path.join('/tmp', filename);
    fs.writeFileSync(tmpPath, buffer);

    // 3. Transcribe with Whisper. Using the transcriptions endpoint (NOT
    //    translations) preserves the original language/script (e.g. Telugu),
    //    so the downstream Groq LLM can mirror the user's language.
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
    });
    transcriptionText = transcription.text;

    // 4. Best-effort archival to Vercel Blob (only when configured).
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: 'audio/ogg',
        });
        audio_interview_url = blob.url;
      } catch (blobError) {
        console.error('Audio Blob archival failed (non-fatal):', blobError.message);
      }
    }

    return { transcriptionText, audio_interview_url };
  } catch (error) {
    console.error('Audio Processing Error:', error);
    return { transcriptionText, audio_interview_url };
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
