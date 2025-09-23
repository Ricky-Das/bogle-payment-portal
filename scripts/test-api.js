/*
  Minimal flow test script for new API.
  Usage:
    API_BASE=https://tstd5z72k1.execute-api.us-east-1.amazonaws.com node scripts/test-api.js
*/

const API_BASE =
  process.env.API_BASE ||
  "https://tstd5z72k1.execute-api.us-east-1.amazonaws.com";

async function main() {
  if (typeof fetch !== "function") {
    console.error("This script requires Node.js 18+ with global fetch.");
    process.exit(1);
  }

  try {
    // 1) Create checkout session
    const createRes = await fetch(`${API_BASE}/v1/checkout-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_items: [
          { name: "Test Item", quantity: 1, unit_amount: 123, currency: "USD" },
        ],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        customer: { email: "user@example.com", name: "User Name" },
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok)
      throw new Error(created?.error || "Failed to create session");

    // 2) Confirm payment (requires real Finix token to succeed)
    const idempotencyKey =
      globalThis.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `uuid_${Date.now()}`;
    const payRes = await fetch(`${API_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        session_id: created.id,
        payment_method: {
          type: "card",
          card_token: "pi_dummy",
          billing_postal_code: "94107",
        },
      }),
    });
    const pay = await payRes.text();
    console.log("Payments response status:", payRes.status, payRes.statusText);
    console.log("Payments response body:", pay);
  } catch (err) {
    console.error("Minimal flow failed:", err.message || err);
    process.exit(2);
  }
}

main();
