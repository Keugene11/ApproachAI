import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// DELETE — Delete all user data from all tables
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Cancel any active Stripe subscriptions before deleting data
  try {
    const subs = await sql`
      SELECT stripe_customer_id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
    `;
    if (subs.length > 0 && subs[0].stripe_customer_id) {
      const stripe = getStripe();
      const activeStripe = await stripe.subscriptions.list({
        customer: subs[0].stripe_customer_id,
        status: "active",
      });
      for (const sub of activeStripe.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch (e) {
    console.error("Failed to cancel Stripe subscription during account deletion:", e);
    // Continue with deletion even if Stripe cancellation fails
  }

  // Delete in dependency order (children before parents)
  await sql`DELETE FROM reports WHERE reporter_id = ${userId}`;
  await sql`DELETE FROM blocked_users WHERE blocker_id = ${userId} OR blocked_id = ${userId}`;
  await sql`DELETE FROM comments WHERE user_id = ${userId}`;
  await sql`DELETE FROM votes WHERE user_id = ${userId}`;
  await sql`DELETE FROM posts WHERE user_id = ${userId}`;
  await sql`DELETE FROM checkins WHERE user_id = ${userId}`;
  await sql`DELETE FROM messages WHERE user_id = ${userId}`;
  await sql`DELETE FROM conversations WHERE user_id = ${userId}`;
  await sql`DELETE FROM usage WHERE user_id = ${userId}`;
  await sql`DELETE FROM subscriptions WHERE user_id = ${userId}`;
  await sql`DELETE FROM user_badges WHERE user_id = ${userId}`;
  await sql`DELETE FROM profiles WHERE id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ ok: true });
}
