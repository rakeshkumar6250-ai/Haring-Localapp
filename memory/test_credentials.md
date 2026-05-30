# Test Credentials — Kaam.ai

## Admin Dashboard (`/admin`)
- Secret key (env `ADMIN_SECRET` in `/app/getlocal/.env`): `kaam_admin_2026`
- Usage: open `/admin`, enter the key, click Login. API: `GET /nextapi/admin?key=kaam_admin_2026`

## Employer Test Account (for /candidates, /hire, unlock/wallet)
- Phone: `+919555000111`
- Password: `test1234`
- Company: `Test Employer Co`
- Login at `/login` with phone + password. Has credits topped up via wallet API for unlock testing.

## Signup OTP — NOW REAL (Twilio Verify, May 2026)
- Mock OTP `123456` is REMOVED. New employer signup sends a REAL SMS OTP via Twilio Verify.
- Endpoints: `POST /nextapi/auth/otp/send` ({phone, company_name, password}) → sends OTP; `POST /nextapi/auth/otp/verify` ({phone, code}) → verifies, creates employer + wallet, returns JWT.
- To test signup end-to-end you need a real phone that can receive SMS (enter the actual 6-digit code). The existing test account above can still be used via password login without OTP.
- Env required (already set): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.

## Demo Data
- Demo candidate with a playable voice note seeded for testing the `/candidates` voice player:
  `_id: wa_demo_voice_1` (Ramesh Kumar, Plumber, audio = w3schools horse.ogg). Safe to delete.

## Zero-Credit Test Account (for 0-credit → /pricing routing test)
- Phone: `+919555000222`, Password: `test1234`, Company: `Zero Credit Co` (0 credits)

## Razorpay
- Keys in `.env` are PLACEHOLDERS (`rzp_test_PLACEHOLDER` / `PLACEHOLDER_SECRET`) → payment runs in MOCK mode.
- To enable REAL transactions: set real `RAZORPAY_KEY_ID` (rzp_test_...) and `RAZORPAY_KEY_SECRET` in `/app/getlocal/.env`, then restart Next.js. No code change needed.

## Notes
- Live WhatsApp AI flow requires `GROQ_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in `/app/getlocal/.env` (OpenAI key already set).
