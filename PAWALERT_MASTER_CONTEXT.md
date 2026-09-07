# PawAlert: Master Architecture & AI Continuity Manual
**Hyper-Local Community Stray Dog Rescue & Feeder Network**

*Document Purpose: Complete contextual handoff for Antigravity AI Agents. When loaded into any Antigravity instance or developer environment, this document provides 100% full-fidelity context, architectural memory, database schemas, solved bug patterns, and execution workflows to continue development immediately.*

---

## 1. Executive Summary & Mission

**PawAlert** is an open-source, production-grade Progressive Web App (PWA) designed for community stray dog feeders, rescuers, volunteers, and veterinarians across India. 

### Core Problems Solved:
1. **10-Second Emergency Broadcasting**: Allows anyone who spots a hungry, injured, sick, aggressive, or newborn stray puppy litter to broadcast an emergency pin with a photo and spot landmark in under 10 seconds.
2. **Real-time Proximity Radar**: Nearby feeders and volunteers within a 10km radius receive audio chimes (synthesized multi-tone harmonic frequencies via Web Audio API) and vibration alerts.
3. **Sub-Meter HD Satellite Pinpointing**: Feeder volunteers can switch to high-resolution ESRI Hybrid Satellite view (Zoom Level 18/19) to drop a pin on the exact physical tree, parked car, shop stall, or building gate where the dog is hiding.
4. **Live Rescue Updates Stream**: Volunteers post real-time updates (*"On my way with bandages"*, *"Bringing puppy food"*, *"Contacted Vet"*).
5. **Gamified Feeder Karma**: Leaderboards and volunteer profiles reward feeders and rescuers for their community work.
6. **24/7 Emergency Vet Radar**: Instant directory of emergency veterinary clinics with turn-by-turn navigation URLs (two-wheeler, driving, walking).

---

## 2. Workspace, Deployment & Git Credentials

### Local Workspace:
- **Absolute Path**: `/home/wishhhhmaster/.gemini/antigravity/scratch/PawAlert-Web`
- **Node Version**: v24.18.0 (NVM managed)
- **Package Manager**: npm

### Remote Repository:
- **GitHub URL**: `https://github.com/arjunhunt/pawalert-web.git`
- **GitHub Username**: `arjunhunt`
- **Authentication**: GitHub Personal Access Token (PAT)

### Live Deployments (Vercel):
- **Production URL**: `https://pawalert-web.vercel.app` (Deploys automatically on push to `main`)
- **Trial / Staging URL**: `https://pawalert-web-git-staging-arjunhunt.vercel.app` (Deploys automatically on push to `staging`)

---

## 3. The Golden Rule: Staging vs. Production Workflow

> **CRITICAL INSTRUCTION FOR ALL AGENTS**:
> Never push experimental, unverified, or speculative code directly to the `main` branch. 
> PawAlert follows a strict **Staging-First Protocol**:

```
[ Developer / AI Agent Work ] 
            │
            ▼
    Branch: `staging`  ──►  Push to `origin staging`
            │
            ▼
[ User Tests Privately on Trial Link on Real Mobile Devices ]
            │
     ┌──────┴──────────────────────────┐
     ▼                                 ▼
Needs Tweaks                     User Approves ("it's working, push to main")
     │                                 │
     ▼                                 ▼
Iterate on `staging`             Merge to `main` & push to `origin main`
```

### Git Branch Reference:
- **`main`**: Production release. Clean, 100% verified, stable. Does NOT contain the "Trial Mode" badge.
- **`staging`**: Active trial playground. Features the `🧪 Trial Mode` badge in the navigation bar. Used for user field-testing with real phone GPS and cameras.
- **`backup-voice-and-satellite`**: Preserves earlier experimental Web Speech API Voice SOS modal and voice entity parser.
- **`backup-pre-pet-travel`**: Clean state before the pet travel module.

---

## 4. Tech Stack & Dependencies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 14.2.5 | SSR, static generation, API handling, route grouping |
| **Language** | TypeScript | 5.x | Strict type safety across all models |
| **Styling** | Tailwind CSS | 3.4.1 | Dark-mode native, mobile-first responsive design |
| **Icons** | Lucide React | 0.428.0 | Consistent iconography |
| **Database** | Supabase (PostgreSQL) | 2.45.0 | RLS, Realtime WebSockets, Storage buckets |
| **Maps** | Leaflet + React Dynamic | 1.9.4 | Interactive maps, custom pins, geodesic calculations |
| **Map Tiles** | ESRI World Imagery | Latest | Satellite photography + Hybrid Reference Labels |
| **Map Tiles** | OpenStreetMap | Latest | Fast vector street map layer |
| **Audio** | Web Audio API | Native | Synthesized chime oscillators (no external mp3 needed) |
| **Vibration** | Web Vibration API | Native | Tactical mobile haptics for proximity alerts |
| **PDF Tools** | WeasyPrint | 69.0 | Automated documentation compilation |

