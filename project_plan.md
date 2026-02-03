# AdventurePlex Loyalty Program - Project Plan v1.0

## 📋 Executive Summary
A loyalty rewards application for AdventurePlex with three distinct portals:
- **Customer Portal** (Mobile Web): Enrollment + Digital Pass
- **Staff Portal** ("Stamper"): QR scanning + stamp/redeem operations
- **Admin Dashboard**: Analytics & metrics

---

## 🏗️ Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma ORM |
| QR Scanning | `react-qr-reader` / `html5-qrcode` |
| QR Generation | `qrcode` library |
| Real-time | Server-Sent Events (SSE) or polling |

### File Structure
```
/app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                  # SQLite database file
├── src/
│   ├── app/
│   │   ├── layout.js           # Root layout
│   │   ├── page.js             # Landing/redirect
│   │   ├── globals.css         # Global styles
│   │   │
│   │   ├── register/
│   │   │   └── page.js         # Customer enrollment form
│   │   │
│   │   ├── pass/
│   │   │   └── [id]/
│   │   │       └── page.js     # Digital pass view (mobile wallet)
│   │   │
│   │   ├── staff/
│   │   │   ├── login/
│   │   │   │   └── page.js     # Staff PIN login
│   │   │   ├── scan/
│   │   │   │   └── page.js     # QR scanner view
│   │   │   └── action/
│   │   │       └── [userId]/
│   │   │           └── page.js # Stamp/Redeem control panel
│   │   │
│   │   ├── admin/
│   │   │   └── page.js         # Analytics dashboard
│   │   │
│   │   └── api/
│   │       ├── register/
│   │       │   └── route.js    # POST: Create user
│   │       ├── user/
│   │       │   └── [id]/
│   │       │       └── route.js # GET: Fetch user data
│   │       ├── stamp/
│   │       │   └── route.js    # POST: Add stamp
│   │       ├── redeem/
│   │       │   └── route.js    # POST: Redeem reward
│   │       ├── analytics/
│   │       │   └── route.js    # GET: Dashboard metrics
│   │       └── events/
│   │           └── [userId]/
│   │               └── route.js # SSE: Real-time updates
│   │
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── StampCard.js        # Visual stamp display (10 slots)
│   │   ├── QRScanner.js        # Camera QR reader wrapper
│   │   ├── DigitalPass.js      # Mobile wallet card design
│   │   └── StatsCard.js        # Analytics metric card
│   │
│   └── lib/
│       ├── prisma.js           # Prisma client singleton
│       ├── notifications.js    # Notification stubs (SMS/Email hooks)
│       └── utils.js            # Helper functions
│
├── public/
│   └── logo.png                # AdventurePlex logo
│
├── package.json
├── tailwind.config.js
├── next.config.js
└── project_plan.md
```

---

## 💾 Database Schema (Prisma)

```prisma
model User {
  id             String        @id @default(cuid())
  name           String
  phone          String        @unique
  currentStamps  Int           @default(0)
  lifetimeVisits Int           @default(0)
  joinDate       DateTime      @default(now())
  transactions   Transaction[]
}

model Transaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "EARN" or "REDEEM"
  staffId   String   @default("STAFF_001")
  timestamp DateTime @default(now())
}

model Staff {
  id   String @id @default(cuid())
  name String
  pin  String // Hashed PIN for MVP (or plaintext for simplicity)
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/register` | Create new user | `{name, phone}` | `{id, name, currentStamps}` |
| GET | `/api/user/[id]` | Get user details | - | `{id, name, phone, currentStamps, lifetimeVisits}` |
| POST | `/api/stamp` | Add stamp to user | `{userId, staffId}` | `{success, newCount}` |
| POST | `/api/redeem` | Redeem reward (reset stamps) | `{userId, staffId}` | `{success, message}` |
| GET | `/api/analytics` | Dashboard metrics | - | `{totalCustomers, stampsToday, redemptions}` |
| GET | `/api/events/[userId]` | SSE stream for real-time | - | Event stream |

