# GetLocal V2 - Managed Marketplace PRD

## Original Problem Statement
Build a high-performance, mobile-responsive web application for a managed blue-collar hiring marketplace with "Voice-First" UX.

## Architecture
- **Frontend**: Next.js 14 with App Router
- **Database**: MongoDB
- **Styling**: Tailwind CSS with custom design system
- **Audio**: Browser MediaRecorder API (.webm format)
- **Location**: Browser Geolocation API with Haversine distance calculation

## Core Features Implemented

### Page 1: Voice Onboarding (/join)
- Massive pulse-animated microphone button
- Real MediaRecorder API integration
- Language selector (English, Hindi, Tamil, Telugu)
- Geolocation capture
- Audio upload to /api/upload-audio
- Success state with profile review

### Page 2: Recruiter Dashboard (/hire)
- Candidate cards with distance labels
- Audio player for fluency audit
- Data masking (phone: *******XX)
- Credit-based unlock system (10 credits)
- Role search filter
- Distance slider (1-20km)

### Page 3: Agent Broadcaster (/admin)
- Stats cards: Total Candidates, Open Jobs, Credits Sold
- Job broadcast list
- WhatsApp Blast trigger button
- Quick actions (Add Candidate, Post Job)

### Design System
- Primary: #0052CC (Trust Blue)
- Action: #36B37E (Success Green)
- Dark theme with high contrast
- Fixed bottom navigation

## API Endpoints
- POST /api/upload-audio - Audio file upload
- GET/POST /api/candidates - Candidate CRUD
- GET/POST /api/jobs - Job CRUD
- GET/POST /api/wallet - Credit balance
- POST /api/unlock - Unlock candidate profile

## Database Schema (MongoDB)
- candidates: name, phone, location, role_category, audio_interview_url, is_verified
- jobs: title, business_name, location, status, credits_required
- wallets: user_id, credit_balance, unlocked_candidates

## What's Been Implemented
- [x] Voice recording with MediaRecorder
- [x] Real geolocation capture
- [x] Distance-based candidate filtering
- [x] Credit system with unlock flow
- [x] Phone number masking
- [x] WhatsApp broadcast UI
- [x] Bottom navigation
- [x] Mobile-responsive design

## Next Steps (MoltBot Integration)
- [ ] Connect /upload-audio to MoltBot for transcription
- [ ] AI profile extraction from voice interviews
- [ ] Automated role categorization
- [ ] WhatsApp API integration for broadcasts

## Date
February 2026
