// New minimal API utility for the Bogle Payment Portal

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://tstd5z72k1.execute-api.us-east-1.amazonaws.com";

export const generateIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `uuid_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export async function createCheckoutSession(
  params,
  customIdempotencyKey = null
) {
  const idempotencyKey = customIdempotencyKey || generateIdempotencyKey();

  const res = await fetch(`${API_BASE}/v1/checkout-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      ...params,
      idempotency_key: idempotencyKey, // Send to backend for any downstream operations
    }),
  });

  const data = await safeParse(res);
  if (!res.ok) {
    const err = new Error(
      data?.message ||
        data?.error ||
        res.statusText ||
        "Failed to create session"
    );
    err.code = (data && (data.code || data.error)) || String(res.status);
    err.status = res.status;
    err.details = data || null;
    throw err;
  }
  return data?.id;
}

export async function verifyAddressAndCard(
  cardToken,
  billingAddress,
  fraudSessionId,
  customIdempotencyKey = null
) {
  const idempotencyKey = customIdempotencyKey || generateIdempotencyKey();

  const res = await fetch(`${API_BASE}/v1/address-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      card_token: cardToken,
      billing_address: (() => {
        const addr = {
          line1: billingAddress.line1,
          city: billingAddress.city,
          region: billingAddress.state,
          postal_code: billingAddress.zipCode,
          country: "US",
        };
        // Only include line2 if it has a non-empty value
        if (billingAddress.line2 && billingAddress.line2.trim().length > 0) {
          addr.line2 = billingAddress.line2;
        }
        return addr;
      })(),
      fraud_session_id: fraudSessionId,
      idempotency_key: idempotencyKey,
    }),
  });

  const data = await safeParse(res);
  if (!res.ok) {
    const err = new Error(
      data?.message ||
        data?.error ||
        res.statusText ||
        "address_verification_failed"
    );
    err.code = (data && (data.code || data.error)) || String(res.status);
    err.status = res.status;
    err.details = data || null;
    throw err;
  }
  return data;
}

export async function confirmPayment(
  sessionId,
  cardToken,
  billingAddress,
  fraudSessionId,
  customIdempotencyKey = null
) {
  const idempotencyKey = customIdempotencyKey || generateIdempotencyKey();

  // Build billing address, omitting line2 if empty/null
  const billing_address = {
    line1: billingAddress.line1,
    city: billingAddress.city,
    region: billingAddress.state,
    postal_code: billingAddress.zipCode,
    country: "US",
  };

  // Only include line2 if it has a non-empty value
  if (billingAddress.line2 && billingAddress.line2.trim().length > 0) {
    billing_address.line2 = billingAddress.line2;
  }

  const payload = {
    session_id: sessionId,
    fraud_session_id: fraudSessionId,
    idempotency_key: idempotencyKey, // Send to backend for Finix calls
    payment_method: {
      type: "card",
      card_token: cardToken,
      billing_address,
    },
  };

  // Log the exact payload for debugging
  console.log("🔍 Payment Request Payload:", JSON.stringify(payload, null, 2));
  console.log("🔍 Payment Request Headers:", {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  });

  const res = await fetch(`${API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await safeParse(res);
  if (!res.ok) {
    console.error("❌ Payment API Error Response:", {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: data,
    });

    const err = new Error(
      data?.message || data?.error || res.statusText || "payment_failed"
    );
    err.code = (data && (data.code || data.error)) || String(res.status);
    err.status = res.status;
    err.details = data || null;
    throw err;
  }
  return data;
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE}/v1/checkout-sessions/${sessionId}`);
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

export async function pollUntilComplete(sessionId) {
  // Poll until session status is paid or failed
  // 2 second interval
  for (;;) {
    const s = await getSession(sessionId);
    if (s?.status === "paid" || s?.status === "failed") return s?.status;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function safeParse(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Optional Finix publishable key for client tokenization (if needed by UI)
// Finix tokenization configuration is handled via applicationId + environment
// (no client publishable key). See FinixTokenizationForm.