---

## 🚀 Execution Phases

### PHASE 0: Setup & Infrastructure (This Phase)
- [x] Create project plan document
- [ ] Initialize Next.js 14 project with App Router
- [ ] Configure Tailwind CSS
- [ ] Set up Prisma with SQLite
- [ ] Define and migrate database schema
- [ ] Create Prisma client singleton

### PHASE 1: Backend & Database
- [ ] Implement `/api/register` route
- [ ] Implement `/api/user/[id]` route
- [ ] Implement `/api/stamp` route
- [ ] Implement `/api/redeem` route
- [ ] Implement `/api/analytics` route
- [ ] Create notification stubs (log events)
- [ ] Seed initial staff data (PIN: 1234)

### PHASE 2: Customer Frontend
- [ ] Build `/register` page
  - Form with Name + Phone fields
  - Validation & error handling
  - Success screen with "View Pass" button
- [ ] Build `/pass/[id]` page
  - Mobile-optimized wallet card design
  - Dynamic stamp visualization (X/10)
  - QR code containing user ID
  - "Add to Home Screen" prompt
  - Real-time updates via SSE/polling

### PHASE 3: Staff Frontend
- [ ] Build `/staff/login` page
  - PIN input (hardcoded: 1234 for MVP)
  - Session storage for auth state
- [ ] Build `/staff/scan` page
  - Camera permission request
  - QR scanner integration
  - Auto-redirect to action page on scan
- [ ] Build `/staff/action/[userId]` page
  - Display customer name & stamp count
  - "Add Stamp" button (if < 10)
  - "Redeem Reward" button (if = 10)
  - Success/confirmation feedback
  - Back to scanner button

### PHASE 4: Admin Dashboard
- [ ] Build `/admin` page
  - Total Customers metric
  - Stamps Given Today metric
  - Total Redemptions metric
  - Recent activity list (optional)

### PHASE 5: Testing & Polish
- [ ] End-to-end flow testing
- [ ] Mobile responsiveness verification
- [ ] Error handling edge cases
- [ ] Performance optimization

---

## 🎨 UI/UX Design Notes

### Customer Pass (Mobile)
- Card-like appearance resembling Apple/Google Wallet
- Brand colors: Adventure theme (greens, oranges)
- 10-slot stamp grid visualization
- Large, scannable QR code
- Animated stamp additions

### Staff Portal
- Large touch targets for quick operation
- Clear visual feedback (green = success, red = error)
- Minimal navigation - task-focused

### Admin Dashboard
- Clean stat cards in grid layout
- Date filters for metrics
- Responsive for tablet/desktop

---

## 🔒 Security Considerations (MVP)
- Staff PIN stored in session (not production-grade)
- User IDs use CUID for unpredictability
- No sensitive data exposed in QR codes
- HTTPS required in production

---

## 📝 Notification Stubs (Future)
```javascript
// lib/notifications.js
export async function notifyStampEarned(userId, newCount) {
  console.log(`[NOTIFICATION STUB] User ${userId} earned stamp. Total: ${newCount}/10`);
  // TODO: Integrate Twilio/SendGrid
}

export async function notifyRewardReady(userId) {
  console.log(`[NOTIFICATION STUB] User ${userId} has 10 stamps! Reward ready.`);
  // TODO: Send SMS/Email
}
```

---

## ✅ Success Criteria
1. Customer can enroll via web form and receive a digital pass
2. Staff can scan pass and add stamps (max 10)
3. Staff can redeem rewards when customer has 10 stamps
4. Customer's pass updates in real-time when stamps are added
5. Admin can view total customers, today's stamps, and redemptions

---

## 🚦 Ready for Review
Plan Status: **COMPLETE**

Awaiting approval to proceed with **PHASE 0: Setup & Infrastructure**.
