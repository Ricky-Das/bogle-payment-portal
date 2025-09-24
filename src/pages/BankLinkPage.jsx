import React from "react";
import { useNavigate } from "react-router-dom";

function BankLinkPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Bank Linking Temporarily Unavailable
      </h2>
      <p className="text-gray-600">
        ACH payments and bank linking features are currently disabled while we
        improve our system.
      </p>
      <button
        onClick={() => navigate("/payment-method")}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Use Credit Card Payment Instead
      </button>
    </div>
  );
}

export default BankLinkPage;
