# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: MongoDB (getlocal database)
- **Location**: /app/getlocal/

## What's Been Implemented

### Phase 1: Database Schema Expansion ✅
- **candidates**: `trust_score` (default 100), `address`, `will_relocate`
- **jobs**: `salary`, `perks[]`, `training_provided`, `job_expectations`, `employer_location`
- **support_tickets**: `user_type`, `phone_number`, `issue_description`, `status`, `requires_call`

### Phase 2: Regional Language Support ✅
9 languages with mock transcription:
- Universal: English (en)
- North: Hindi (hi)
- South: Telugu (te), Tamil (ta), Kannada (kn), Malayalam (ml)
- East: Bengali (bn), Odia (or), Assamese (as)

### Phase 3: Candidate Experience ✅
- **Voice/Manual Toggle**: Record voice or fill form manually
- **Location Fields**: Address/Pincode + Relocation preference (mandatory)
- **Audio Job Descriptions**: Play 🔊 button uses `window.speechSynthesis`
- **Hyperlocal Commute Tag**: "🚇 15 mins by bus" (mock)

### Phase 4: Employer Experience ✅
- **Detailed Job Form**: Salary, Perks, Training, Expectations, Location
- **Trust Score Badge**: Green (90%+), Amber (70-89%), Red (<70%)
- **Report No-Show**: Deducts 10 points from trust_score
- **WhatsApp Invite**: `wa.me/<phone>?text=<encoded_message>`

### Phase 5: Customer Care & Admin ✅
- **Chat Widget**: Floating button, support form, "Agent Call Back"
- **Admin Dashboard**: `/admin/support` with Kanban view, tel: links

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate (voice/manual) |
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
  address: string,           // NEW
  will_relocate: boolean,    // NEW
  trust_score: number,       // NEW (default 100)
  role_category, experience_years, professional_summary,
  audio_interview_url, lang_code, moltbot_processed, created_at
}
```

### jobs
```javascript
{
  _id, title, category, required_experience, location_radius, location,
  salary: { type, amount, min, max, display },  // NEW
  perks: string[],                              // NEW
  training_provided: boolean,                   // NEW
  job_expectations: string,                     // NEW
  employer_location: string,                    // NEW
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
  requires_call: boolean,  // default false
  created_at, updated_at
}
```

## QA Test Results (All Passed)
| Test | Status |
|------|--------|
| 1.1 Audio Upload Regression | ✅ PASS |
| 1.2 Candidate Schema | ✅ PASS |
| 1.3 Job Schema | ✅ PASS |
| 1.4 Ticket Schema | ✅ PASS |
| 2.1 Input Toggle State | ✅ PASS |
| 2.2 Language Metadata (ml, bn, ta) | ✅ PASS |
| 2.3 Audio Job Description | ✅ PASS |
| 3.1 Job Posting E2E | ✅ PASS |
| 3.2 Wallet/Unlock Loop | ✅ PASS |
| 3.3 WhatsApp Link | ✅ PASS |
| 3.4 Trust Score Deduction | ✅ PASS |
| 4.1 Chat to Ticket | ✅ PASS |
| 4.2 Admin Dashboard | ✅ PASS |
| 4.3 Dialer Link | ✅ PASS |

## Pages
- `/join` - Candidate onboarding (voice/manual)
- `/jobs` - Job browsing for candidates
- `/hire` - Employer dashboard
- `/post-job` - Job posting form
- `/admin/support` - Support ticket management

## Perks Options
meals, accommodation, pf_esi, transport, uniform, bonus

## Prioritized Backlog

### P0 - Critical
- [ ] Real Whisper API integration
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
