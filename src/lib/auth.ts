import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { sql } from "./db";

const ADJECTIVES = [
  "Bold","Brave","Chill","Cool","Daring","Epic","Fierce","Grand",
  "Happy","Keen","Lucky","Mighty","Noble","Quick","Sharp","Slick",
  "Smart","Smooth","Solid","Steady","Swift","Calm","Bright","Witty",
  "Clutch","Prime","Based","Alpha","Crisp","Fresh","Hype","Lit",
  "Ace","Chief","Raw","Real","Zen","True","Peak","Woke",
];
const ANIMALS = [
  "Falcon","Tiger","Wolf","Eagle","Hawk","Lion","Bear","Fox",
  "Shark","Panther","Cobra","Raven","Jaguar","Phoenix","Viper","Otter",
  "Lynx","Puma","Stallion","Mantis","Raptor","Bison","Crane","Drake",
  "Hound","Marlin","Osprey","Rhino","Condor","Gecko","Moose","Oryx",
];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
    // App Store / Google Play reviewers can't sign in with our personal
    // Google/Apple accounts, and Apple Guideline 2.1 requires a demo
    // account that doesn't depend on third-party sign-in. This provider
    // accepts a single fixed credential pair from env, auto-provisions
    // the user, and force-grants Pro so reviewers can exercise paid
    // features without a real subscription.
    Credentials({
      id: "reviewer",
      name: "Reviewer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const reviewerEmail = process.env.REVIEWER_EMAIL;
        const reviewerPassword = process.env.REVIEWER_PASSWORD;
        if (!reviewerEmail || !reviewerPassword) return null;
        if (creds?.email !== reviewerEmail) return null;
        if (creds?.password !== reviewerPassword) return null;

        // Look up or create the reviewer user row.
        let userId: string;
        const existing = await sql`SELECT id FROM users WHERE email = ${reviewerEmail} LIMIT 1`;
        if (existing.length > 0) {
          userId = existing[0].id as string;
        } else {
          const created = await sql`
            INSERT INTO users (email, name, provider, provider_account_id)
            VALUES (${reviewerEmail}, 'App Store Reviewer', 'credentials', 'reviewer')
            RETURNING id
          `;
          userId = created[0].id as string;
          await sql`
            INSERT INTO profiles (id, username, avatar_url)
            VALUES (${userId}, ${generateUsername()}, null)
            ON CONFLICT (id) DO NOTHING
          `;
        }

        // Force-grant 10-year Pro on every sign-in so the reviewer always
        // has access to gated features regardless of past state.
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 10);
        await sql`
          INSERT INTO subscriptions (
            user_id, stripe_customer_id, stripe_subscription_id,
            status, current_period_start, current_period_end, updated_at
          )
          VALUES (
            ${userId}, 'reviewer_grant', 'reviewer_grant',
            'active', now(), ${farFuture.toISOString()}, now()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            status = 'active',
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = false,
            updated_at = now()
        `;

        return { id: userId, email: reviewerEmail, name: "App Store Reviewer" };
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/onboarding",
    error: "/onboarding",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      // Reviewer credentials path: user already provisioned + Pro granted
      // inside the authorize() callback. Skip the OAuth upsert.
      if (account.provider === "reviewer") return true;

      // Upsert user in Neon
      const rows = await sql`
        INSERT INTO users (email, name, avatar_url, provider, provider_account_id)
        VALUES (${user.email}, ${user.name}, ${user.image}, ${account.provider}, ${account.providerAccountId})
        ON CONFLICT (provider, provider_account_id) DO UPDATE SET
          email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = now()
        RETURNING id
      `;

      // Ensure profile exists
      if (rows[0]?.id) {
        await sql`
          INSERT INTO profiles (id, username, avatar_url)
          VALUES (${rows[0].id}, ${generateUsername()}, ${user.image})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        if (account.provider === "reviewer") {
          // authorize() returned the canonical user id — carry it over.
          token.userId = user?.id;
        } else {
          // First sign-in: look up user ID from our users table
          const rows = await sql`
            SELECT id FROM users
            WHERE provider = ${account.provider} AND provider_account_id = ${account.providerAccountId}
          `;
          token.userId = rows[0]?.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
