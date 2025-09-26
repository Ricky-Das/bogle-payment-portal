import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

function SmsVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initPhone = location.state?.phone || "";
  const orderDetails = location.state?.orderDetails;
  const [phone, setPhone] = useState(initPhone);
  const [stage, setStage] = useState(initPhone ? "verify" : "collect");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const sendCode = () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setSent(true);
    setStage("verify");
    alert("SMS code sent (demo)");
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (code.length === 6) {
      // Simulate successful authentication by setting a token
      localStorage.setItem("accessToken", "demo-token-" + Date.now());

      // Navigate to payment method selection with order details
      navigate("/payment-method", {
        state: {
          phone,
          orderDetails,
        },
      });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
      {stage === "collect" ? (
        <>
          <h2 className="text-xl font-bold text-center">Enter Phone Number</h2>
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary"
          />
          <button
            onClick={sendCode}
            disabled={phone.replace(/\D/g, "").length < 10}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
          >
            Send Code
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-center">
            Enter Verification Code
          </h2>
          <p className="text-center text-sm text-gray-500">
            Code sent to {phone}
          </p>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength="6"
              placeholder="123456"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center tracking-widest text-lg focus:ring-primary"
            />
            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              disabled={code.length !== 6}
            >
              Verify & Continue
            </button>
          </form>
          {sent && (
            <button
              onClick={() => {
                setCode("");
                alert("Resent code (demo)");
              }}
              className="mx-auto block text-xs underline text-gray-500 mt-2"
            >
              Resend Code
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SmsVerificationPage;
