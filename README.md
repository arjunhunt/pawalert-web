# 🐾 PawAlert Web Application

A modern, real-time web platform connecting local community feeders and dog lovers with stray dogs needing food, medicine, and rescue.

Built with **Next.js 14+**, **Tailwind CSS**, **Supabase (Postgres + Realtime + Storage)**, and deployed on **Vercel**.

---

## 🌟 Key Features

- 📍 **Nearest-First Feed**: Automatically detects browser GPS and sorts alerts by physical distance (e.g. `250 m away`).
- 🗺️ **Interactive Live Map**: Real-time Leaflet map with color-coded distress pins (`Injured`, `Hungry`, `Sick`, `Puppies`).
- 📸 **Camera & Photo Upload**: High-resolution image capture with client-side canvas compression.
- ⚡ **Supabase Realtime**: Instant WebSocket sync — when someone reports a dog, it appears on everyone's screen in real-time.
- 🐾 **Rescuer Claim & Resolve**: Community volunteers can claim alerts ("I'll help this dog") and mark them resolved with celebratory confetti.
- 📱 **PWA Ready**: Works seamlessly on iPhone, Android, and Desktop browsers.

---

## 🚀 1. Supabase Setup (Free)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy your **Project URL** and **anon public key** from **Project Settings → API**.

---

## 🌐 2. Vercel Deployment

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5. Click **Deploy**!
