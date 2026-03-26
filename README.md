# Wingmate

AI-powered confidence coach for cold approaches. Get motivated, get a game plan, and go talk to her.

**[wingmate.live](https://wingmate.live)**

## What It Does

Wingmate is a mobile-first app that helps guys build the confidence to approach and talk to new people. It combines AI coaching, daily accountability, and community support.

- **AI Coach** — Claude-powered chat that hypes you up and gives you an exact game plan (opener, how to read interest, graceful exit) tailored to your situation. No generic advice.
- **Daily Check-ins** — Track whether you approached someone each day. Build streaks, set weekly goals, and stay accountable.
- **Stats & Analytics** — Calendar heatmap, streak tracking, approach rate, and monthly breakdowns so you can see your progress over time.
- **Community** — Share experiences, read field reports, upvote/downvote posts, and comment. All anonymous by username.
- **Goal-Based Coaching** — Set your goal (girlfriend, improve social skills, hookups, make memories, or custom) and the AI tailors all advice accordingly.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + Lucide icons |
| Auth | Supabase Auth (Google OAuth + Apple Sign-In) |
| Database | Supabase (Postgres) |
| AI | Claude Haiku via Anthropic API |
| Payments | Stripe (web/Android) + RevenueCat IAP (iOS) |
| Rate Limiting | Upstash Redis |
| Analytics | Vercel Analytics |
| Mobile | Capacitor (iOS + Android native) + PWA |
| Deployment | Vercel |

## Project Structure

```
src/
  app/
    api/
      chat/          — AI coaching endpoint (streaming)
      checkin/        — Daily check-in logic
      conversations/  — Chat history CRUD
      profile/        — User profile management
      stats/          — Analytics data
      stripe/         — Checkout sessions + customer portal
      webhooks/       — Stripe & RevenueCat webhooks
    community/        — Community forum (posts, comments, voting)
    onboarding/       — Multi-step onboarding flow
    plans/            — Subscription pricing page
    profile/          — User profile page
    delete-account/   — Account deletion
    auth/             — OAuth callback handling
    privacy/          — Privacy policy
    terms/            — Terms of service
  components/         — Reusable UI components
  lib/                — Supabase client, Stripe helpers, platform detection, purchases
  types/              — Shared TypeScript types
```

## Getting Started

```bash
pnpm install
cp .env.example .env.local  # fill in your keys
pnpm dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `KV_REST_API_URL` | Upstash Redis URL |
| `KV_REST_API_TOKEN` | Upstash Redis token |
| `NEXT_PUBLIC_REVENUECAT_APPLE_API_KEY` | RevenueCat key for iOS IAP |

## Native Apps

The iOS and Android apps are built with Capacitor, wrapping the web app in a native shell.

```bash
pnpm build
pnpm cap:sync      # sync web assets to native project
pnpm cap:open       # open in Xcode
```

App ID: `live.wingmate.app`
