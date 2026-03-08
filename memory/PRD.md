# GetLocal V2 - Product Requirements Document

## Project Overview
Voice-first blue-collar hiring platform that enables workers to create audio-based profiles and employers to find local candidates.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: MongoDB (getlocal database)
- **Location**: /app/getlocal/

## Core User Flows

### Job Seeker Flow (/join)
1. Choose entry mode: Voice Record or Fill Form Manually
2. **Voice Mode**: Answer 3 voice questions, then add location details
3. **Manual Mode**: Fill form with Name, Role, Experience, Summary
4. Both modes require: Address/Pincode + Relocation preference
5. Profile created and visible to employers

### Employer Flow
1. **Post Job** (/post-job): Create detailed job posting
2. **Find Candidates** (/hire): View filtered candidates with address & relocation info
3. **Unlock & Contact**: Pay credits to reveal phone numbers

## What's Been Implemented

### Session 4: March 8, 2026 - Data Capture Upgrades

**Part 1: Candidate Onboarding (/join)**
- [x] Voice/Manual Toggle: "🎤 Record Voice" vs "✍️ Fill Form"
- [x] Manual Form Fields: Name, Work Type, Experience, Summary
- [x] Common Fields (both modes): Current Address/Pincode (required), Willing to Relocate toggle
- [x] MongoDB schema updated: `address`, `will_relocate` fields

**Part 2: Employer Job Posting (/post-job)**
- [x] Salary Offered: Fixed Monthly or Salary Range toggle
- [x] Perks Multi-select: Free Meals, Accommodation, PF/ESI, Transport, Uniform, Bonus
- [x] Training Provided toggle
- [x] Job Expectations textarea
- [x] MongoDB jobs schema updated with all new fields

**Part 3: UI Sync (/hire)**
- [x] Address displayed on candidate cards with location icon
- [x] Relocation badge: "✓ Will Relocate" (green) or "✗ Won't Relocate"

### Previous Sessions
- Session 3: Job Posting Flow, Dynamic Filters, Job Selector
- Session 2: Phone Extraction, Credit Unlock Loop, Smart Match
- Session 1: Mock Transcription, Language-aware Data, AI Summary

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /nextapi/jobs | GET/POST/PATCH/DELETE | Job CRUD with V2 fields |
| /nextapi/upload-audio | POST | Upload audio OR create manual profile |
| /nextapi/candidates | GET | List all candidates with V2 data |
| /nextapi/wallet | GET/POST | Get balance / Add credits |
| /nextapi/unlock | POST | Unlock candidate (10 credits) |

## Database Schemas

### candidates collection (V2)
```javascript
{
  _id: string,
  name: string,
  phone: string,
  location: { lat, lng },
  address: string,              // NEW: Address or pincode
  will_relocate: boolean,       // NEW: Relocation preference
  role_category: string,
  experience_years: number,
  professional_summary: string,
  audio_interview_url: string | null,
  lang_code: string,
  interview_metadata: {
    type: "structured_3q" | "manual",
    // ...
  },
  moltbot_processed: boolean,
  created_at: Date
}
```

### jobs collection (V2)
```javascript
{
  _id: string,
  title: string,
  category: string,
  required_experience: number,
  location_radius: number,
  location: { lat, lng },
  salary: {                     // NEW
    type: "fixed" | "range",
    amount?: number,
    min?: number,
    max?: number,
    display: string
  },
  perks: string[],              // NEW: ["meals", "accommodation", "pf_esi", ...]
  training_provided: boolean,   // NEW
  job_expectations: string,     // NEW
  status: "active" | "paused",
  is_active: boolean,
  created_at: Date
}
```

## Job Perks Options
| ID | Label | Icon |
|----|-------|------|
| meals | Free Meals | 🍽️ |
| accommodation | Accommodation | 🏠 |
| pf_esi | PF/ESI | 🏥 |
| transport | Transport | 🚌 |
| uniform | Uniform Provided | 👔 |
| bonus | Performance Bonus | 💰 |

## Job Categories
Driver, Cook, Delivery, Security Guard, House Helper, Electrician, Plumber, Carpenter, Cleaner, Cashier, General

## Prioritized Backlog

### P0 - Critical
- [ ] Real Whisper API integration (replace mock)
- [ ] Payment integration for credits (Stripe/Razorpay)

### P1 - High Priority  
- [ ] Employer authentication
- [ ] SMS verification for candidates
- [ ] Job management dashboard (edit/delete/pause)
- [ ] Search candidates by address/pincode

### P2 - Nice to Have
- [ ] Push notifications
- [ ] WhatsApp integration
- [ ] Employer analytics
- [ ] Advanced salary filtering

## Next Tasks
1. Add payment gateway for credit purchases
2. Implement employer authentication
3. Build job management dashboard
