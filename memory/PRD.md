# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first two-sided marketplace for blue-collar hiring in India, supporting 9 regional languages.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes (`/app/getlocal/src/app/nextapi/`)
- **Database**: MongoDB (getlocal database)
- **AI**: OpenAI Whisper (whisper-1) + GPT-4o-mini
- **Payments**: Razorpay (MOCK mode - placeholder test keys)
- **Matching**: Custom weighted scoring engine
- **Location**: /app/getlocal/
- **Platform**: Emergent (proxy at `/app/frontend/` -> Next.js on port 3001)

## Implemented Phases

### Phase 1-5: Core Marketplace
DB schemas, 9 regional languages, Voice/Manual onboarding, Audio job descriptions, Trust Score, WhatsApp Invite, Chat Widget, Admin Support Dashboard

### Phase 6: Real AI Transcription
Whisper + GPT-4o-mini with mock fallback

### Phase 7: Employer KYC & Job Posting V2
Employer KYC gate, 3-step job form, Verified Business badge, Admin KYC dashboard, expanded job schema

### Phase 8: Candidate KYC & Filtering
Candidate education/english/experience fields, ID upload, /hire filter bar, Unified /admin/kyc

### Phase 9: Razorpay Payment Gateway
Credits system (default 0), 3 packs (10/₹500, 25/₹1000, 50/₹1750), 1 credit per unlock, Buy Credits modal

### Phase 10: Automated WhatsApp Matching Engine (Mar 11, 2026)
- **calculateMatchScore(job, candidate)**: Weighted scoring - Education 25%, English 20%, Experience 30%, Category 25%. Hierarchical comparison (candidate level >= job requirement). Partial category credit via keyword matching in summary.
- **Employer Push (>50%)**: When candidate joins/updates → find matching jobs → log employer notification with match details
- **Candidate Push (>70%)**: When job posted → find matching candidates → log candidate notification
- **OutgoingLog**: All notifications saved to `outgoing_log` collection with type, recipient, message, score, matched/missing fields, status='queued'
- **Triggers**: Wired into upload-audio (manual + voice) and jobs POST routes. Non-blocking (fire-and-forget).
- **WhatsApp Messages**: Formatted with candidate name, score, job title, matched/missing fields, app link. MOCKED (logged to DB, not sent via real API).

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/upload-audio | POST | Create candidate + Whisper + match trigger |
| /nextapi/process-audio | POST | Re-process audio |
| /nextapi/candidates | GET/PATCH | List (with filters) / KYC |
| /nextapi/candidates/upload-id | POST | Candidate ID upload |
| /nextapi/jobs | GET/POST | Job CRUD + candidate match trigger |
| /nextapi/wallet | GET/POST | Employer credit wallet |
| /nextapi/unlock | POST | Unlock candidate (1 credit) |
| /nextapi/payments/create-order | POST | Razorpay order |
| /nextapi/payments/verify | POST | Payment verification + credits |
| /nextapi/notifications | GET | Outgoing notification log (filterable) |
| /nextapi/employers | GET/POST/PATCH | Employer CRUD + KYC |
| /nextapi/employers/upload-kyc | POST | Employer KYC upload |
| /nextapi/report-noshow | POST | Trust score deduction |
| /nextapi/support-tickets | GET/POST/PATCH | Support tickets |

## Key Files
- `/src/lib/matching.js` - Matching engine, scoring, triggers, message formatting
- `/src/lib/mongodb.js` - All collection helpers including getOutgoingLog()
- `/src/lib/utils.js` - Distance, phone masking, commute utilities

## Environment Variables
```
MONGODB_URI, DB_NAME, OPENAI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
```

## Prioritized Backlog
- [x] Real Whisper integration
- [x] Employer & Candidate KYC
- [x] Razorpay payment gateway
- [x] Automated matching engine
- [ ] Activate Razorpay with real keys
- [ ] Real WhatsApp delivery (Interakt/Twilio/Cloud API)
- [ ] SMS OTP verification
- [ ] Employer authentication
- [ ] Real commute calculation (Maps API)
- [ ] Video interviews, AI job matching, Analytics dashboard
