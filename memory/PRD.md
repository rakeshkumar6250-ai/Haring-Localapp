# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes (at `/app/getlocal/src/app/nextapi/`)
- **Database**: MongoDB (getlocal database)
- **AI**: OpenAI Whisper (whisper-1) + GPT-4o-mini
- **Location**: /app/getlocal/
- **Platform**: Emergent (proxy at `/app/frontend/` → Next.js on port 3001)

## What's Been Implemented

### Phase 1: Database Schema Expansion
- **candidates**: `trust_score` (default 100), `address`, `will_relocate`
- **jobs**: `salary`, `perks[]`, `training_provided`, `job_expectations`, `employer_location`
- **support_tickets**: `user_type`, `phone_number`, `issue_description`, `status`, `requires_call`

### Phase 2: Regional Language Support
9 languages with real Whisper transcription:
- Universal: English (en)
- North: Hindi (hi)
- South: Telugu (te), Tamil (ta), Kannada (kn), Malayalam (ml)
- East: Bengali (bn), Odia (or), Assamese (as)

### Phase 3: Candidate Experience
- **Voice/Manual Toggle**: Record voice or fill form manually
- **Location Fields**: Address/Pincode + Relocation preference (mandatory)
- **Audio Job Descriptions**: Play button uses `window.speechSynthesis`
- **Hyperlocal Commute Tag**: "15 mins by bus" (mock)

### Phase 4: Employer Experience
- **Detailed Job Form**: Salary, Perks, Training, Expectations, Location
- **Trust Score Badge**: Green (90%+), Amber (70-89%), Red (<70%)
- **Report No-Show**: Deducts 10 points from trust_score
- **WhatsApp Invite**: `wa.me/<phone>?text=<encoded_message>`

### Phase 5: Customer Care & Admin
- **Chat Widget**: Floating button, support form, "Agent Call Back"
- **Admin Dashboard**: `/admin/support` with Kanban view, tel: links

### Phase 6: Real AI Transcription (Mar 11, 2026)
- **Whisper Integration**: Real speech-to-text via OpenAI whisper-1 model
  - Supports all 9 regional language codes as lang hints
  - Audio uploaded as .webm, sent to Whisper API via Node.js SDK
- **GPT-4o-mini Extraction**: Structured JSON extraction from transcript
  - Returns: `name`, `experience_years`, `professional_summary`
  - Always responds in English regardless of source language
- **Fallback**: Mock data used when API fails/times out/key invalid
  - `ai_source` field tracks: `"openai"` (real) vs `"mock_fallback"`
- **Files modified**: 
  - `/src/app/nextapi/upload-audio/route.js` - Background Whisper+GPT processing
  - `/src/app/nextapi/process-audio/route.js` - On-demand re-processing endpoint

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate (voice/manual) + trigger Whisper |
| /nextapi/process-audio | POST | Re-process existing candidate audio |
| /nextapi/candidates | GET | List candidates |
| /nextapi/jobs | GET/POST/PATCH/DELETE | Job CRUD |
| /nextapi/wallet | GET/POST | Credits |
| /nextapi/unlock | POST | Unlock profile (10 credits) |
| /nextapi/report-noshow | POST | Deduct trust score |
| /nextapi/support-tickets | GET/POST/PATCH | Support tickets |

## Database Schemas

### candidates
```javascript
{
  _id, name, phone, location: {lat, lng},
  address: string,
  will_relocate: boolean,
  trust_score: number,       // default 100
  role_category, experience_years, professional_summary,
  audio_interview_url, lang_code, moltbot_processed,
  transcription: string,     // Raw Whisper output
  ai_source: string,         // "openai" | "mock_fallback"
  processed_at: Date,
  created_at
}
```

### jobs
```javascript
{
  _id, title, category, required_experience, location_radius, location,
  salary: { type, amount, min, max, display },
  perks: string[],
  training_provided: boolean,
  job_expectations: string,
  employer_location: string,
  is_active, status, created_at
}
```

### support_tickets
```javascript
{
  _id,
  user_type: "candidate" | "employer",
  phone_number: string,
  issue_description: string,
  status: "Open" | "Resolved",
  requires_call: boolean,
  created_at, updated_at
}
```

## Pages
- `/join` - Candidate onboarding (voice/manual)
- `/jobs` - Job browsing for candidates
- `/hire` - Employer dashboard
- `/post-job` - Job posting form
- `/admin/support` - Support ticket management

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Database name (getlocal)
- `OPENAI_API_KEY` - OpenAI API key for Whisper + GPT-4o-mini

## Architecture Notes
- Next.js app at `/app/getlocal/` runs on port 3001
- Proxy at `/app/frontend/proxy.js` forwards port 3000 -> 3001 for Emergent platform
- OpenAI SDK v6 (`openai@6.27.0`) used for both Whisper and Chat APIs

## Prioritized Backlog

### P0 - Critical
- [x] Real Whisper API integration (DONE)
- [ ] Payment gateway (Stripe/Razorpay)
- [ ] SMS OTP verification

### P1 - High Priority
- [ ] Employer authentication
- [ ] Real commute calculation (Google Maps API)
- [ ] Push notifications

### P2 - Nice to Have
- [ ] Video interviews
- [ ] AI-powered job matching
- [ ] Analytics dashboard
