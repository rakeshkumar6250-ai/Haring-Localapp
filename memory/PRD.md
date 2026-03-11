# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes (`/app/getlocal/src/app/nextapi/`)
- **Database**: MongoDB (getlocal database)
- **AI**: OpenAI Whisper (whisper-1) + GPT-4o-mini
- **Payments**: Razorpay (currently in MOCK mode - placeholder test keys)
- **Location**: /app/getlocal/
- **Platform**: Emergent (proxy at `/app/frontend/` -> Next.js on port 3001)

## Implemented Phases

### Phase 1-5: Core Marketplace (from original repo)
- DB schemas: candidates, jobs, support_tickets, employers
- 9 regional languages with real Whisper transcription
- Voice/Manual onboarding, Audio job descriptions, Hyperlocal commute
- Trust Score, Report No-Show, WhatsApp Invite
- Chat Widget, Admin Support Dashboard

### Phase 6: Real AI Transcription
- Whisper + GPT-4o-mini with mock fallback (`ai_source` tracking)

### Phase 7: Employer KYC & Job Posting V2
- Employer KYC gate, 3-step job form, Verified Business badge, Admin KYC dashboard
- Expanded job schema: job_type, work_location_type, pay_type, requires_joining_fee, etc.

### Phase 8: Candidate KYC & Filtering
- Candidate education_level, english_level, experience_type, ID upload
- /hire filter bar with Education/English/Experience/Verified toggles
- Unified /admin/kyc with Candidates/Employers tabs

### Phase 9: Razorpay Payment Gateway (Mar 11, 2026)
- **Credits system**: Employer wallet with credits (default: 0)
- **Credit packs**: 10 credits / ₹500, 25 credits / ₹1,000, 50 credits / ₹1,750
- **Unlock cost**: 1 credit per candidate profile unlock
- **Buy Credits modal**: Opens when credits=0 and employer tries to unlock, or via header button
- **Mock mode**: When Razorpay keys are placeholders, credits are added directly without real checkout
- **Real mode ready**: Full Razorpay order creation → checkout → signature verification → credits added
- **Status**: MOCK MODE (user will provide real Razorpay test keys)

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate + Whisper |
| /nextapi/process-audio | POST | Re-process candidate audio |
| /nextapi/candidates | GET/PATCH | List (with filters) / KYC approve/reject |
| /nextapi/candidates/upload-id | POST | Candidate ID document upload |
| /nextapi/jobs | GET/POST | Job CRUD |
| /nextapi/wallet | GET/POST | Employer-specific credit wallet |
| /nextapi/unlock | POST | Unlock candidate (1 credit, 402 if insufficient) |
| /nextapi/payments/create-order | POST | Create Razorpay order (mock/real) |
| /nextapi/payments/verify | POST | Verify payment + add credits |
| /nextapi/report-noshow | POST | Deduct trust score |
| /nextapi/support-tickets | GET/POST/PATCH | Support tickets |
| /nextapi/employers | GET/POST/PATCH | Employer CRUD + KYC |
| /nextapi/employers/upload-kyc | POST | Employer KYC document upload |

## Environment Variables
```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=getlocal
OPENAI_API_KEY=sk-proj-...
RAZORPAY_KEY_ID=rzp_test_PLACEHOLDER     # Replace with real test key
RAZORPAY_KEY_SECRET=PLACEHOLDER_SECRET    # Replace with real test secret
```

## Pages
- `/join` - Candidate onboarding (voice/manual) with education/english/experience + ID upload
- `/jobs` - Job browsing with verified badges
- `/hire` - Employer dashboard with filters, credit-based unlock, Buy Credits modal
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
- [x] Razorpay payment gateway (MOCK mode ready)
- [ ] Activate Razorpay with real test keys (waiting for user)
- [ ] SMS OTP verification

### P1 - High Priority
- [ ] Employer authentication (proper login)
- [ ] Real commute calculation (Maps API)
- [ ] Push notifications

### P2 - Nice to Have
- [ ] Video interviews
- [ ] AI-powered job matching
- [ ] Analytics dashboard
