import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function ConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get payment result from navigation state
  const paymentResult = location.state?.paymentResult;
  const orderDetails = location.state?.orderDetails;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        {paymentResult && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium">
                ${paymentResult.amount?.toFixed(2) || "N/A"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium">
                {paymentResult.card?.brand || "Card"} ending in{" "}
                {paymentResult.card?.lastFour || "****"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transaction ID:</span>
              <span className="font-mono text-xs">
                {paymentResult.transactionId || "N/A"}
              </span>
            </div>
          </>
        )}
      </div>

      <p className="text-gray-600">
        Your payment has been processed successfully.
      </p>

      <p className="text-gray-600 text-sm">
        Questions? Contact general@bogle.com
      </p>

      <div className="space-y-3">
        <button
          onClick={() => navigate("/cart")}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Make Another Payment
        </button>

        <Link
          to="/cart"
          className="block text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Return to Cart
        </Link>
      </div>
    </div>
  );
}

export default ConfirmationPage;
