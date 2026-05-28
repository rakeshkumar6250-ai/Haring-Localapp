# Test Credentials — Kaam.ai

## Admin Dashboard (`/admin`)
- Secret key (env `ADMIN_SECRET` in `/app/getlocal/.env`): `kaam_admin_2026`
- Usage: open `/admin`, enter the key, click Login. API: `GET /nextapi/admin?key=kaam_admin_2026`

## Employer Auth
- Mock OTP for signup/verify: `123456`

## Notes
- Live WhatsApp AI flow requires `GROQ_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in `/app/getlocal/.env` (OpenAI key already set).
