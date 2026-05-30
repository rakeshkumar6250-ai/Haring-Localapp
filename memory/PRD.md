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
- **Employer Push (>50%)**: When candidate joins/updates -> find matching jobs -> log employer notification with match details
- **Candidate Push (>70%)**: When job posted -> find matching candidates -> log candidate notification
- **OutgoingLog**: All notifications saved to `outgoing_log` collection with type, recipient, message, score, matched/missing fields, status='queued'
- **Triggers**: Wired into upload-audio (manual + voice) and jobs POST routes. Non-blocking (fire-and-forget).
- **WhatsApp Messages**: Formatted with candidate name, score, job title, matched/missing fields, app link. MOCKED (logged to DB, not sent via real API).

### Phase 11: Employer 'Unlock' Experience Frontend (Feb 2026)
- **Match Score Badge**: Prominent badge on each candidate card showing "X% Match" when an active job is selected. Color-coded: green (>=85%), amber (70-84%), red (<70%).
- **"View Why?" Tooltip**: Click opens a dropdown showing matched[] (green checkmarks) and missing[] (red X marks) breakdown from the scoring engine.
- **Blurred Contact Info**: Phone numbers have CSS `blur-[5px]` for non-unlocked candidates. No masked text, just pure blur.
- **Gold Unlock Button**: Replaced blue "Unlock (1 Credit)" with gold gradient "₹50 to Unlock" button (`from-[#D4A017] to-[#F5C518]`).
- **Credit Dashboard Header**: Gold-styled credits badge in header showing current balance. "Buy More" label appears when credits < 3.
- **Top Up Credits Modal**: 2 packs - 10 Credits for ₹500, 25 Credits for ₹1000 (Best Value). Clean modal with backdrop blur.
- **Mock Razorpay Flow**: create-order returns mock=true -> verify with mock=true adds credits directly. Full checkout UI ready for real keys.
- **Client-side Match Score**: `/src/lib/matchScore.js` mirrors server-side `matching.js` logic for frontend rendering.

### Phase 12: Employer Authentication & Route Protection (Feb 2026)
- **Signup Flow**: Phone + company name + password (min 6 chars) → OTP step → verify → JWT issued. Account created in DB with wallet (0 credits).
- **Mock OTP**: Always accepts `123456`. Hint shown on OTP screen. Ready to swap with real SMS provider.
- **Login Flow**: Phone + password → JWT returned. Token stored in localStorage as `auth_token`.
- **JWT Session**: `jsonwebtoken` with 7-day expiry. Payload: `{employer_id, phone, company_name}`. Secret from `JWT_SECRET` env var.
- **Protected Routes (Frontend)**: `/hire` and `/post-job` redirect to `/login` via `AuthProvider` context. Guest routes (`/login`, `/signup`) redirect to `/hire` if already logged in.
- **Protected Routes (Backend)**: `/nextapi/wallet`, `/nextapi/unlock`, `/nextapi/payments/create-order`, `/nextapi/payments/verify` all require `Authorization: Bearer <token>`. Return 401 without valid JWT.
- **Credit Binding**: No `default-employer` fallback. `employer_id` extracted from JWT on every protected API call. Wallet (credits + unlocked_candidates) strictly tied to authenticated user record.
- **Logout**: Clears `auth_token` + `employer_id` from localStorage, redirects to `/login`.
- **Key Files**: `/src/lib/auth.js` (JWT utils), `/src/components/AuthProvider.js` (context), `/src/app/login/page.js`, `/src/app/signup/page.js`, all 4 auth API routes under `/nextapi/auth/`.

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
- `/src/lib/matching.js` - Server-side matching engine, scoring, triggers, message formatting
- `/src/lib/matchScore.js` - Client-side match score calculator (mirrors matching.js, no DB deps)
- `/src/lib/mongodb.js` - All collection helpers including getOutgoingLog()
- `/src/lib/utils.js` - Distance, phone masking, commute utilities
- `/src/app/hire/page.js` - Employer hire page with unlock, match score, credits UI

