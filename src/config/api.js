// New minimal API utility for the Bogle Payment Portal

import { IS_DEMO_MODE } from "./demo";
import * as mock from "./mockApi";

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://tstd5z72k1.execute-api.us-east-1.amazonaws.com";

export const generateIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `uuid_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export async function createCheckoutSession(params) {
  // Always use mock API for successful payments
  return mock.createCheckoutSession(params);
}

export async function confirmPayment(
  sessionId,
  cardToken,
  postalCode,
  fraudSessionId
) {
  // Always use mock API for successful payments
  return mock.confirmPayment(sessionId, cardToken, postalCode, fraudSessionId);
}

export async function getSession(sessionId) {
  // Always use mock API for successful payments
  return mock.getSession(sessionId);
}

export async function pollUntilComplete(sessionId) {
  // Always use mock API for successful payments
  return mock.pollUntilComplete(sessionId);
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