---

## 5. Complete File & Directory Map

```
PawAlert-Web/
├── next.config.mjs              # Security headers, CSP, Permissions-Policy
├── package.json                 # Dependencies & scripts
├── tailwind.config.ts           # PawAlert amber theme color definitions
├── tsconfig.json                # TypeScript paths (@/* -> ./src/*)
├── public/                      # Static icons, manifest.json, service worker
├── supabase/
│   └── schema.sql               # Full PostgreSQL tables, RLS policies, indexes
└── src/
    ├── app/
    │   ├── layout.tsx           # Root HTML layout, font loading, dark theme
    │   ├── page.tsx             # Home feed, active/all filters, category chips, map/feed toggle
    │   ├── report/page.tsx      # Emergency broadcast form, photo upload, pinpoint map
    │   ├── alert/[id]/page.tsx  # Alert detail, navigation launcher, live comments, deletion
    │   ├── leaderboard/page.tsx # Community feeder karma rankings & badges
    │   ├── profile/page.tsx     # Volunteer profile, activity statistics, cloud sync
    │   ├── admin/page.tsx       # Founder super-admin portal with SHA-256 passcode lock
    │   └── vets/page.tsx        # 24/7 Emergency veterinary hospital directory
    ├── components/
    │   ├── MapView.tsx          # Leaflet map, Satellite/Street toggle, Locate Me button
    │   ├── Navbar.tsx           # Sticky navigation header, GPS detector status
    │   ├── PhotoUpload.tsx      # Canvas image compression (1200px max, 0.8 quality)
    │   ├── NotificationBanner.tsx # Top notification bar for instant alert alerts
    │   ├── InstallPwaPrompt.tsx # PWA install prompt for Android and iOS Safari
    │   └── CategoryFilter.tsx   # Horizontal chip filters for problem categories
    └── lib/
        ├── geo.ts               # Hardware GPS lock, Haversine distance, navigation URLs
        ├── supabaseClient.ts    # Supabase initialization & fallback DEMO_REPORTS
        ├── user.ts              # Local user handles, karma tracking, delete permissions
        ├── security.ts          # XSS escaping, rate limiting, honeypot spam bot trapping
        ├── notifications.ts     # Web Audio chimes, vibration pulses, Web Notifications
        └── types.ts             # DogReport, ProblemType, ReportStatus, CommentType interfaces
```

---

## 6. Database Schema & Supabase Architecture

### 1. `public.reports` (Main Dog Alerts Table)
```sql
create table if not exists public.reports (
    id uuid primary key default uuid_generate_v4(),
    reporter_id text default 'anonymous',
    reporter_name text not null default 'Anonymous Feeder' check (length(reporter_name) <= 100),
    problem_type text not null check (problem_type in (
        'HUNGRY', 'INJURED', 'SICK', 'STUCK', 'AGGRESSIVE', 'LOST', 'NEWBORN_LITTER', 'OTHER'
    )),
    description text not null check (length(description) >= 1 and length(description) <= 2000),
    photo_url text not null default '',
    latitude double precision not null check (latitude >= -90.0 and latitude <= 90.0),
    longitude double precision not null check (longitude >= -180.0 and longitude <= 180.0),
    address text not null default '' check (length(address) <= 500),
    landmark text not null default '' check (length(landmark) <= 300),
    status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    helper_id text,
    helper_name text check (helper_name is null or length(helper_name) <= 100),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- High Performance Compound Indexes
create index idx_reports_status on public.reports (status);
create index idx_reports_created_at on public.reports (created_at desc);
create index idx_reports_coords on public.reports (latitude, longitude);
create index idx_reports_geo_status on public.reports (latitude, longitude, status);

-- Enable RLS & Realtime
alter table public.reports enable row level security;
create policy "Public read" on public.reports for select using (true);
create policy "Public insert" on public.reports for insert with check (true);
create policy "Public update" on public.reports for update using (true);
create policy "Public delete" on public.reports for delete using (true);
alter publication supabase_realtime add table public.reports;
```

### 2. `public.comments` (Rescue Coordination Stream)
```sql
create table if not exists public.comments (
    id uuid primary key default uuid_generate_v4(),
    report_id uuid references public.reports(id) on delete cascade not null,
    author_id text not null default 'anonymous',
    author_name text not null default 'Community Feeder' check (length(author_name) <= 100),
    content text not null check (length(content) >= 1 and length(content) <= 1000),
    comment_type text not null default 'GENERAL' check (comment_type in (
        'UPDATE', 'ON_MY_WAY', 'FEEDING', 'VET_CONTACTED', 'GENERAL'
    )),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter publication supabase_realtime add table public.comments;
```

