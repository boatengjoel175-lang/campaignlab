# CampaignLab

Live marketing campaign simulator for university classrooms.

## Stack

Next.js 14 · TypeScript · Tailwind CSS  
Supabase (DB + Auth + Realtime) · Google Gemini 2.5 Flash (FREE)  
Vercel (hosting) · GitHub (version control)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## How to use

1. **Professor:** go to `/professor` → login → create session
2. **Students:** go to `/student` → enter code → build strategy
3. **Professor:** click "Run Simulation" → Gemini judges all strategies
4. **Everyone** sees results on the live leaderboard
