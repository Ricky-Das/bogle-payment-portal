import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

function SignInPage() {
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleContinuePhone = () => {
    // Pass the order details along with authentication flow
    const orderDetails = location.state?.orderDetails;

    // Dummy existing user check – treat numbers ending with even digit as existing
    const digits = phone.replace(/\D/g, "");
    const isExisting = digits && parseInt(digits.slice(-1), 10) % 2 === 0;

    if (isSignUp || !isExisting) {
      // New user - go to personal info collection
      navigate("/personal-info", {
        state: {
          phone,
          orderDetails,
        },
      });
    } else {
      // Existing user - go to password/SMS verification
      navigate("/password", {
        state: {
          mode: "enter",
          phone,
          orderDetails,
        },
      });
    }
  };

  const handleOAuth = (provider) => {
    const orderDetails = location.state?.orderDetails;
    alert(`${provider} OAuth not implemented – continuing flow.`);
    navigate("/sms", {
      state: {
        phone,
        orderDetails,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSignUp ? "Create Account" : "Sign In"}
        </h2>
        <p className="text-gray-600 mt-2">
          {isSignUp
            ? "Join Bogle to complete your purchase"
            : "Welcome back to Bogle"}
        </p>
      </div>

      <div className="space-y-4">
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={handlePhoneChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
        />
        <button
          onClick={handleContinuePhone}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium"
          disabled={phone.replace(/\D/g, "").length < 10}
        >
          {isSignUp ? "Create Account" : "Continue with Phone"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={() => handleOAuth("Google")}
          className="w-full py-3 border border-gray-300 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50 font-medium"
        >
          <span>Google</span>
        </button>
        <button
          onClick={() => handleOAuth("Apple")}
          className="w-full py-3 border border-gray-300 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50 font-medium"
        >
          <span>Apple</span>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-primary hover:text-emerald-600 text-sm font-medium"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default SignInPage;
