import React, { useState } from 'react';
import apiClient from '../config/api';

const DirectAchPaymentForm = ({ onSuccess, onError, amount = 52.82 }) => {
  const [formData, setFormData] = useState({
    accountName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    consent: false,
    savePayment: false
  });
  
  const [validation, setValidation] = useState({
    routingNumber: null,
    accountNumber: null
  });
  
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear validation when user changes input
    if (name === 'routingNumber' || name === 'accountNumber') {
      setValidation(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateRoutingNumber = async (routingNumber) => {
    if (!/^\d{9}$/.test(routingNumber)) {
      setValidation(prev => ({
        ...prev,
        routingNumber: { valid: false, error: 'Routing number must be 9 digits' }
      }));
      return;
    }

    setIsValidating(true);
    try {
      const result = await apiClient.validateBankAccount(routingNumber);
      setValidation(prev => ({
        ...prev,
        routingNumber: result
      }));
    } catch (error) {
      setValidation(prev => ({
        ...prev,
        routingNumber: { valid: false, error: 'Unable to validate routing number' }
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleRoutingNumberBlur = () => {
    if (formData.routingNumber.length === 9) {
      validateRoutingNumber(formData.routingNumber);
    }
  };

  const validateAccountNumber = () => {
    const { accountNumber, confirmAccountNumber } = formData;
    
    if (accountNumber.length < 4 || accountNumber.length > 17) {
      setValidation(prev => ({
        ...prev,
        accountNumber: { valid: false, error: 'Account number must be 4-17 digits' }
      }));
      return false;
    }

    if (accountNumber !== confirmAccountNumber) {
      setValidation(prev => ({
        ...prev,
        accountNumber: { valid: false, error: 'Account numbers do not match' }
      }));
      return false;
    }

    setValidation(prev => ({
      ...prev,
      accountNumber: { valid: true }
    }));
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.consent) {
      onError('You must agree to the ACH authorization');
      return;
    }

    // Validate all fields
    const isAccountValid = validateAccountNumber();
    const isRoutingValid = validation.routingNumber?.valid;

    if (!isAccountValid || !isRoutingValid) {
      onError('Please correct the errors in the form');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get current user
      const user = await apiClient.getCurrentUser();
      
      // Create payment instrument
      const bankAccount = {
        account_name: formData.accountName,
        account_number: formData.accountNumber,
        routing_number: formData.routingNumber,
        account_type: formData.accountType
      };

      const paymentInstrument = await apiClient.createPaymentInstrument(
        user.user.id,
        'ach',
        null, // no card token
        bankAccount
      );

      // Process payment
      const payment = await apiClient.processPayment(
        user.user.id,
        paymentInstrument.payment_instrument_id,
        amount,
        'Bogle Payment Portal - ACH Payment'
      );

      onSuccess({
        paymentMethod: 'ach',
        amount: amount,
        transactionId: payment.transaction_id,
        bankAccount: {
          name: formData.accountName,
          lastFour: formData.accountNumber.slice(-4),
          accountType: formData.accountType
        }
      });

    } catch (error) {
      console.error('ACH payment error:', error);
      onError(error.message || 'Failed to process ACH payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">ACH Bank Payment</h2>
      
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-green-800 font-medium">Total Amount:</span>
          <span className="text-green-800 font-bold text-xl">${amount.toFixed(2)}</span>
        </div>
        <p className="text-green-600 text-sm mt-1">Includes 2% ACH discount</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Holder Name
          </label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full name on account"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Routing Number
          </label>
          <input
            type="text"
            name="routingNumber"
            value={formData.routingNumber}
            onChange={handleInputChange}
            onBlur={handleRoutingNumberBlur}
            required
            maxLength="9"
            pattern="\d{9}"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validation.routingNumber?.valid === false ? 'border-red-500' : 
              validation.routingNumber?.valid === true ? 'border-green-500' : 'border-gray-300'
            }`}
            placeholder="9-digit routing number"
          />
          {isValidating && (
            <p className="text-sm text-blue-600 mt-1">Validating routing number...</p>
          )}
          {validation.routingNumber?.valid === true && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {validation.routingNumber.bank_name}
            </p>
          )}
          {validation.routingNumber?.valid === false && (
            <p className="text-sm text-red-600 mt-1">
              {validation.routingNumber.error}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleInputChange}
            onBlur={validateAccountNumber}
            required
            maxLength="17"
            pattern="\d{4,17}"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validation.accountNumber?.valid === false ? 'border-red-500' : 
              validation.accountNumber?.valid === true ? 'border-green-500' : 'border-gray-300'
            }`}
            placeholder="Account number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Account Number
          </label>
          <input
            type="text"
            name="confirmAccountNumber"
            value={formData.confirmAccountNumber}
            onChange={handleInputChange}
            onBlur={validateAccountNumber}
            required
            maxLength="17"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              validation.accountNumber?.valid === false ? 'border-red-500' : 
              validation.accountNumber?.valid === true ? 'border-green-500' : 'border-gray-300'
            }`}
            placeholder="Re-enter account number"
          />
          {validation.accountNumber?.valid === false && (
            <p className="text-sm text-red-600 mt-1">
              {validation.accountNumber.error}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
        </div>

        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            name="savePayment"
            checked={formData.savePayment}
            onChange={handleInputChange}
            className="mt-1"
          />
          <label className="text-sm text-gray-700">
            Save this payment method for future use
          </label>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleInputChange}
              required
              className="mt-1"
            />
            <label className="text-sm text-gray-700">
              I authorize Bogle Payment Portal to electronically debit my account and, 
              if necessary, electronically credit my account to correct erroneous debits. 
              This authorization will remain in effect until I notify you in writing to revoke it.
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing || !formData.consent || validation.routingNumber?.valid !== true}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isProcessing || !formData.consent || validation.routingNumber?.valid !== true
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)} via ACH`}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your bank account information is encrypted and secure</p>
        <p>ACH payments typically take 1-3 business days to process</p>
      </div>
    </div>
  );
};

export default DirectAchPaymentForm;