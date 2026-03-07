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
3. AI processes and extracts profile data (name, phone, experience, summary)

### Employer Flow (/hire)
1. View candidate cards with AI-extracted profiles
2. See Smart Match scores (based on experience vs job requirements)
3. Unlock profiles with credits (10 per unlock) to reveal phone numbers
4. Call candidates directly

## What's Been Implemented

### Session 2: March 7, 2026
- [x] **Phone Number Extraction**: Mock phone generated during transcription (+91 XXXXX XXXXX format)
- [x] **Credit Unlock Loop (Monetization)**:
  - Phone numbers masked: +91 XX*** *****
  - Unlock button deducts 10 credits
  - Full phone revealed after unlock
  - "Call Now" button replaces "Unlock" button
  - Credits update in real-time in header
- [x] **Smart Match Feature**:
  - Match score displayed on candidate cards
  - Calculation: experience_years vs 3 years job requirement
  - Color coding: GREEN (>=85%), AMBER (70-84%), RED (<70%)
  - Formula: >= 3yrs = 85-98%, < 3yrs = 40-85%

### Session 1: March 7, 2026
- [x] Mock Transcription Flow (5 second background processing)
- [x] Language-aware mock data (Hindi/Telugu/English)
- [x] Updated Hire Page UI with extracted Name and AI Summary
- [x] Experience and language badges

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Upload .webm audio, triggers background processing |
| /nextapi/candidates | GET | List all candidates |
| /nextapi/wallet | GET/POST | Get balance / Add credits |
| /nextapi/unlock | POST | Unlock candidate profile (10 credits, returns phone) |
| /nextapi/process-audio | POST | Manual trigger for AI processing |

## Database Schema

### candidates collection
```javascript
{
  _id: string,
  name: string,
  phone: string,              // +91 XXXXX XXXXX format
  location: { lat, lng },
  role_category: string,
  audio_interview_url: string,
  lang_code: "en" | "hi" | "te",
  experience_years: number,    // 1-8 years (mock)
  professional_summary: string,
  transcription: string,
  moltbot_processed: boolean,
  processed_at: Date,
  is_verified: boolean,
  created_at: Date
}
```

### wallets collection
```javascript
{
  user_id: string,
  credit_balance: number,     // Default: 100
  unlocked_candidates: [],    // Array of candidate IDs
  created_at: Date
}
```

## Match Score Algorithm
```javascript
function calculateMatchScore(candidateExp, requiredExp = 3) {
  if (candidateExp >= requiredExp) {
    return Math.min(98, 85 + (candidateExp - requiredExp) * 3);
  }
  return Math.max(40, 85 - Math.abs(candidateExp - requiredExp) * 15);
}
```

## Prioritized Backlog

### P0 - Critical
- [ ] Real Whisper API integration (replace mock transcription)
- [ ] Real phone extraction from voice (replace mock phone)
- [ ] Payment integration for credits (Stripe/Razorpay)

### P1 - High Priority  
- [ ] Employer authentication
- [ ] SMS verification for candidates
- [ ] Job posting with specific requirements
- [ ] Dynamic match scoring based on job requirements

### P2 - Nice to Have
- [ ] Push notifications
- [ ] WhatsApp integration
- [ ] Employer dashboard analytics
- [ ] Bulk unlock discounts

## Next Tasks
1. Integrate real Whisper API for transcription
2. Add payment gateway for credit purchases
3. Implement employer auth flow
