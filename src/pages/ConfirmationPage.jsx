import React from "react";
import { Link, useNavigate } from "react-router-dom";

function ConfirmationPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-primary"
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
      <h2 className="text-2xl font-bold text-gray-900">
        Thank you for saving with Bank Pay!
      </h2>
      <p className="text-gray-600">
        We've texted and emailed your order confirmation.
      </p>
      <p className="text-gray-600">
        Questions? Email support@bogle or reply to the SMS.
      </p>

      <button
        onClick={() => navigate("/cart")}
        className="w-full mt-2 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
      >
        Pay with Card instead
      </button>

      <Link
        to="/cart"
        className="underline text-xs text-gray-500 mt-2 inline-block"
      >
        Return to Cart
      </Link>
    </div>
  );
}

export default ConfirmationPage;
