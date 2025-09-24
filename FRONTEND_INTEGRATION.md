# Bogle Payment Portal - Frontend Integration Guide

## Overview

This document provides comprehensive instructions for integrating with the Bogle Payment Portal frontend, including Finix payment processing setup, environment configuration, and testing procedures.

## Environment Setup

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
VITE_API_BASE=https://tstd5z72k1.execute-api.us-east-1.amazonaws.com

# Finix Payment Processing (Required)
VITE_FINIX_APPLICATION_ID=APchtKYW94eNhmDAQtRqpNZy
VITE_FINIX_ENVIRONMENT=sandbox
VITE_FINIX_SDK_URL=https://js.finixpayments.com/v1/finix.js

# Optional: Enhanced Fraud Detection
VITE_FINIX_FRAUD_SDK_URL=https://js.finixpayments.com/v1/fraud.js
```

### Environment Notes

- **Development**: Use `sandbox` environment with test credentials
- **Production**: Use `production` environment with live credentials
- **Diagnostics**: Missing variables will show a warning banner in development mode

## Payment Flow Architecture

### 1. Session Creation

```javascript
// Creates a checkout session with line items and customer info
const sessionId = await createCheckoutSession({
  line_items: [
    {
      name: "Product Name",
      quantity: 1,
      unit_amount: 1000, // $10.00 in cents
      currency: "USD",
    },
  ],
  success_url: `${window.location.origin}/confirmation`,
  cancel_url: `${window.location.origin}/payment-method`,
  customer: {
    email: "customer@example.com",
    name: "Customer Name",
  },
});
```

### 2. Card Tokenization

```javascript
// Finix Hosted Fields handle secure card data collection
const cardToken = await tokenizeCard(); // Returns { id: "TK_...", brand: "VISA", last_four: "4242" }
```

### 3. Payment Confirmation

```javascript
// Submit payment with tokenized card and billing info
const payment = await confirmPayment(
  sessionId,
  cardToken.id,
  billingZip,
  fraudSessionId
);
```

### 4. Status Polling

```javascript
// Poll until payment completes
const finalStatus = await pollUntilComplete(sessionId);
if (finalStatus === "paid") {
  // Success - redirect to confirmation
}
```

## Finix Integration Details

### Card Tokenization Setup

The `FinixTokenizationForm` component handles secure card data collection:

```jsx
<FinixTokenizationForm
  ref={tokenizationRef}
  onReady={() => setFinixReady(true)}
/>
```

Key features:

- **Hosted Fields**: Card data never touches your servers
- **PCI Compliance**: Finix handles all sensitive data
- **Validation**: Real-time card validation and formatting
- **Token Format**: Returns `TK_` prefixed tokens for backend processing

### Fraud Detection (Optional)

If fraud SDK is configured, fraud session IDs are automatically collected:

```javascript
const fraudSessionId = tokenizationRef.current.getFraudSessionId();
// Sent to backend for enhanced risk assessment
```

### Error Handling

The frontend includes comprehensive error handling:

- **Network Errors**: Retry suggestions and user-friendly messages
- **Validation Errors**: Real-time field validation with helpful hints
- **Payment Errors**: Specific messages for declined cards, invalid data, etc.
- **Timeout Handling**: Graceful handling of slow network conditions

## Test Card Data

### Finix Test Cards (Sandbox Environment)

Use these test card numbers for development:

```
Success Cases:
• 4895142232120006 (Visa) - Successful payment
• 5555555555554444 (Mastercard) - Successful payment

Decline Cases:
• 4000000000000002 (Visa) - Card declined
• 4000000000000069 (Visa) - Expired card

Test Details:
• Expiry: Any future date (e.g., 12/2025)
• CVV: Any 3-4 digits (e.g., 123)
• ZIP: Any valid US ZIP (e.g., 94105)
```

### Test Flow

1. Navigate to `/payment-method`
2. Enter test card details in hosted fields
3. Fill billing address with valid ZIP code
4. Submit payment
5. Verify success on `/confirmation`

## API Integration

### Endpoints

All API calls go through the configured `VITE_API_BASE`:

```
POST /v1/checkout-sessions     - Create payment session
GET  /v1/checkout-sessions/:id - Retrieve session details
POST /v1/payments              - Confirm payment
POST /v1/webhooks/processor    - Webhook ingress
```

### Authentication

- **Idempotency Keys**: Automatically generated for create operations
- **CORS**: Configured for frontend domain access
- **Rate Limiting**: Built into Lambda functions

### Error Responses

API returns standardized error format:

```json
{
  "error": "validation_error",
  "message": "Invalid payment request",
  "details": {
    "field": "card_token",
    "code": "invalid_format"
  }
}
```

## Development Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173
```

### 2. Environment Validation

The app includes a diagnostics banner that shows:

- Missing required environment variables
- Missing optional configurations
- Quick fix suggestions

### 3. Testing Checklist

- [ ] Environment variables configured
- [ ] Finix SDK loads successfully
- [ ] Test cards process correctly
- [ ] Error states display properly
- [ ] Success flow completes to confirmation
- [ ] ZIP code validation works
- [ ] Responsive design on mobile

## Production Deployment

### Pre-deployment Checklist

- [ ] Update `VITE_FINIX_ENVIRONMENT` to `production`
- [ ] Configure production Finix credentials
- [ ] Update `VITE_API_BASE` to production endpoint
- [ ] Test with real payment processor
- [ ] Verify SSL/TLS certificates
- [ ] Test error handling edge cases

### Security Considerations

- **Card Data**: Never stored or logged client-side
- **Token Handling**: Tokens are single-use and expire quickly
- **Environment Variables**: Production secrets properly secured
- **HTTPS**: Required for all payment operations
- **CSP**: Content Security Policy configured for Finix SDK

## Troubleshooting

### Common Issues

**Finix SDK not loading:**

- Check `VITE_FINIX_SDK_URL` is correct
- Verify network connectivity
- Check browser console for script errors

**Tokenization failing:**

- Ensure `VITE_FINIX_APPLICATION_ID` is correct
- Verify environment matches credentials
- Check card data format and validation

**API connection issues:**

- Verify `VITE_API_BASE` is reachable
- Check CORS configuration
- Validate API key permissions

**Payment failures:**

- Use test cards in sandbox environment
- Check ZIP code format and validation
- Verify backend Lambda logs for details

### Debug Mode

Set localStorage for additional logging:

```javascript
localStorage.setItem("bogle_debug", "true");
```

This enables:

- Detailed payment flow logging
- API request/response details
- Finix SDK interaction traces

## Support

For technical issues:

- Check browser console for errors
- Review network tab for failed requests
- Verify environment configuration
- Contact development team with specific error messages

For payment processing issues:

- Check Finix dashboard for transaction details
- Review backend Lambda logs
- Verify webhook delivery status
