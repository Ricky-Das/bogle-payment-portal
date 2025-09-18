// API configuration for Bogle Payment Portal

const API_CONFIG = {
  // This will be set by your deployment process
  BASE_URL: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'http://localhost:3001',

  // API endpoints
  ENDPOINTS: {
    // Authentication
    SIGNIN: '/auth/signin',
    VERIFY_PHONE: '/auth/verify-phone',
    VERIFY_SMS: '/auth/verify-sms',
    REFRESH_TOKEN: '/auth/refresh',
    GET_USER: '/auth/me',

    // Bank account validation (without Plaid)
    VALIDATE_BANK_ACCOUNT: '/payments/validate-bank-account',

    // Plaid integration
    PLAID_CREATE_LINK_TOKEN: '/plaid/create-link-token',
    PLAID_EXCHANGE_PUBLIC_TOKEN: '/plaid/exchange-public-token',
    PLAID_GET_ACCOUNTS: '/plaid/get-accounts',

    // Payment processing
    CREATE_IDENTITY: '/payments/create-identity',
    CREATE_PAYMENT_INSTRUMENT: '/payments/create-payment-instrument',
    PROCESS_PAYMENT: '/payments/process-payment',
    GET_TRANSACTION: '/payments/transaction',
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Retry configuration
  RETRY: {
    attempts: 3,
    delay: 1000, // Base delay in ms
    backoff: 2   // Exponential backoff multiplier
  }
};

// API client class with authentication and error handling
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Get stored auth token
  getAuthToken() {
    return localStorage.getItem('accessToken');
  }

  // Set auth token
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Set refresh token
  setRefreshToken(token) {
    if (token) {
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }

  // Clear all tokens
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Make HTTP request with retry logic
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      timeout: this.timeout,
    };

    const requestOptions = { ...defaultOptions, ...options };

    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.RETRY.attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle 401 - try to refresh token
        if (response.status === 401 && token && attempt === 1) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry with new token
            requestOptions.headers.Authorization = `Bearer ${this.getAuthToken()}`;
            continue;
          } else {
            // Refresh failed, clear tokens and throw error
            this.clearTokens();
            throw new Error('Authentication failed');
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === API_CONFIG.RETRY.attempts) {
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = API_CONFIG.RETRY.delay * Math.pow(API_CONFIG.RETRY.backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthToken(data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // Authentication methods
  async signIn(phone) {
    return this.request(API_CONFIG.ENDPOINTS.SIGNIN, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyPhone(phone) {
    return this.request(API_CONFIG.ENDPOINTS.VERIFY_PHONE, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifySms(phone, code, password = null) {
    return this.request(API_CONFIG.ENDPOINTS.VERIFY_SMS, {
      method: 'POST',
      body: JSON.stringify({ phone, code, password }),
    });
  }

  async getCurrentUser() {
    return this.request(API_CONFIG.ENDPOINTS.GET_USER);
  }

  // Bank account validation methods
  async validateBankAccount(routingNumber) {
    return this.request(API_CONFIG.ENDPOINTS.VALIDATE_BANK_ACCOUNT, {
      method: 'POST',
      body: JSON.stringify({ routingNumber }),
    });
  }

  // Plaid methods
  async createPlaidLinkToken(userId) {
    return this.request(API_CONFIG.ENDPOINTS.PLAID_CREATE_LINK_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async exchangePlaidPublicToken(publicToken, userId, metadata) {
    return this.request(API_CONFIG.ENDPOINTS.PLAID_EXCHANGE_PUBLIC_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ publicToken, userId, metadata }),
    });
  }

  async getPlaidAccounts(userId) {
    return this.request(API_CONFIG.ENDPOINTS.PLAID_GET_ACCOUNTS, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Payment methods
  async createIdentity(userId, personalInfo) {
    return this.request(API_CONFIG.ENDPOINTS.CREATE_IDENTITY, {
      method: 'POST',
      body: JSON.stringify({ userId, personalInfo }),
    });
  }

  async createPaymentInstrument(userId, paymentMethod, cardToken = null, bankAccount = null) {
    return this.request(API_CONFIG.ENDPOINTS.CREATE_PAYMENT_INSTRUMENT, {
      method: 'POST',
      body: JSON.stringify({ userId, paymentMethod, cardToken, bankAccount }),
    });
  }

  async processPayment(userId, paymentInstrumentId, amount, description) {
    return this.request(API_CONFIG.ENDPOINTS.PROCESS_PAYMENT, {
      method: 'POST',
      body: JSON.stringify({ userId, paymentInstrumentId, amount, description }),
    });
  }

  async getTransaction(transactionId) {
    return this.request(`${API_CONFIG.ENDPOINTS.GET_TRANSACTION}/${transactionId}`);
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { API_CONFIG };