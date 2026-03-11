# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes (`/app/getlocal/src/app/nextapi/`)
- **Database**: MongoDB (getlocal database)
- **AI**: OpenAI Whisper (whisper-1) + GPT-4o-mini
- **Location**: /app/getlocal/
- **Platform**: Emergent (proxy at `/app/frontend/` -> Next.js on port 3001)

## What's Been Implemented

### Phase 1: Database Schema Expansion
- **candidates**: `trust_score`, `address`, `will_relocate`, `education_level`, `english_level`, `experience_type`, `verification_status`, `id_document_url`
- **jobs**: expanded with `job_type`, `work_location_type`, `pay_type`, `requires_joining_fee`, `minimum_education`, `english_level`, `experience_required`, `is_walk_in`, `contact_preference`, `job_description`, `employer_id`, `company_name`
- **employers**: `company_name`, `phone`, `verification_status`, `verification_document_url`
- **support_tickets**: `user_type`, `phone_number`, `issue_description`, `status`, `requires_call`

### Phase 2: Regional Language Support
9 languages with real Whisper transcription: en, hi, te, ta, kn, ml, bn, or, as

### Phase 3: Candidate Experience
- Voice/Manual Toggle, Location Fields, Audio Job Descriptions, Hyperlocal Commute Tag (mock)

### Phase 4: Employer Experience
- Detailed Job Form, Trust Score Badge, Report No-Show, WhatsApp Invite

### Phase 5: Customer Care & Admin
- Chat Widget, Admin Support Dashboard (`/admin/support`)

### Phase 6: Real AI Transcription (Mar 11, 2026)
- Whisper + GPT-4o-mini with mock fallback

### Phase 7: Employer KYC & Job Posting V2 (Mar 11, 2026)
- Employer KYC gate, 3-step job form, Verified Business badge, Admin KYC dashboard

### Phase 8: Candidate KYC & Employer Filtering (Mar 11, 2026)
- **Candidate schema**: `education_level` (10th Or Below / 12th Pass / Diploma / ITI / Graduate / Post Graduate), `english_level` (No English / Basic English / Good English), `experience_type` (Fresher / Experienced), `id_document_url`, `verification_status`
- **/join page**: Education/English/Experience dropdowns in both manual & voice modes. "Boost Your Profile" ID upload section (Aadhaar/Voter ID/PAN)
- **/hire page**: Filter bar with Education, English, Experience dropdowns + Verified Only toggle. "Verified Identity" badge on candidate cards. Education/English/Experience tags on cards.
- **/admin/kyc**: Unified dashboard with Candidates/Employers tab toggle. Approve/Reject for both types. View ID document links.

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate (voice/manual) + Whisper |
| /nextapi/process-audio | POST | Re-process candidate audio |
| /nextapi/candidates | GET | List candidates (with filter query params) |
| /nextapi/candidates | PATCH | Admin approve/reject candidate KYC |
| /nextapi/candidates/upload-id | POST | Upload candidate ID document |
| /nextapi/jobs | GET/POST | Job CRUD (enriched with employer verification) |
| /nextapi/wallet | GET/POST | Credits |
| /nextapi/unlock | POST | Unlock profile (10 credits) |
| /nextapi/report-noshow | POST | Deduct trust score |
| /nextapi/support-tickets | GET/POST/PATCH | Support tickets |
| /nextapi/employers | GET/POST/PATCH | Employer CRUD + KYC |
| /nextapi/employers/upload-kyc | POST | KYC document upload |

## Database Schemas

### candidates
```javascript
{
  _id, name, phone, location: {lat, lng},
  address, will_relocate, trust_score,
  education_level: '10th Or Below' | '12th Pass' | 'Diploma' | 'ITI' | 'Graduate' | 'Post Graduate',
  english_level: 'No English' | 'Basic English' | 'Good English',
  experience_type: 'Fresher' | 'Experienced',
  verification_status: 'Unverified' | 'Pending' | 'Verified',
  id_document_url: string | null,
  role_category, experience_years, professional_summary,
  audio_interview_url, lang_code, moltbot_processed,
  transcription, ai_source, processed_at, created_at
}
```

### employers
```javascript
{
  _id, company_name, phone,
  verification_status: 'Unverified' | 'Pending' | 'Verified',
  verification_document_url: string | null,
  verified_at, created_at, updated_at
}
```

### jobs
```javascript
{
  _id, title, category, company_name, employer_id,
  job_type, work_location_type, pay_type,
  salary, perks[], requires_joining_fee,
  minimum_education, english_level, experience_required,
  is_walk_in, contact_preference, job_description,
  training_provided, employer_location,
  location, is_active, status, created_at, updated_at
}
```

## Pages
- `/join` - Candidate onboarding (voice/manual) with education/english/experience + ID upload
- `/jobs` - Job browsing with verified badges
- `/hire` - Employer dashboard with filter bar + verified identity badges
- `/post-job` - 3-step job posting with KYC gate
- `/admin/support` - Support ticket management
- `/admin/kyc` - Unified KYC verification (Candidates + Employers)

## Prioritized Backlog

### P0 - Critical
- [x] Real Whisper API integration
- [x] Employer KYC flow
- [x] Candidate KYC flow
- [x] Expanded job posting
- [x] Employer filtering by candidate attributes
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
