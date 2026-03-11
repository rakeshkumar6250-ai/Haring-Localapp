# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes (at `/app/getlocal/src/app/nextapi/`)
- **Database**: MongoDB (getlocal database)
- **AI**: OpenAI Whisper (whisper-1) + GPT-4o-mini
- **Location**: /app/getlocal/
- **Platform**: Emergent (proxy at `/app/frontend/` -> Next.js on port 3001)

## What's Been Implemented

### Phase 1: Database Schema Expansion
- **candidates**: `trust_score` (default 100), `address`, `will_relocate`
- **jobs**: `salary`, `perks[]`, `training_provided`, `job_expectations`, `employer_location`, `job_type`, `work_location_type`, `pay_type`, `requires_joining_fee`, `minimum_education`, `english_level`, `experience_required`, `is_walk_in`, `contact_preference`, `job_description`, `employer_id`, `company_name`
- **support_tickets**: `user_type`, `phone_number`, `issue_description`, `status`, `requires_call`
- **employers**: `company_name`, `phone`, `verification_status`, `verification_document_url`, `verified_at`

### Phase 2: Regional Language Support
9 languages with real Whisper transcription:
- Universal: English (en), North: Hindi (hi)
- South: Telugu (te), Tamil (ta), Kannada (kn), Malayalam (ml)
- East: Bengali (bn), Odia (or), Assamese (as)

### Phase 3: Candidate Experience
- Voice/Manual Toggle, Location Fields, Audio Job Descriptions, Hyperlocal Commute Tag (mock)

### Phase 4: Employer Experience
- Detailed Job Form, Trust Score Badge, Report No-Show, WhatsApp Invite

### Phase 5: Customer Care & Admin
- Chat Widget, Admin Support Dashboard (`/admin/support`)

### Phase 6: Real AI Transcription (Mar 11, 2026)
- Whisper + GPT-4o-mini integration with mock fallback

### Phase 7: Employer KYC & Job Posting V2 (Mar 11, 2026)
- **Employer KYC Upload**: Upload GST/Trade License (PDF/JPG/PNG), sets status to Pending
- **Admin KYC Dashboard** (`/admin/kyc`): Approve/Reject queue with document viewer
- **3-Step Job Form**: Basic Details & Comp -> Candidate Requirements -> Interview Info
- **Trust Badges**: "Verified Business" badge on job cards for verified employers
- **Expanded Job Schema**: job_type, work_location_type, pay_type, joining fee flag, education, english level, experience, walk-in, contact preference

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate (voice/manual) + Whisper |
| /nextapi/process-audio | POST | Re-process candidate audio |
| /nextapi/candidates | GET | List candidates |
| /nextapi/jobs | GET/POST/PATCH/DELETE | Job CRUD (enriched with employer verification) |
| /nextapi/wallet | GET/POST | Credits |
| /nextapi/unlock | POST | Unlock profile (10 credits) |
| /nextapi/report-noshow | POST | Deduct trust score |
| /nextapi/support-tickets | GET/POST/PATCH | Support tickets |
| /nextapi/employers | GET/POST/PATCH | Employer CRUD + KYC approve/reject |
| /nextapi/employers/upload-kyc | POST | KYC document upload |

## Database Schemas

### employers
```javascript
{
  _id, company_name, phone,
  verification_status: 'Unverified' | 'Pending' | 'Verified',
  verification_document_url: string | null,
  verified_at: Date | null,
  created_at, updated_at
}
```

### jobs (expanded)
```javascript
{
  _id, title, category, company_name, employer_id,
  job_type: 'Full Time' | 'Part Time' | 'Both',
  work_location_type: 'Office' | 'Home' | 'Field',
  pay_type: 'Fixed' | 'Fixed+Incentive' | 'Incentive Only',
  salary: { type, amount, min, max, display },
  perks: string[],
  requires_joining_fee: boolean,
  minimum_education: string,
  english_level: string,
  experience_required: string,
  is_walk_in: boolean,
  contact_preference: string,
  job_description: string,
  training_provided: boolean,
  employer_location: string,
  location: { lat, lng },
  is_active, status, created_at, updated_at
}
```

### candidates
```javascript
{
  _id, name, phone, location: {lat, lng},
  address, will_relocate, trust_score,
  role_category, experience_years, professional_summary,
  audio_interview_url, lang_code, moltbot_processed,
  transcription, ai_source, processed_at, created_at
}
```

## Pages
- `/join` - Candidate onboarding (voice/manual)
- `/jobs` - Job browsing with verified badges
- `/hire` - Employer dashboard
- `/post-job` - 3-step job posting with KYC gate
- `/admin/support` - Support ticket management
- `/admin/kyc` - Employer KYC verification queue

## Environment Variables
- `MONGODB_URI` - MongoDB connection
- `DB_NAME` - Database name (getlocal)
- `OPENAI_API_KEY` - Whisper + GPT-4o-mini

## Prioritized Backlog

### P0 - Critical
- [x] Real Whisper API integration (DONE)
- [x] Employer KYC flow (DONE)
- [x] Expanded job posting (DONE)
- [ ] Payment gateway (Stripe/Razorpay)
- [ ] SMS OTP verification

### P1 - High Priority
- [ ] Employer authentication (proper login)
- [ ] Real commute calculation (Maps API)
- [ ] Push notifications

### P2 - Nice to Have
- [ ] Video interviews
- [ ] AI-powered job matching
- [ ] Analytics dashboard
