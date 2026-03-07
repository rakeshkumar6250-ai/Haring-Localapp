# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first blue-collar hiring platform that enables workers to create audio-based profiles and employers to find local candidates.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: MongoDB (getlocal database)
- **Location**: /app/getlocal/

## Core User Flows

### Job Seeker Flow (/join)
1. Record voice interview in preferred language (en/hi/te)
2. Audio uploaded to server
3. AI processes and extracts profile data

### Employer Flow (/hire)
1. View candidate cards with AI-extracted profiles
2. Filter by role and distance
3. Unlock profiles with credits (10 per unlock)

## What's Been Implemented

### Session: March 7, 2026
- [x] **Mock Transcription Flow**: Automatic background processing after audio upload
  - Waits 5 seconds after upload
  - Populates `name`, `experience_years`, `professional_summary` in MongoDB
  - Language-aware mock data (Hindi/Telugu/English based on lang_code)
  
- [x] **Hire Page UI Update**: Candidate cards now display:
  - Extracted Name prominently (not generic "Candidate X")
  - AI Profile Summary section with gradient background
  - Experience badge (e.g., "4 yrs exp")
  - Language badge (हिंदी, తెలుగు, English)
  - "⏳ Processing..." badge for unprocessed uploads
  - "✓ AI Processed" badge for completed profiles
  - Compact audio player + View Full Transcript button

### Previous Session
- Audio upload API (/nextapi/upload-audio)
- Candidates API (/nextapi/candidates)
- Wallet API (/nextapi/wallet)
- Unlock API (/nextapi/unlock)
- Process Audio API (/nextapi/process-audio)

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Upload .webm audio, triggers background processing |
| /nextapi/candidates | GET | List all candidates |
| /nextapi/wallet | GET/POST | Get balance / Add credits |
| /nextapi/unlock | POST | Unlock candidate profile (10 credits) |
| /nextapi/process-audio | POST | Manual trigger for AI processing |

## Database Schema (candidates collection)
```javascript
{
  _id: string,
  name: string,
  phone: string,
  location: { lat, lng },
  role_category: string,
  audio_interview_url: string,
  lang_code: "en" | "hi" | "te",
  experience_years: number,
  professional_summary: string,
  transcription: string,
  moltbot_processed: boolean,
  processed_at: Date,
  is_verified: boolean,
  created_at: Date
}
```

## Prioritized Backlog

### P0 - Critical
- [ ] Real Whisper API integration (replace mock)
- [ ] Phone number capture in voice flow

### P1 - High Priority
- [ ] SMS verification for candidates
- [ ] Employer authentication
- [ ] Payment integration for credits

### P2 - Nice to Have
- [ ] Push notifications
- [ ] WhatsApp integration
- [ ] Employer dashboard analytics

## Next Tasks
1. Integrate real Whisper API for transcription
2. Add phone number extraction from voice
3. Implement employer auth flow
