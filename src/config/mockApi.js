import { IS_DEMO_MODE, loadDemoStore, saveDemoStore, generateLocalId } from "./demo";

// Mock API that mirrors src/config/api.js surface for demo mode

export async function createCheckoutSession(params) {
  if (!IS_DEMO_MODE) throw new Error("Not in demo mode");
  const store = loadDemoStore();
  const id = generateLocalId("sess");

  store.sessions[id] = {
    id,
    status: "pending",
    created_at: new Date().toISOString(),
    params,
  };
  saveDemoStore(store);
  await delay(200);
  return id;
}

export async function confirmPayment(sessionId, cardToken, postalCode, fraudSessionId) {
  if (!IS_DEMO_MODE) throw new Error("Not in demo mode");
  const store = loadDemoStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("Session not found");

  const paymentId = generateLocalId("pay");
  const txId = generateLocalId("txn");
  const amountCents = Array.isArray(session.params?.line_items)
    ? session.params.line_items.reduce((sum, i) => sum + (Number(i.unit_amount) || 0), 0)
    : 0;

  store.payments[paymentId] = {
    id: paymentId,
    transaction_id: txId,
    amount_cents: amountCents,
    currency: "USD",
    status: "processing",
    method: "card",
    card_token: cardToken,
    postal_code: postalCode,
    fraud_session_id: fraudSessionId,
    created_at: new Date().toISOString(),
  };

  // Mark session as processing; completion happens via poll
  session.status = "processing";
  saveDemoStore(store);

  // Simulate processor completing after a short delay
  void completeAsync(sessionId, paymentId, txId);

  await delay(300);
  return store.payments[paymentId];
}

export async function getSession(sessionId) {
  if (!IS_DEMO_MODE) throw new Error("Not in demo mode");
  const store = loadDemoStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("Failed to load session");
  await delay(120);
  return session;
}

export async function pollUntilComplete(sessionId) {
  if (!IS_DEMO_MODE) throw new Error("Not in demo mode");
  for (;;) {
    const s = await getSession(sessionId);
    if (s?.status === "paid" || s?.status === "failed") return s.status;
    await delay(400);
  }
}

async function completeAsync(sessionId, paymentId, txId) {
  await delay(900);
  const store = loadDemoStore();
  const session = store.sessions[sessionId];
  const payment = store.payments[paymentId];
  if (!session || !payment) return;

  // 90% success, 10% fail for demo realism
  const success = Math.random() < 0.9;
  session.status = success ? "paid" : "failed";
  payment.status = success ? "succeeded" : "failed";

  // Record a transaction entry
  store.transactions.unshift({
    id: txId,
    amount_cents: payment.amount_cents,
    currency: "USD",
    method: "card",
    status: payment.status,
    created_at: new Date().toISOString(),
  });

  saveDemoStore(store);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


