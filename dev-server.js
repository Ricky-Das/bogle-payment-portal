#!/usr/bin/env node
/**
 * Simple mock API server for local development
 * This allows you to develop the frontend without deploying AWS infrastructure
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock responses
const mockResponses = {
  // Health check
  '/health': { status: 'ok', timestamp: new Date().toISOString() },
  
  // Auth responses
  '/auth/signin': { message: 'SMS sent', sessionId: 'mock-session-123' },
  '/auth/verify-phone': { message: 'Phone verified', requiresPassword: false },
  '/auth/verify-sms': { 
    accessToken: 'mock-access-token', 
    refreshToken: 'mock-refresh-token',
    user: { id: 'user-123', phone: '+1234567890' }
  },
  '/auth/me': { id: 'user-123', phone: '+1234567890', verified: true },
  
  // Payment responses
  '/payments/validate-bank-account': { 
    valid: true, 
    bankName: 'Mock Bank', 
    routingNumber: '021000021' 
  },
  '/payments/create-identity': { 
    identityId: 'mock-identity-123',
    status: 'VERIFIED',
    verification_status: 'APPROVED'
  },
  '/payments/create-payment-instrument': { instrumentId: 'mock-instrument-123' },
  '/payments/process-payment': { 
    transactionId: 'mock-transaction-123', 
    status: 'pending',
    amount: 100.00
  },
  
  // Plaid responses
  '/plaid/create-link-token': { linkToken: 'mock-link-token-123' },
  '/plaid/exchange-public-token': { accessToken: 'mock-plaid-access-token' },
  '/plaid/get-accounts': {
    accounts: [
      {
        id: 'account-123',
        name: 'Mock Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '0000'
      }
    ]
  }
};

// Generic handler for all routes
app.all('*', (req, res) => {
  const path = req.path;
  
  console.log(`${req.method} ${path}`, req.body || '');
  
  // Check if we have a mock response
  if (mockResponses[path]) {
    return res.json(mockResponses[path]);
  }
  
  // Handle transaction lookup with ID
  if (path.startsWith('/payments/transaction/')) {
    const transactionId = path.split('/').pop();
    return res.json({
      id: transactionId,
      status: 'completed',
      amount: 100.00,
      description: 'Mock payment',
      createdAt: new Date().toISOString()
    });
  }
  
  // Default response for unknown endpoints
  res.status(404).json({ 
    error: 'Endpoint not found in mock server',
    path,
    method: req.method,
    availableEndpoints: Object.keys(mockResponses)
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  Object.keys(mockResponses).forEach(endpoint => {
    console.log(`   http://localhost:${PORT}${endpoint}`);
  });
  console.log(`\n💡 To use this mock server, update your .env file:`);
  console.log(`   VITE_API_URL=http://localhost:${PORT}`);
});