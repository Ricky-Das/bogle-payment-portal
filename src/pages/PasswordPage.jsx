import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function PasswordPage() {
  const location = useLocation();
  const mode = location.state?.mode || "create";
  const phone = location.state?.phone;
  const orderDetails = location.state?.orderDetails;
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/sms", {
      state: {
        phone,
        orderDetails,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
      <h2 className="text-xl font-bold text-center">
        {mode === "enter" ? "Enter Password" : "Create Password"}
      </h2>
      {phone && (
        <p className="text-center text-sm text-gray-500 mb-2">for {phone}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary"
        />
        <button
          type="submit"
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600"
        >
          Continue
        </button>
      </form>
    </div>
  );
}

export default PasswordPage;
