# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first blue-collar hiring platform that enables workers to create audio-based profiles and employers to find local candidates.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: MongoDB (getlocal database)
- **Location**: /app/getlocal/

## Core User Flows

### Job Seeker Flow (/join)
1. Record voice interview in preferred language (en/hi/te)
2. Audio uploaded to server
3. AI processes and extracts profile data (name, phone, experience, summary)

### Employer Flow
1. **Post Job** (/post-job): Create job with title, category, experience, radius
2. **Find Candidates** (/hire): View filtered candidates matching job requirements
3. **Unlock & Contact**: Pay credits to reveal phone numbers

## What's Been Implemented

### Session 3: March 8, 2026
- [x] **Job Posting Flow** (/post-job):
  - Clean form UI with Job Title, Category grid (11 options), Experience slider, Radius slider
  - Real-time job preview card
  - Saves to MongoDB jobs collection
  - Redirects to /hire on success

- [x] **Hire Page Integration**:
  - "Your Active Jobs" selector in header
  - Auto-filters candidates by job's category (search bar)
  - Auto-sets distance slider to job's location_radius
  - Dynamic Match Score based on job's required_experience
  - Filter banner showing active job details
  - "Show All" button to reset filters
  - "Post Job" button in header

### Session 2: March 7, 2026
- [x] Phone Number Extraction (mock)
- [x] Credit Unlock Loop (10 credits, reveal phone)
- [x] Smart Match Feature (color-coded scores)

### Session 1: March 7, 2026
- [x] Mock Transcription Flow
- [x] Language-aware mock data
- [x] Hire Page UI with AI Summary

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/jobs | GET | List all jobs with categories |
| /nextapi/jobs | POST | Create new job posting |
| /nextapi/jobs | PATCH | Update job status (activate/pause) |
| /nextapi/jobs | DELETE | Delete job |
| /nextapi/upload-audio | POST | Upload audio, trigger processing |
| /nextapi/candidates | GET | List all candidates |
| /nextapi/wallet | GET/POST | Get balance / Add credits |
| /nextapi/unlock | POST | Unlock candidate (10 credits) |

## Database Schemas

### jobs collection
```javascript
{
  _id: string,
  title: string,
  category: string,           // Driver, Cook, Delivery, etc.
  required_experience: number, // 0-10 years
  location_radius: number,     // 1-50 km
  location: { lat, lng },
  status: "active" | "paused",
  is_active: boolean,
  created_at: Date,
  updated_at: Date
}
```

### candidates collection
```javascript
{
  _id: string,
  name: string,
  phone: string,
  role_category: string,
  experience_years: number,
  professional_summary: string,
  audio_interview_url: string,
  lang_code: string,
  moltbot_processed: boolean,
  location: { lat, lng },
  created_at: Date
}
```

### wallets collection
```javascript
{
  user_id: string,
  credit_balance: number,
  unlocked_candidates: string[],
  created_at: Date
}
```

## Job Categories
Driver, Cook, Delivery, Security Guard, House Helper, Electrician, Plumber, Carpenter, Cleaner, Gardener, General

## Match Score Algorithm
```javascript
function calculateMatchScore(candidateExp, jobRequiredExp) {
  if (candidateExp >= jobRequiredExp) {
    return Math.min(98, 85 + (candidateExp - jobRequiredExp) * 3);
  }
  return Math.max(40, 85 - Math.abs(candidateExp - jobRequiredExp) * 15);
}
// Green >= 85%, Amber 70-84%, Red < 70%
```

## Prioritized Backlog

### P0 - Critical
- [ ] Real Whisper API integration (replace mock)
- [ ] Payment integration for credits (Stripe/Razorpay)

### P1 - High Priority  
- [ ] Employer authentication
- [ ] SMS verification for candidates
- [ ] Job edit/delete from employer dashboard
- [ ] Multiple job management

### P2 - Nice to Have
- [ ] Push notifications when new matching candidate
- [ ] WhatsApp integration for contact
- [ ] Employer analytics dashboard
- [ ] Bulk unlock discounts

## Next Tasks
1. Integrate payment gateway for credit purchases
2. Add employer authentication flow
3. Implement job management (edit/delete)
