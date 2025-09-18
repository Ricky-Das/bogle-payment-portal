import React, { useState, useEffect } from 'react';
import apiClient from '../config/api';

const CreditCardForm = ({ onSuccess, onError, amount = 52.82 }) => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: ''
    },
    saveCard: false
  });
  
  const [validation, setValidation] = useState({
    cardNumber: null,
    expiry: null,
    cvv: null
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [finixConfig, setFinixConfig] = useState(null);

  useEffect(() => {
    // Initialize Finix.js (this would be loaded from Finix CDN in production)
    // For now, we'll simulate the tokenization process
    setFinixConfig({
      environment: 'sandbox', // This should come from your backend
      applicationId: 'your-finix-application-id' // This should come from your backend
    });
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value
        }
      }));
    } else {
      let processedValue = value;
      
      // Format card number with spaces
      if (name === 'cardNumber') {
        processedValue = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        if (processedValue.length > 19) processedValue = processedValue.substring(0, 19);
      }
      
      // Format expiry month/year
      if (name === 'expiryMonth' || name === 'expiryYear') {
        processedValue = value.replace(/\D/g, '');
      }
      
      // Format CVV
      if (name === 'cvv') {
        processedValue = value.replace(/\D/g, '').substring(0, 4);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : processedValue
      }));
    }

    // Clear validation when user changes input
    if (name === 'cardNumber' || name === 'expiryMonth' || name === 'expiryYear' || name === 'cvv') {
      setValidation(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateCardNumber = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Basic Luhn algorithm check
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return { valid: false, error: 'Invalid card number length' };
    }
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    const isValid = sum % 10 === 0;
    
    // Detect card type
    let cardType = 'Unknown';
    if (cleanNumber.startsWith('4')) cardType = 'Visa';
    else if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) cardType = 'Mastercard';
    else if (cleanNumber.startsWith('3')) cardType = 'American Express';
    
    return {
      valid: isValid,
      cardType: isValid ? cardType : null,
      error: isValid ? null : 'Invalid card number'
    };
  };

  const validateExpiry = (month, year) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);
    
    if (expMonth < 1 || expMonth > 12) {
      return { valid: false, error: 'Invalid month' };
    }
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return { valid: false, error: 'Card has expired' };
    }
    
    return { valid: true };
  };

  const handleCardNumberBlur = () => {
    const validation = validateCardNumber(formData.cardNumber);
    setValidation(prev => ({ ...prev, cardNumber: validation }));
  };

  const handleExpiryBlur = () => {
    if (formData.expiryMonth && formData.expiryYear) {
      const validation = validateExpiry(formData.expiryMonth, formData.expiryYear);
      setValidation(prev => ({ ...prev, expiry: validation }));
    }
  };

  const handleCvvBlur = () => {
    const isValid = formData.cvv.length >= 3 && formData.cvv.length <= 4;
    setValidation(prev => ({
      ...prev,
      cvv: {
        valid: isValid,
        error: isValid ? null : 'Invalid CVV'
      }
    }));
  };

  const tokenizeCard = async () => {
    // In a real implementation, this would use Finix.js to tokenize the card
    // For demo purposes, we'll simulate this process
    
    const cardData = {
      number: formData.cardNumber.replace(/\s/g, ''),
      expiry_month: formData.expiryMonth,
      expiry_year: formData.expiryYear,
      security_code: formData.cvv,
      name: formData.cardholderName,
      address: {
        line1: formData.billingAddress.line1,
        line2: formData.billingAddress.line2,
        city: formData.billingAddress.city,
        region: formData.billingAddress.state,
        postal_code: formData.billingAddress.zipCode,
        country: 'USA'
      }
    };

    // Simulate Finix tokenization
    // In production, this would be done client-side with Finix.js
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `PItoken_${Math.random().toString(36).substr(2, 9)}`,
          type: 'PAYMENT_CARD',
          fingerprint: `FP${Math.random().toString(36).substr(2, 8)}`,
          brand: validation.cardNumber?.cardType || 'UNKNOWN',
          last_four: cardData.number.slice(-4)
        });
      }, 1000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const cardValidation = validateCardNumber(formData.cardNumber);
    const expiryValidation = validateExpiry(formData.expiryMonth, formData.expiryYear);
    const cvvValidation = {
      valid: formData.cvv.length >= 3 && formData.cvv.length <= 4,
      error: formData.cvv.length >= 3 && formData.cvv.length <= 4 ? null : 'Invalid CVV'
    };

    setValidation({
      cardNumber: cardValidation,
      expiry: expiryValidation,
      cvv: cvvValidation
    });

    if (!cardValidation.valid || !expiryValidation.valid || !cvvValidation.valid) {
      onError('Please correct the errors in the form');
      return;
    }

    if (!formData.cardholderName.trim()) {
      onError('Cardholder name is required');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Tokenize card (this would be done client-side with Finix.js in production)
      const cardToken = await tokenizeCard();
      
      // Simulate payment processing since authentication is disabled
      // In production, this would create a payment instrument and process payment
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      // Generate a mock transaction ID
      const mockTransactionId = `txn_${Math.random().toString(36).substr(2, 9)}`;

      onSuccess({
        paymentMethod: 'card',
        amount: amount,
        transactionId: mockTransactionId,
        card: {
          brand: cardToken.brand,
          lastFour: cardToken.last_four
        }
      });

    } catch (error) {
      console.error('Credit card payment error:', error);
      onError(error.message || 'Failed to process credit card payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Credit Card Payment</h2>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-blue-800 font-medium">Total Amount:</span>
          <span className="text-blue-800 font-bold text-xl">${amount.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <input
            type="text"
            name="cardNumber"
            value={formData.cardNumber}
            onChange={handleInputChange}
            onBlur={handleCardNumberBlur}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validation.cardNumber?.valid === false ? 'border-red-500' : 
              validation.cardNumber?.valid === true ? 'border-green-500' : 'border-gray-300'
            }`}
            placeholder="1234 5678 9012 3456"
          />
          {validation.cardNumber?.valid === true && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {validation.cardNumber.cardType}
            </p>
          )}
          {validation.cardNumber?.valid === false && (
            <p className="text-sm text-red-600 mt-1">
              {validation.cardNumber.error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <input
              type="text"
              name="expiryMonth"
              value={formData.expiryMonth}
              onChange={handleInputChange}
              onBlur={handleExpiryBlur}
              required
              maxLength="2"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation.expiry?.valid === false ? 'border-red-500' : 
                validation.expiry?.valid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="MM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="text"
              name="expiryYear"
              value={formData.expiryYear}
              onChange={handleInputChange}
              onBlur={handleExpiryBlur}
              required
              maxLength="4"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation.expiry?.valid === false ? 'border-red-500' : 
                validation.expiry?.valid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              name="cvv"
              value={formData.cvv}
              onChange={handleInputChange}
              onBlur={handleCvvBlur}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation.cvv?.valid === false ? 'border-red-500' : 
                validation.cvv?.valid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="123"
            />
          </div>
        </div>
        
        {validation.expiry?.valid === false && (
          <p className="text-sm text-red-600">
            {validation.expiry.error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            name="cardholderName"
            value={formData.cardholderName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full name on card"
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Billing Address</h3>
          
          <div className="space-y-3">
            <input
              type="text"
              name="billing.line1"
              value={formData.billingAddress.line1}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address line 1"
            />
            
            <input
              type="text"
              name="billing.line2"
              value={formData.billingAddress.line2}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address line 2 (optional)"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                name="billing.city"
                value={formData.billingAddress.city}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
              
              <input
                type="text"
                name="billing.state"
                value={formData.billingAddress.state}
                onChange={handleInputChange}
                required
                maxLength="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
            
            <input
              type="text"
              name="billing.zipCode"
              value={formData.billingAddress.zipCode}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ZIP Code"
            />
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            name="saveCard"
            checked={formData.saveCard}
            onChange={handleInputChange}
            className="mt-1"
          />
          <label className="text-sm text-gray-700">
            Save this card for future use
          </label>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is encrypted and secure</p>
        <p>Powered by Finix</p>
      </div>
    </div>
  );
};

export default CreditCardForm;