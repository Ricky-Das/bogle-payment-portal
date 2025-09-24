import React, { useState, useEffect, useRef } from "react";
import {
  createCheckoutSession,
  confirmPayment,
  pollUntilComplete,
} from "../config/api";
import FinixTokenizationForm from "./FinixTokenizationForm";

const CreditCardForm = ({ onSuccess, onError, amount = 52.82 }) => {
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardholderName: "",
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zipCode: "",
    },
    saveCard: false,
  });

  const [validation, setValidation] = useState({
    cardNumber: null,
    expiry: null,
    cvv: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [finixConfig, setFinixConfig] = useState(null);
  const tokenizationRef = useRef(null);
  const [finixReady, setFinixReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize Finix configuration from environment variables
    setFinixConfig({
      environment: import.meta.env.VITE_FINIX_ENVIRONMENT || "sandbox",
      applicationId: import.meta.env.VITE_FINIX_APPLICATION_ID || "",
    });
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("billing.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value,
        },
      }));
    } else {
      let processedValue = value;

      // Format card number with spaces
      if (name === "cardNumber") {
        processedValue = value
          .replace(/\D/g, "")
          .replace(/(\d{4})(?=\d)/g, "$1 ")
          .trim();
        if (processedValue.length > 19)
          processedValue = processedValue.substring(0, 19);
      }

      // Format expiry month/year
      if (name === "expiryMonth" || name === "expiryYear") {
        processedValue = value.replace(/\D/g, "");
      }

      // Format CVV
      if (name === "cvv") {
        processedValue = value.replace(/\D/g, "").substring(0, 4);
      }

      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : processedValue,
      }));
    }

    // Clear validation when user changes input
    if (
      name === "cardNumber" ||
      name === "expiryMonth" ||
      name === "expiryYear" ||
      name === "cvv"
    ) {
      setValidation((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Hosted Fields handle all card field validation

  const tokenizeCard = async () => {
    if (
      tokenizationRef.current &&
      typeof tokenizationRef.current.tokenize === "function"
    ) {
      return tokenizationRef.current.tokenize();
    }
    throw new Error("Tokenization form not ready");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client validation for billing address (card fields validated by Finix Hosted Fields)
    if (
      !formData.billingAddress.zipCode ||
      formData.billingAddress.zipCode.trim().length < 5
    ) {
      setError("Please enter a valid ZIP code for address verification");
      setIsProcessing(false);
      return;
    }

    // Validate ZIP format
    const zipPattern = /^\d{5}(-\d{4})?$/;
    if (!zipPattern.test(formData.billingAddress.zipCode.trim())) {
      setError("Please enter a valid ZIP code (12345 or 12345-6789)");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Ensure tokenization is configured
      if (
        !import.meta.env.VITE_FINIX_SDK_URL ||
        !import.meta.env.VITE_FINIX_APPLICATION_ID
      ) {
        throw new Error(
          "Payment temporarily unavailable: Finix is not configured"
        );
      }
      // 1) Create checkout session
      const sessionId = await createCheckoutSession({
        line_items: [
          {
            name: "Checkout Item",
            quantity: 1,
            unit_amount: Math.round(amount * 100),
            currency: "USD",
          },
        ],
        success_url: `${window.location.origin}/confirmation`,
        cancel_url: `${window.location.origin}/payment-method`,
        customer: {
          email: "user@example.com",
          name: undefined,
        },
      });

      // 2) Tokenize card with Finix on client
      const cardToken = await tokenizeCard();

      if (!cardToken || !cardToken.id) {
        throw new Error("Failed to tokenize card - please try again");
      }

      // 3) Collect fraud session ID via Finix Fraud SDK for risk assessment
      const fraudSessionId =
        (tokenizationRef.current &&
          typeof tokenizationRef.current.getFraudSessionId === "function" &&
          tokenizationRef.current.getFraudSessionId()) ||
        undefined;

      if (!fraudSessionId) {
        console.info(
          "No fraud session ID - proceeding without enhanced risk data"
        );
      } else {
        console.log("Fraud session collected for enhanced risk assessment");
      }

      // 4) Confirm payment with AVS ZIP validation
      const payment = await confirmPayment(
        sessionId,
        cardToken.id,
        formData.billingAddress.zipCode.trim(), // Clean ZIP for AVS
        fraudSessionId
      );

      // 5) Poll status until complete
      const finalStatus = await pollUntilComplete(sessionId);

      if (finalStatus === "paid") {
        onSuccess({
          paymentMethod: "card",
          amount: amount,
          transactionId: payment?.transaction_id || payment?.id || sessionId,
          status: finalStatus,
          card: {
            brand: cardToken.brand,
            lastFour: cardToken.last_four,
          },
          gatewayResponse: payment,
        });
      } else {
        throw new Error("payment_failed");
      }
    } catch (error) {
      let friendly = "Payment failed. Please try again.";
      const code = error && (error.code || error.status || "");
      switch (String(code).toLowerCase()) {
        case "processor_error":
        case "502":
          friendly =
            "The processor returned an error. Please use a different card or try again later.";
          break;
        case "card_declined":
          friendly =
            "Your card was declined. Try another card or contact your bank.";
          break;
        case "invalid_request":
        case "400":
          friendly =
            "Invalid payment request. Please recheck the details and try again.";
          break;
        case "unauthorized":
        case "401":
          friendly = "Authorization failed. Please refresh and try again.";
          break;
        case "forbidden":
        case "403":
          friendly =
            "This action is not allowed. Contact support if this persists.";
          break;
        case "not_found":
        case "404":
          friendly =
            "Payment session not found. Please refresh and start again.";
          break;
        case "timeout":
        case "504":
          friendly = "The payment timed out. Please try again.";
          break;
        default:
          if (error?.details?.message) friendly = error.details.message;
      }
      console.error("Credit card payment error:", error);
      setError(friendly);
      onError(friendly);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Credit Card Payment
      </h2>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-blue-800 font-medium">Total Amount:</span>
          <span className="text-blue-800 font-bold text-xl">
            ${amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Finix Hosted Fields */}
        <FinixTokenizationForm
          ref={tokenizationRef}
          className="mb-2"
          onReady={() => setFinixReady(true)}
        />
        {/* Raw card fields removed in favor of hosted fields above */}

        {/* Cardholder Name collected within Finix form */}

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
              pattern="[0-9]{5}(-[0-9]{4})?"
              maxLength="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ZIP Code (12345 or 12345-6789)"
              title="Enter a valid ZIP code for address verification"
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
          disabled={isProcessing || !finixReady}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isProcessing || !finixReady
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isProcessing
            ? "Processing Payment..."
            : !finixReady
            ? "Loading Payment Form..."
            : `Pay $${amount.toFixed(2)}`}
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
