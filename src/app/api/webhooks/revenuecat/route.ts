import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * RevenueCat webhook handler.
 * Syncs Apple IAP subscription status to the subscriptions table.
 *
 * Configure in RevenueCat dashboard:
 *   URL: https://wingmate.live/api/webhooks/revenuecat
 *   Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 */
export async function POST(request: NextRequest) {
  // Verify webhook authorization
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = body.event;

  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  const appUserId = event.app_user_id;
  // RevenueCat app_user_id should be set to Supabase user ID via logIn()
  if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
    // Anonymous user — can't link to Supabase
    return NextResponse.json({ received: true });
  }

  const supabase = getAdminClient();

  // Map RevenueCat event types to subscription status
  const eventType = event.type as string;
  let status: string;

  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      status = "active";
      break;
    case "CANCELLATION":
    case "EXPIRATION":
      status = "canceled";
      break;
    case "BILLING_ISSUE":
      status = "past_due";
      break;
    default:
      // Other events (PRODUCT_CHANGE, SUBSCRIBER_ALIAS, etc.)
      return NextResponse.json({ received: true });
  }

  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;
  const purchaseDate = event.purchased_at_ms
    ? new Date(event.purchased_at_ms).toISOString()
    : null;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: appUserId,
      stripe_customer_id: `rc_${appUserId}`,
      stripe_subscription_id: `rc_${event.original_transaction_id || event.transaction_id || "unknown"}`,
      status,
      price_id: event.product_id || null,
      current_period_start: purchaseDate,
      current_period_end: expirationDate,
      cancel_at_period_end: eventType === "CANCELLATION",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("RevenueCat webhook upsert error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
