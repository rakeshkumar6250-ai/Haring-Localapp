# Test Credentials — Kaam.ai

## Admin Dashboard (`/admin`)
- Secret key (env `ADMIN_SECRET` in `/app/getlocal/.env`): `kaam_admin_2026`
- Usage: open `/admin`, enter the key, click Login. API: `GET /nextapi/admin?key=kaam_admin_2026`

## Employer Test Account (for /candidates, /hire, unlock/wallet)
- Phone: `+919555000111`
- Password: `test1234`
- Company: `Test Employer Co`
- Login at `/login`. Has credits topped up via wallet API for unlock testing.
- Mock OTP for new signups/verify: `123456`

## Demo Data
- Demo candidate with a playable voice note seeded for testing the `/candidates` voice player:
  `_id: wa_demo_voice_1` (Ramesh Kumar, Plumber, audio = w3schools horse.ogg). Safe to delete.

## Notes
- Live WhatsApp AI flow requires `GROQ_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in `/app/getlocal/.env` (OpenAI key already set).
