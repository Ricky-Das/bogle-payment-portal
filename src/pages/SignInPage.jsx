import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

function SignInPage() {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleContinuePhone = () => {
    // Dummy existing user check – treat numbers ending with even digit as existing
    const digits = phone.replace(/\D/g, "");
    const isExisting = digits && parseInt(digits.slice(-1), 10) % 2 === 0;

    navigate("/password", {
      state: { mode: isExisting ? "enter" : "create", phone },
    });
  };

  const handleOAuth = (provider) => {
    alert(`${provider} OAuth not implemented – continuing flow.`);
    navigate("/sms", { state: { phone } });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
      <h2 className="text-xl font-bold text-center">Sign in to Bogle</h2>

      <div className="space-y-4">
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={handlePhoneChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary"
        />
        <button
          onClick={handleContinuePhone}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
          disabled={phone.replace(/\D/g, "").length < 10}
        >
          Continue with Phone
        </button>

        <button
          onClick={() => handleOAuth("Google")}
          className="w-full py-3 border border-gray-300 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50"
        >
          <span>Continue with Google</span>
        </button>
        <button
          onClick={() => handleOAuth("Apple")}
          className="w-full py-3 border border-gray-300 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50"
        >
          <span>Continue with Apple</span>
        </button>
      </div>
    </div>
  );
}

export default SignInPage;