### 3. Storage Bucket: `dog-photos`
- Public read access enabled.
- File size limit: `5242880` bytes (5 MB).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/jpg`.

---

## 7. Critical Solved Problems & Architectural Memory

To prevent regression, every future AI agent working on PawAlert must understand these solved engineering challenges:

### 1. The "Fixed Home Location" Map Snap Bug (SOLVED)
- **Problem**: When loading PawAlert on different phones across India, the map kept jumping to a fixed location in Gujarat (`20.1759, 72.7549`) where the developer originally started the project.
- **Root Cause**: In `MapView.tsx`, an update hook executed `map.setView([centerLat, centerLng])` on every re-render. If `userLocation` was momentarily null during GPS warm-up, `centerLat` defaulted to `reports[0]?.latitude || 20.1759`. This forcefully dragged the viewport back to Gujarat.
- **Permanent Solution**: 
  1. Removed the `map.setView` call from the re-render hook.
  2. Initial map view defaults to a neutral country overview (`21.7679, 78.8718`, Zoom 5).
  3. As soon as the device GPS resolves, Leaflet executes a smooth `flyTo([userLocation.lat, userLocation.lng], 17, { duration: 1.2 })`.
  4. Added a floating `🎯 Locate Me` button that queries hardware GPS and flies directly to the user's coordinates.

### 2. Mobile Browser GPS Inaccuracy & Timeouts (SOLVED)
- **Problem**: Mobile browsers were returning coarse location ($\pm 100	ext{m} - 500	ext{m}$) or timing out after 6 seconds.
- **Root Cause**: `getAccurateGPSPosition` was waiting strictly for $\le 20	ext{m}$ satellite lock. Indoors, mobile phones typically only get 25–45m accuracy, causing the timeout timer to trigger and return `(0, 0)`.
- **Permanent Solution**: 
  - Implemented **Dual-Mode Resilient GPS Resolution**: First queries hardware GPS (`enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 0`). If satellite signals are weak, it seamlessly accepts network triangulation ($\sim 40	ext{m}$) so coordinates resolve in under 1 second on all devices.
  - Stale mock coordinates (`20.1759`) are strictly filtered out in `getCachedCoordinates()`.

### 3. Permissions-Policy Syntax on Mobile (SOLVED)
- **Problem**: Geolocation was failing to prompt on iPhone Safari and certain Android WebViews.
- **Root Cause**: `next.config.mjs` contained `Permissions-Policy: geolocation=*`. The W3C specification strictly requires `geolocation=(self)`.
- **Permanent Solution**: Configured `camera=(self), geolocation=(self), microphone=(self)` in HTTP response headers.

### 4. Author-Only Deletion & Founder Master Admin (SOLVED)
- **Problem**: Anyone could delete any report.
- **Solution**: 
  - `canDeleteReport(report)` checks whether the current user's ID matches `report.reporter_id` or is present in the device's `pawalert_my_report_ids` in `localStorage`.
  - Founder super-admin mode is authenticated via SHA-256 cryptographic hashing (`crypto.subtle.digest`) in `src/app/admin/page.tsx` for emergency take-down privileges.

---

## 8. Development & Deployment Cheatsheet

### 1. Check Out & Run Locally:
```bash
cd /home/wishhhhmaster/.gemini/antigravity/scratch/PawAlert-Web
npm run dev
# Opens on http://localhost:3000
```

### 2. Verify TypeScript & Production Build:
```bash
npm run build
# Must compile all 10 routes with 0 errors
```

### 3. Developing a New Feature (Trial Workflow):
```bash
# 1. Switch to staging branch
git checkout staging

# 2. Make your code changes...

# 3. Test build
npm run build

# 4. Commit and push to trial
git add .
git commit -m "Add [feature description] on staging"
git push origin staging
# Provide username: arjunhunt and PAT when prompted
```

### 4. Promoting Tested Features to Production:
```bash
# 1. Switch to main branch
git checkout main

# 2. Merge staging (or cherry-pick feature files)
git merge staging

# 3. Verify clean build
npm run build

# 4. Push to live production
git push origin main
```

---

## 9. Next Planned Features & Backlog

1. **AI Voice-to-Rescue SOS**: Re-integrate speech recognition from `backup-voice-and-satellite` with multi-turn pause handling for hands-free reporting in Hindi and Indian English.
2. **Offline Feeder Cache**: Background Sync API to queue reports when feeding in low-connectivity rural alleys.
3. **PWA Push Notifications**: Web Push Service Worker for automated proximity dog alerts when the browser is closed.
4. **NGO / Shelter Escalation**: Automated WhatsApp Web / Twilio dispatch for critical emergency rescues.

---

*Authored for Antigravity AI Pair Programming Continuity — September 2026*
