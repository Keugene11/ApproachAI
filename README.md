# Wingmate

**AI-powered confidence coach for cold approaches.** Get motivated, get a game plan, and go talk to her.

Wingmate combines real-time AI coaching with daily accountability tracking and a community of people on the same journey. One approach that goes right will change how you see yourself — Wingmate is how you get there.

[wingmate.live](https://wingmate.live)

---

## Features

### AI Coaching
Streaming real-time coach with a raw, motivational personality. Gives you a context-aware opener, a read-ahead game plan, and an exit strategy — whether you're at the gym, a cafe, or out on the street.

### Daily Check-ins & Streaks
Log whether you approached someone today. Track opportunities, approaches, and successes. Build streaks and stay accountable.

### Stats & Analytics
Calendar heatmap showing your approach activity day by day. View monthly and all-time stats including approach rate, success rate, and days active.

### Community
Post your wins, share stories, and vote on others' posts. Sort by new or top, search posts, and comment on threads.

### Subscription Gating
Freemium model — 1 free coaching session + 1 message. Pro unlocks unlimited coaching, full stats, and community access.

### PWA + Android App
Installable as a Progressive Web App with offline support, plus a Trusted Web Activity wrapper for the Google Play Store.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript + React 19 |
| Styling | Tailwind CSS v4 + DM Sans |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (Postgres) with RLS |
| AI | Claude via Vercel AI SDK (`@ai-sdk/anthropic`) |
| Payments | Stripe (subscriptions, customer portal, webhooks) |
| Deployment | Vercel + Android TWA (Google Play) |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/             # Streaming AI coach
│   │   ├── checkin/          # Daily check-in CRUD
│   │   ├── conversations/    # Conversation & message history
│   │   ├── profile/          # User profile & goals
│   │   ├── stats/            # Aggregated user stats
│   │   ├── usage/            # Free tier usage tracking
│   │   ├── stripe/           # Checkout, portal, status, setup
│   │   └── webhooks/stripe/  # Stripe webhook handler
│   ├── auth/
│   │   ├── callback/         # OAuth callback
│   │   └── complete/         # Post-auth completion
│   ├── community/            # Feed, posts, user profiles
│   ├── onboarding/           # Multi-step onboarding flow
│   ├── plans/                # Subscription plans
│   ├── profile/              # User profile page
│   ├── delete-account/       # Account deletion
│   ├── privacy/              # Privacy policy
│   ├── terms/                # Terms of service
│   └── offline/              # Offline fallback
├── components/
│   ├── ChatCoach.tsx         # AI coaching chat interface
│   ├── DailyCheckin.tsx      # Check-in UI
│   ├── ConversationList.tsx  # Past sessions
│   ├── StatsView.tsx         # Stats & streaks
│   ├── PostCard.tsx          # Community post card
│   ├── BottomNav.tsx         # Tab navigation
│   └── UpgradeModal.tsx      # Pro upgrade prompt
├── lib/
│   ├── gamification.ts       # Streaks & stats config
│   ├── stripe.ts             # Stripe client + price config
│   ├── supabase-browser.ts   # Browser Supabase client
│   ├── supabase-server.ts    # Server Supabase client
│   └── utils.ts              # General utilities
└── middleware.ts              # Auth + subscription gating

android-twa/                   # Trusted Web Activity (Android)
public/
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
└── icons/                     # App icons
```

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, Stripe, and AI keys

# Run development server
pnpm dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI (Anthropic)
ANTHROPIC_API_KEY=
```

---

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| Free | $0 | 1 coaching session + 1 message |
| Monthly | $15/month | Unlimited coaching, stats, community |
| Yearly | $10/month | $120/year — save 33% |

---

## Deployment

Deployed on [Vercel](https://vercel.com) via GitHub integration. Push to `master` triggers a production deploy. The Android app is a Trusted Web Activity wrapping the PWA.

---

Built by [Keugene Lee](https://github.com/keugenelee)
