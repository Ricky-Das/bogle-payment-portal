import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CreditCardForm from "../components/CreditCardForm";

const PaymentMethodPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);

  // Get order details from location state or use defaults
  const orderDetails = location.state?.orderDetails || {
    subtotal: 49.0,
    tax: 4.9,
    total: 53.9,
    achDiscount: 2.45,
    achTotal: 51.45,
  };

  useEffect(() => {
    // Skip authentication check - temporarily disabled
    // Set selected method to card by default since ACH is disabled
    setSelectedMethod("card");
  }, []);

  const handlePaymentSuccess = async (result) => {
    setPaymentResult(result);
    setError(null);

    navigate("/confirmation", {
      state: {
        paymentResult: result,
        orderDetails: orderDetails,
      },
    });
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setPaymentResult(null);
  };

  const handleMethodSelection = (method) => {
    setSelectedMethod(method);
    setError(null);
  };

  const renderPaymentForm = () => {
    if (!selectedMethod) return null;

    const amount = orderDetails.total; // Only credit card payments available

    switch (selectedMethod) {
      case "card":
        return (
          <CreditCardForm
            amount={amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        );
      case "bank":
        // ACH temporarily disabled
        return (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              ACH Payments Temporarily Unavailable
            </h3>
            <p className="text-gray-600 mb-4">
              We're working on improvements to our bank transfer system.
            </p>
            <button
              onClick={() => setSelectedMethod("card")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Use Credit Card Instead
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Premium Product</span>
                <span className="font-medium">
                  ${orderDetails.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  ${orderDetails.tax.toFixed(2)}
                </span>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${orderDetails.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ACH savings message removed since ACH is disabled */}
          </div>
        </div>

        {/* Payment Method Selection and Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {!selectedMethod ? (
              <>
                <h1 className="text-2xl font-bold mb-6">
                  Choose Payment Method
                </h1>

                {/* Payment Method Options - ACH Temporarily Disabled */}
                <div className="space-y-4">
                  <button
                    onClick={() => handleMethodSelection("card")}
                    className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">💳</span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Credit Card
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pay instantly with your credit or debit card
                        </p>
                        <p className="text-lg font-bold text-gray-900 mt-2">
                          ${orderDetails.total.toFixed(2)}
                        </p>
                      </div>
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* ACH Payment - Temporarily Disabled */}
                  <div className="w-full p-6 border-2 border-gray-300 rounded-lg bg-gray-50 opacity-60 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">🏦</span>
                          <h3 className="text-lg font-semibold text-gray-500">
                            Bank Transfer (ACH)
                          </h3>
                          <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                            Temporarily Unavailable
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          ACH payments are temporarily disabled for maintenance
                        </p>
                        <p className="text-lg font-bold text-gray-500 mt-2">
                          Coming Soon
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back button and selected method header */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setSelectedMethod(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold">
                    {selectedMethod === "card"
                      ? "Credit Card Payment"
                      : "Bank Transfer Payment"}
                  </h1>
                </div>
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Payment Form */}
            <div>{renderPaymentForm()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodPage;
