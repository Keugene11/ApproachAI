# Wingmate

AI-powered confidence coach for approaching people. Get real-time motivational coaching, track your progress with streaks, and connect with a community of people on the same journey.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + DM Sans
- **Auth:** Supabase Auth (Google OAuth)
- **Database:** Supabase (Postgres) with RLS
- **AI:** Claude Sonnet via Vercel AI SDK (`@ai-sdk/anthropic`)
- **Payments:** Stripe (subscriptions)
- **Deployment:** Vercel + Android TWA (Google Play)

## Features

- **AI coaching** — Streaming real-time coach with a motivational, friend-like personality. Gives you an opener, read-aheads, and an exit strategy.
- **Daily check-ins** — Log whether you approached someone today. Track opportunities, approaches, and successes.
- **Streaks & stats** — Track your approach streaks and view stats over time.
- **Community** — Post your wins, vote on others' posts, browse by new or top.
- **Conversation history** — Past coaching sessions saved and reviewable.
- **Subscription gating** — Freemium model (1 free session + 1 message), then $15/month or $10/month yearly.
- **PWA + Android app** — Installable as a PWA with offline support, plus a Trusted Web Activity for the Play Store.

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

## Live

[wingmate.live](https://wingmate.live)

## Pricing

| Plan    | Price      | Billing        |
|---------|------------|----------------|
| Free    | $0         | 1 session + 1 message |
| Monthly | $15/month  | Billed monthly |
| Yearly  | $10/month  | $120/year      |
