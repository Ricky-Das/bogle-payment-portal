## Bogle Payment Portal

React + Vite frontend for card payments through Finix, backed by AWS API Gateway + Lambda. This repository contains the customer-facing UI and the client-side integrations with Finix tokenization and Bogle’s payment APIs.

### Highlights

- **React 18 + Vite + Tailwind** for a modern DX
- **Finix tokenization (Finix.js)** via hosted fields; client receives TK tokens
- **Hardened API client** with idempotency keys and robust error handling
- **Diagnostics banner** to flag missing env vars in development
- **Smoke test page** to validate configuration and connectivity

Note: ACH and bank-link flows are currently disabled in the UI. Focus is card payments.

## Architecture at a glance

- **Frontend**: React SPA (Vite), calls Bogle APIs
  - Tokenizes card details in-browser via Finix Hosted Fields (TK tokens)
  - Calls Bogle’s Lambda APIs to create sessions and confirm payments
- **Backend (external to this repo)**: AWS API Gateway + Lambda (create session, get session, confirm payment, webhook ingress)

Key frontend files:

- `src/components/CreditCardForm.jsx` – orchestrates the payment flow
- `src/components/FinixTokenizationForm.jsx` – loads Finix SDK and hosted fields; returns TK tokens
- `src/config/api.js` – API client with idempotency headers and polling
- `src/components/DiagnosticsBanner.jsx` – dev-only env checker
- `src/pages/SmokeTestPage.jsx` – end-to-end config sanity checks

Routes:

- `/payment-method` – main payment page (card)
- `/confirmation` – success page with payment summary
- `/smoke-test` – dev-only utilities/tests

## Environment configuration

Create `.env.local` in the project root:

```env
# Bogle API base (AWS API Gateway stage base URL)
VITE_API_BASE=https://tstd5z72k1.execute-api.us-east-1.amazonaws.com

# Finix tokenization and fraud detection
VITE_FINIX_APPLICATION_ID=APchtKYW94eNhmDAQtRqpNZy
VITE_FINIX_MERCHANT_ID=MUxhidZSQ4Je4wi8u1687sMN
VITE_FINIX_ENVIRONMENT=sandbox
VITE_FINIX_SDK_URL=https://js.finixpayments.com/v1/finix.js

# Optional – if your Finix SDK exposes fraud capabilities, this may be unused
# VITE_FINIX_FRAUD_SDK_URL= (usually not required; fraud is often in main SDK)
```

Diagnostics:

- In development, a banner shows if required variables are missing.
- To reduce console noise, unset `VITE_FINIX_FRAUD_SDK_URL` if you don't have a separate fraud script.

**Required environment variables:**

- `VITE_FINIX_APPLICATION_ID`: Your Finix Application ID for tokenization
- `VITE_FINIX_MERCHANT_ID`: Your Finix ID for fraud detection and address verification
- `VITE_FINIX_ENVIRONMENT`: Either "sandbox" or "live"
- `VITE_FINIX_SDK_URL`: URL to the Finix JavaScript SDK (usually https://js.finix.com/v/1/finix.js)

## Running locally

```bash
npm install
npm run dev
# http://localhost:5173
```

You can also access the smoke test at `/smoke-test` (visible only in development) to validate:

- Environment variables
- API connectivity
- Finix hosted fields/tokenization presence

## Payment flow (frontend)

1. Create checkout session

```js
const sessionId = await createCheckoutSession({
  line_items: [
    { name: "Product", quantity: 1, unit_amount: 1000, currency: "USD" },
  ],
  success_url: `${window.location.origin}/confirmation`,
  cancel_url: `${window.location.origin}/payment-method`,
  customer: { email: "customer@example.com", name: "Customer Name" },
});
```

2. Tokenize card (Finix Hosted Fields)

```js
const cardToken = await tokenizationRef.current.tokenize();
// cardToken.id is the TK token required by the backend
```

3. Verify address and confirm payment

```js
// Optional: Address verification (performed automatically in payment flow)
const avsResult = await verifyAddressAndCard(
  cardToken.id,
  billingAddress,
  fraudSessionId
);

// Confirm payment
const payment = await confirmPayment(
  sessionId,
  cardToken.id,
  billingAddress, // full billing address for AVS
  fraudSessionId // fraud session ID from Finix Auth
);
```

4. Poll for completion

```js
const finalStatus = await pollUntilComplete(sessionId);
if (finalStatus === "paid") {
  // navigate to /confirmation
}
```

## API client details (`src/config/api.js`)

- `API_BASE`: from `VITE_API_BASE` with default to the current AWS URL
- `createCheckoutSession(params)`
  - Sends `Idempotency-Key` header
  - Returns `sessionId`
- `confirmPayment(sessionId, cardToken, postalCode, fraudSessionId)`
  - Sends `Idempotency-Key` header
  - Body shape matches the Lambda: `{ session_id, fraud_session_id, payment_method: { type: 'card', card_token, billing_postal_code } }`
- `pollUntilComplete(sessionId)`
  - Polls `/v1/checkout-sessions/:id` until status is `paid` or `failed`

## Components

- `CreditCardForm.jsx`

  - Loads hosted fields, validates ZIP, orchestrates session → tokenize → confirm → poll
  - User-friendly error mapping and disabled states

- `FinixTokenizationForm.jsx`

  - Loads Finix SDK from `VITE_FINIX_SDK_URL`
  - Initializes card hosted fields and returns a normalized token object `{ id: 'TK...', brand, last_four }`
  - Attempts common submit signatures; dev-only stub token if SDK missing (never in production)
  - Fraud support: If exposed by the loaded SDK, initializes and returns a session id via `getFraudSessionId()`; otherwise silently proceeds

- `DiagnosticsBanner.jsx`

  - Dev-only banner listing missing required/optional env vars

- `SmokeTestPage.jsx`
  - Quick checks for envs, session creation, API connectivity, and tokenization presence

## Test data (Finix sandbox)

Use these in hosted fields:

```
Visa (success):      4895142232120006
Mastercard (success): 5555555555554444
Declined:            4000000000000002
Expired:             4000000000000069

Expiry: any future (e.g., 12/2025)
CVV:    any 3–4 digits (e.g., 123)
ZIP:    94105 (any valid US ZIP)
```

## Troubleshooting

- **Finix SDK not loading**

  - Check `VITE_FINIX_SDK_URL`
  - Inspect network tab for script errors
  - Verify global `window.Finix` exists

- **Tokenization errors**

  - Ensure Finix hosted fields are visible and ready
  - We accept `TK` tokens in multiple response shapes; check console for normalization logs

- **Fraud session missing**

  - Informational only; fraud capabilities may not be present in your SDK build
  - When available, code auto-initializes and adds `fraud_session_id`

- **API errors**
  - Check `VITE_API_BASE`
  - See console for structured error details from `confirmPayment`

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview build locally
- `./start-dev.sh` – optional helper to start with the mock/dev server
- `./check_status.sh` – infra health check (external)

## Notes for production

- Set `VITE_FINIX_ENVIRONMENT=production` and use your live `VITE_FINIX_APPLICATION_ID`
- Ensure `VITE_API_BASE` points to the production API Gateway
- Do not rely on dev tokenization fallback; Finix SDK must be present

## License

MIT
