# 🏋️ Fitness OS — Personal Performance Operating System

> Zero-cost, mobile-first, Apple-minimal PWA for personal fitness tracking

## 📱 Demo Features

- **Dashboard** — Daily overview with activity rings, calories, recovery score
- **Workout** — Real-time workout logging with sets, reps, weight, RPE + Epley 1RM
- **Nutrition** — Food logging with 40+ Indian foods + AI text parsing (Gemini/Groq)
- **Body** — Weight tracking, 7-day moving average, progress photos, plateau detection
- **Recovery** — Sleep, stress, mood, soreness → recovery score
- **Analytics** — Strength curves, muscle volume heatmap, body trends, macro adherence
- **Programs** — AI text-to-program parser, program activation, quick-start

---

## 🚀 Zero-Cost Setup (30 min)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/fitness-pwa
cd fitness-pwa
npm install
```

### 2. Supabase Setup (Free)

1. Go to [supabase.com](https://supabase.com) → Create new project (free tier)
2. Go to **SQL Editor** → paste entire contents of `supabase-schema.sql` → Run
3. Go to **Storage** → Create bucket → Name: `progress-photos` → Set to **Public**
4. Go to **Settings → API** → Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Optional: AI APIs

**Gemini (Google)** — Free tier: 15 req/min
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create API key → Add to `.env.local`:
   ```env
   GEMINI_API_KEY=AIza...
   ```

**Groq** — Free tier: generous limits, Llama models
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create API key → Add to `.env.local`:
   ```env
   GROQ_API_KEY=gsk_...
   ```

> **Note:** Both AI keys are optional. The app works perfectly with local rule-based parsing if neither is provided.

### 5. Run Locally

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

Or use the Vercel dashboard:
1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### 7. Install as PWA on iPhone

1. Open your Vercel URL in **Safari** on iPhone
2. Tap the **Share** button (bottom center)
3. Tap **Add to Home Screen**
4. Name it "Fitness OS" → Tap **Add**

---

## 🏗 Architecture

```
fitness-pwa/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── dashboard-client.tsx
│   ├── workout/page.tsx    # Workout logger
│   ├── nutrition/page.tsx  # Food tracker
│   ├── body/page.tsx       # Body metrics
│   ├── recovery/page.tsx   # Recovery tracker
│   ├── analytics/page.tsx  # Charts & analytics
│   └── program/page.tsx    # Program builder
├── components/
│   └── ui/                 # Bottom nav, toaster, etc.
├── lib/
│   ├── ai.ts              # Gemini + Groq + local parser
│   ├── food-database.ts   # 40+ Indian foods static DB
│   ├── store.ts           # Zustand global state
│   ├── supabase.ts        # Supabase client
│   └── utils.ts           # Helpers, formatters
├── types/index.ts         # All TypeScript types
├── public/
│   └── manifest.json      # PWA manifest
└── supabase-schema.sql    # Complete DB schema
```

---

## 💡 Key Technical Decisions

### AI Integration (Zero-cost)
```
User triggers AI → Try Gemini free → Try Groq free → Local parser fallback
```
- No AI keys = 100% local rule-based logic
- AI only activates on user request (not automatic)
- Graceful degradation at every step

### Workout Text Parser
```
Monday: Chest + Triceps
- Bench Press 4x8         → { name, sets: 4, reps: "8", muscle: "chest" }
```
- Regex extracts day name, exercise, sets, reps
- Muscle group auto-assigned from keyword matching
- AI fallback if confidence is low

### Offline-First Architecture
- Zustand store persisted to localStorage
- Active workout sessions survive browser close
- Service worker caches static assets + recent API responses
- Offline queue syncs when reconnected

### Progressive Overload Logic
- All sets hit max reps + RPE ≤ 8 → suggest +2.5kg
- RPE > 9 repeatedly + declining strength → suggest deload
- Strength declining 3 weeks → suggest volume reduction

---

## 📊 Supabase Free Tier Limits

| Resource | Limit | Expected Usage |
|----------|-------|----------------|
| Database | 500MB | ~10MB/year |
| Storage | 1GB | ~500MB for photos |
| API calls | 50K/month | ~3K/month |
| Bandwidth | 5GB | <1GB |

→ **Well within free tier for personal use**

---

## 🎨 Design System

- **Background**: `#f5f5f7` (Apple light gray)
- **Cards**: White, `rounded-2xl`, soft shadow
- **Primary**: `#007AFF` (Apple blue)
- **Typography**: System sans-serif stack
- **Bottom Nav**: 7 tabs, active indicator dot
- **Animations**: Fade-up on mount, scale on tap

---

## 🔧 Customization

### Change Nutrition Goals
Edit Zustand store default in `lib/store.ts`:
```typescript
nutritionGoal: {
  calories: 2500,  // ← your goal
  protein: 180,
  carbs: 250,
  fat: 75,
}
```

### Add More Indian Foods
Edit `lib/food-database.ts` — add entries to the `FOOD_DATABASE` array.

### Modify Recovery Score Formula
Edit `calculateRecoveryScore()` in `lib/ai.ts` — adjust weights as needed.

---

## 🤝 Tech Stack

| Layer | Tech | Cost |
|-------|------|------|
| Frontend | Next.js 14 + TypeScript | Free |
| Styling | TailwindCSS + ShadCN | Free |
| Charts | Recharts | Free |
| State | Zustand | Free |
| Database | Supabase PostgreSQL | Free |
| Storage | Supabase Storage | Free |
| Hosting | Vercel | Free |
| PWA | next-pwa | Free |
| AI (optional) | Gemini / Groq | Free tier |

**Total monthly cost: $0.00** ✓