## Environment Variables
```
MONGODB_URI, DB_NAME, OPENAI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, JWT_SECRET
```

### Phase 15: Talent Filters + Razorpay Activation (May 2026)
- **/candidates filters**: Role/Category dropdown (derived from loaded candidates) + "Voice Only" toggle (filters to `audio_interview_url`). Client-side `useMemo` filtering — feed + subtitle ("X of Y candidates") update dynamically. Empty state messaging updated.
- **/pricing rebuilt** as a credit-purchase storefront (dark theme): 3 packs (10/₹500, 25/₹1000 "Best Value", 50/₹1750 "Most Popular"), gold balance badge. Real **Razorpay Checkout.js** flow: `create-order` → load checkout.js → open Razorpay → `verify` (HMAC). Auto-falls back to mock (credits added directly) while keys are placeholders. Handles `payment.failed` + modal dismiss.
- **Backend** `create-order`/`verify` already implement real Razorpay (SDK order + crypto HMAC SHA256 signature verify). They activate automatically once real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` replace the `rzp_test_PLACEHOLDER`/`PLACEHOLDER_SECRET` values in `.env`.
- **0-credit UX**: unlocking with insufficient credits → toast → auto-route to `/pricing` checkout. Verified end-to-end (402 → redirect).
- **Tested**: filters dynamic (57→22→2); mock purchase adds credits (13→23) with toast; 0-credit employer routed to /pricing; 401 without auth. ⚠️ REAL transactions pending real Razorpay test keys from user.

### Phase 16: WhatsApp Brain — Sarvam Experiment → Rolled Back to OpenAI (May 2026) — VALIDATED LIVE
- Sarvam AI (`sarvam-30b`) failed to maintain state. **Rolled back to OpenAI**: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`, model **`gpt-4o-mini`**, `response_format: { type: 'json_object' }`, standard `JSON.parse` (Sarvam regex/raw-text failsafe removed).
- **Prompt** retained Tinglish/street-Telugu persona + flat JSON schema; instructions rewritten into a deterministic decision procedure that emphasizes carrying forward "Current State".
- **DB UNIFICATION FIX (critical)**: `lib/mongoose.js` was connecting without a db name → Mongoose defaulted to the `test` database while the native driver used `getlocal` (ChatState was landing in `test`). Fixed: `mongoose.connect(MONGODB_URI, { dbName: process.env.DB_NAME })`. Now ChatState + candidates + jobs all live in `getlocal`.
- **Completion guard (server-side)**: gpt-4o-mini was unreliable at flipping `isComplete`. Added a deterministic guard in the webhook: worker complete when name+category+location+salary present; employer complete when category+location+salary+documentUrl present. `chatState.isComplete = parsed.isComplete || workerComplete || employerComplete`. DB-write + matching logic unchanged.
- **VALIDATED END-TO-END (live OpenAI key)**: multi-turn Tinglish worker convo → candidate created in `getlocal.candidates`; employer convo + image upload → job created + 3 cook matches returned with contacts; ChatState deleted on completion. Validation test data cleaned up afterward.
- **Note**: the `OPENAI_API_KEY` in `.env` was replaced by the user with a valid key (the prior one 401'd).

### Phase 17: Real SMS OTP via Twilio Verify (May 2026)
- Replaced the mock `123456` signup OTP with **production Twilio Verify** (via `integration_playbook_expert_v2` playbook).
- **New endpoints** (under `/nextapi/`, NOT `/api/` — the platform ingress routes `/api/*` to the FastAPI backend on :8001, so Next.js API routes must use `/nextapi/`):
  - `POST /nextapi/auth/otp/send` — `client.verify.v2.services(SID).verifications.create({to, channel:'sms'})`. For signup it also stashes the pending registration (company + bcrypt-hashed password) in `_otpStore`. E.164 (+91) formatting.
  - `POST /nextapi/auth/otp/verify` — `verificationChecks.create({to, code})`; on `status==='approved'` it creates the employer + wallet from the pending registration (or logs in an existing employer) and issues the existing JWT.
- **Deleted** the obsolete mock routes `/nextapi/auth/signup` and `/nextapi/auth/verify-otp`.
- **Frontend** (`signup/page.js`): rewired to the new endpoints (sends `code` not `otp`), removed the "Mock Mode: Use OTP 123456" hint; styling/layout untouched. Backend errors already surface on screen.
- **Verified**: lint clean; signup page renders (no runtime errors); `send` returns Twilio `pending` success; `verify` reaches Twilio (creds + Verify Service `VA8c...` authenticated — bad creds would 401, not 404); 400 validation paths work. Full `approved` path needs a real phone/device.
- **Env (already set)**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.

### Phase 18: Job Application Flow ("Apply Now") (May 2026)
- **Model** `src/models/Application.js` (Mongoose, `getlocal` db): `{ jobId:String, userId:String, status:'pending', createdAt }` + unique compound index `(jobId, userId)` to block duplicates at the DB level. (Strings because jobs use string `_id`s and accounts use uuid `_id`s.)
- **API** `POST /nextapi/applications` (under `/nextapi/`, not `/api/` — ingress routing): 401 if no JWT, 400 if no `jobId`, 409 if already applied (also catches index dup-key race), 201 on success. `GET /nextapi/applications` returns the caller's `appliedJobIds` for UI hydration; returns empty list when unauthenticated.
- **Applicant identity**: the app's only auth is the employer JWT, so the authenticated JWT account (`getAuthFromRequest` / `useAuth().user`) is the applicant (`userId = employer_id`).
- **UI** `jobs/page.js`: wired the existing Apply button (Tailwind untouched). Logged-out click → redirect to `/login`; per-card loading ("Applying…"); success → disabled green "✓ Applied"; 409 → toast "You have already applied for this job"; applied state hydrated on load via GET.
- **Verified**: lint clean; curl 401/201/409/400 + GET all correct; doc written to `getlocal.applications`; screenshots confirm logged-out→/login redirect, applied-on-load state, and apply→toast→"Applied" flip. Test data cleaned up.

### Phase 19: Employer Applicant Funnel — /dashboard (May 2026)
- **API** `GET /nextapi/employer/jobs` (auth-only, 401 otherwise): returns the logged-in employer's jobs (web `employer_id===user.id` OR WhatsApp `employer_phone===user.phone`), each enriched with `applicant_count` + `applicants[]`. Each applicant is resolved: `Application.userId` → employer account → phone → matched `candidates` doc → Name/Category/Location (+ phone), with graceful fallback to the account's company name.
- **UI** `src/app/dashboard/page.js` (new protected route, dark theme): job list with an "Applicants (n)" badge per posting; clicking a job expands the applicant list showing avatar, name, status tag (Pending/Reviewed/Contacted color-coded), Category·Location, and a green "Contact" (tel:) button. Header shows total listings + total applicants and a "+ Post Job" link.
- **Wiring**: `/dashboard` added to `PROTECTED_ROUTES`; `/hire` header gets a "View Applicants →" link.
- **Verified**: lint clean; curl 401 + authed response returns job with resolved applicant (name/category/location/phone from candidates join); screenshot confirms badge, expand, Pending status tag, Contact button. Test data cleaned up.

## Prioritized Backlog
- [x] Real Whisper integration
- [x] Employer & Candidate KYC
- [x] Razorpay payment gateway
- [x] Automated matching engine
- [x] Employer Unlock Experience frontend
- [x] Employer Authentication (JWT + phone/password)
- [x] SMS OTP Verification (Mock: 123456)
- [x] Protected Routes (/hire, /post-job, /candidates, payment/wallet/unlock endpoints)
- [x] Credit Binding (wallet tied to authenticated employer)
- [x] WhatsApp voice-note transcription (Whisper) wired into webhook (May 2026)
- [x] DB unification: WhatsApp writes direct to native candidates/jobs; admin unified (May 2026)
- [x] Employer Talent Storefront `/candidates` with free voice intro + paywall unlock (May 2026)
- [ ] Activate Razorpay with real keys
- [ ] Real WhatsApp delivery (Interakt/Twilio/Cloud API)
- [ ] Real SMS OTP (replace mock 123456 with Twilio/MSG91)
- [ ] Real commute calculation (Maps API)
- [ ] Video interviews, AI job matching, Analytics dashboard

### Phase 14: Employer Talent Storefront `/candidates` (May 2026)
- **New page `/candidates`** (protected employer route, added to `PROTECTED_ROUTES` + BottomNav "Talent" tab). Primary talent storefront.
- **`VoiceIntroPlayer` component** (`/src/components/VoiceIntroPlayer.js`): custom dark-theme audio player (play/pause + progress + duration). FREE & ungated for every employer — the core conversion hook. Renders only when `audio_interview_url` exists (graceful fallback otherwise).
- **Paywall**: phone shown as `+91 ••••• •••••` placeholder until unlocked. "Unlock Contact" gold button → `POST /nextapi/unlock` (Bearer JWT) deducts 1 credit, reveals real number, flips to "Unlocked". Handles 402 insufficient-credits with toast. Wallet balance shown in gold header badge linking to `/pricing`.
- **Match score (optional)**: "Match against my job" selector populated from the employer's own posted jobs; renders a color-coded `%` badge per candidate via `matchScore.js` `calculateDetailedMatchScore`. Hidden when employer has no jobs.
- **Card data**: avatar initials, name, role_category, location, salary, Trust score, Verified badge.
- **Tested**: full flow verified via screenshots — player loads/plays, unlock deducts credit (4→3), phone reveals, masked placeholders, idempotent unlock, 401 without auth. No runtime errors.

### Phase 13: WhatsApp Voice-Note Transcription + DB Unification (May 2026)
- **`audioProcessor.js`**: Downloads Twilio media (basic auth), transcribes with OpenAI Whisper (`whisper-1`, transcriptions endpoint preserves original language/script e.g. Telugu). Vercel Blob archival is best-effort/non-fatal (only if `BLOB_READ_WRITE_TOKEN` set). Temp file cleanup in `finally`.
- **Webhook fully rewritten (`/nextapi/webhooks/whatsapp`)**:
  - Media routing via `MediaContentType0`: image/PDF → `documentUrl` (employer verification); audio → Whisper transcription fed into Groq as user input, `audio_interview_url` captured.
  - **DB UNIFICATION**: Mongoose `Worker` & `Job` models **deleted/deprecated**. Webhook now writes directly to native MongoDB: workers → `candidates` collection via `getCandidates().updateOne(upsert)` with `{phone, name, role_category, address, salary_expected, source:'whatsapp', ai_source:'whatsapp_groq_whisper', audio_interview_url, trust_score:70, verification_status:'pending'}`; employers → `getJobs().insertOne()` then regex search of `candidates` (limit 3), returning matches (with clickable `audio_interview_url`) in the reply.
  - `ChatState` extended with `name` + `audioInterviewUrl` (voice note persists across turns). Cleared after completion.
- **Admin route (`/nextapi/admin`) refactored**: Mongoose `Worker`/`Job` models **deleted**. Now returns `{ workers, jobs, activeChats }` — `workers`/`jobs` from native collections via `getCandidates()`/`getJobs()` (sorted by `created_at`), `activeChats` = in-progress `ChatState.find({ isComplete: false })`. Admin dashboard updated to native field names with a `safeText()` helper (handles web docs storing `location`/`salary` as objects) and a clickable "🎤 Listen" link rendering `audio_interview_url`.
- **`ADMIN_SECRET`** added to `/app/getlocal/.env` (value: `kaam_admin_2026`).
- **Required env to run live**: `GROQ_API_KEY` (NOT set — only blocker for live test), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `OPENAI_API_KEY` (already set). Add to `/app/getlocal/.env`.
- **Tested**: curl simulation of text/audio/document Twilio POSTs all return valid TwiML 200; admin returns 401 without key and `{workers,jobs,activeChats}` with key; dashboard renders unified talent pool + clickable voice-note links (verified via screenshot, no React render errors).
