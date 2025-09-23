import { useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useLocation } from "react-router-dom";
// Legacy ACH API removed

function AchPaymentForm({ onSuccess, onError, amount = 52.82 }) {
  const location = useLocation();
  const initPhone = location.state?.phone || "";

  const [form, setForm] = useState({
    phone: initPhone,
    recurring: true,
    consent: false,
    savePayment: true,
  });
  const [isProcessing, setProcessing] = useState(false);
  const [bankLinked, setBankLinked] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [user, setUser] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState(null);

  // Initialize component
  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.log("No auth token found, user needs to sign in first");
        // Don't show error, just wait for authentication
        return;
      }

      // Get current user
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser.user);

      // Create Plaid link token
      const tokenResponse = await apiClient.createPlaidLinkToken(
        currentUser.user.id
      );
      setLinkToken(tokenResponse.link_token);

      // Check if user already has linked accounts
      try {
        const accounts = await apiClient.getPlaidAccounts(currentUser.user.id);
        if (accounts.accounts && accounts.accounts.length > 0) {
          setLinkedAccounts(accounts);
          setBankLinked(true);
        }
      } catch (error) {
        // No accounts linked yet, that's fine
        console.log("No linked accounts found:", error.message);
      }
    } catch (error) {
      console.error("Failed to initialize Plaid:", error);
      // Only show error if it's not an authentication issue
      if (error.message !== "Authentication failed") {
        onError && onError("Failed to initialize payment system");
      }
    }
  };

  /* Plaid Link */
  const handlePlaidSuccess = async (public_token, metadata) => {
    try {
      console.log("Plaid success", public_token, metadata);

      const response = await apiClient.exchangePlaidPublicToken(
        public_token,
        user.id,
        metadata
      );

      setLinkedAccounts(response);
      setBankLinked(true);
    } catch (error) {
      console.error("Failed to exchange Plaid token:", error);
      onError && onError("Failed to link bank account");
    }
  };

  const config = {
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: (err, metadata) => {
      if (err) {
        console.error("Plaid Link exited with error:", err);
      }
    },
    onEvent: (eventName, metadata) => {
      console.log("Plaid Link event:", eventName, metadata);
    },
  };
  const { open, ready } = usePlaidLink(config);

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
      6,
      10
    )}`;
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    let processed = value;
    if (name === "phone") {
      processed = formatPhone(value);
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : processed,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankLinked) {
      onError && onError("Please connect your bank first.");
      return;
    }
    if (!form.consent) {
      onError && onError("You must provide NACHA authorization.");
      return;
    }

    setProcessing(true);

    try {
      if (linkedAccounts && linkedAccounts.accounts.length > 0) {
        const selectedAccount = linkedAccounts.accounts[0]; // Use first account for demo

        // Create ACH payment instrument using Plaid-verified account
        // This uses Finix for the actual payment processing
        const bankAccount = {
          account_name: selectedAccount.name,
          account_number: selectedAccount.account_id, // Plaid account ID
          routing_number: selectedAccount.routing_number || "021000021", // Would come from Plaid
          account_type:
            selectedAccount.subtype === "savings" ? "savings" : "checking",
          plaid_account_id: selectedAccount.account_id, // Store Plaid reference
        };

        throw new Error("ACH flow is disabled in this build");
      }
    } catch (error) {
      console.error("ACH payment error:", error);
      onError && onError(error.message || "Failed to process ACH payment");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white border-2 border-slate-900 shadow-2xl">
      <div className="bg-slate-900 text-white p-6 border-b-4 border-slate-700">
        <h2 className="text-3xl font-black tracking-tight uppercase">
          ACH BANK PAYMENT
        </h2>
        <div className="mt-2 text-slate-300 font-bold text-lg">
          AMOUNT: ${amount.toFixed(2)}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Contact */}
        <div className="bg-slate-50 border-l-4 border-slate-900 p-4">
          <label
            className="block text-sm font-black text-slate-900 mb-3 uppercase tracking-wide"
            htmlFor="phone"
          >
            PHONE NUMBER
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="(555) 555-5555"
            className="w-full px-4 py-4 border-2 border-slate-300 focus:border-slate-900 focus:outline-none font-bold text-slate-900 bg-white shadow-inner"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        {/* Plaid Link */}
        <div className="bg-slate-50 border-l-4 border-slate-900 p-4">
          <div className="mb-3">
            <span className="block text-sm font-black text-slate-900 uppercase tracking-wide">
              BANK ACCOUNT CONNECTION
            </span>
          </div>
          <button
            type="button"
            disabled={!ready || !linkToken}
            onClick={open}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 font-black text-white transition-all duration-200 border-2 shadow-lg ${
              bankLinked
                ? "bg-green-800 border-green-900 hover:bg-green-900 shadow-green-900/25"
                : ready && linkToken
                ? "bg-slate-800 border-slate-900 hover:bg-slate-900 shadow-slate-900/25"
                : "bg-gray-400 border-gray-500 cursor-not-allowed"
            }`}
          >
            {bankLinked ? (
              <>
                <span className="uppercase tracking-wider">
                  BANK ACCOUNT LINKED
                </span>
                <div className="w-6 h-6 bg-white text-green-800 flex items-center justify-center font-black">
                  ✓
                </div>
              </>
            ) : !linkToken ? (
              <>
                <span className="uppercase tracking-wider">LOADING...</span>
                <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin"></div>
              </>
            ) : (
              <>
                <span className="uppercase tracking-wider">
                  CONNECT BANK ACCOUNT
                </span>
                <div className="w-6 h-6 bg-white text-slate-800 flex items-center justify-center font-black">
                  →
                </div>
              </>
            )}
          </button>
        </div>

        {/* NACHA consent */}
        <div className="bg-red-50 border-2 border-red-200 p-6">
          <div className="mb-4">
            <span className="block text-sm font-black text-red-900 uppercase tracking-wide">
              AUTHORIZATION REQUIRED
            </span>
          </div>
          <div className="flex items-start space-x-4">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={form.consent}
              onChange={handleChange}
              className="mt-1 w-6 h-6 text-red-600 border-2 border-red-400 focus:ring-red-500"
            />
            <label
              htmlFor="consent"
              className="text-sm text-slate-800 font-bold leading-tight"
            >
              I authorize Bogle to debit my bank account for the amount shown
              above. I understand this is an electronic ACH debit governed by
              the rules of NACHA, and that I may revoke this authorization by
              contacting Bogle at least 3 business days before the scheduled
              debit.
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-slate-900 text-white py-6 px-8 font-black text-lg uppercase tracking-wider hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 border-2 border-slate-900 shadow-2xl"
        >
          {isProcessing
            ? "PROCESSING PAYMENT..."
            : `COMPLETE ACH PAYMENT • $${amount.toFixed(2)}`}
        </button>
      </form>

      {/* Legal disclaimers */}
      <div className="bg-slate-100 border-t-4 border-slate-900 p-6">
        <div className="space-y-3 text-center">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            SECURITY & PROCESSING
          </div>
          <p className="text-xs text-slate-700 font-medium">
            Bank verification by Plaid • Payment processing by Finix
          </p>
          <p className="text-xs text-slate-700 font-medium">
            ACH payments typically take 1-3 business days to process
          </p>
          <div className="pt-2 border-t border-slate-300">
            <p className="text-[10px] text-slate-600 font-medium">
              By clicking Pay, you agree to the{" "}
              <a href="#" className="font-bold text-slate-900 underline">
                TERMS
              </a>{" "}
              and{" "}
              <a href="#" className="font-bold text-slate-900 underline">
                PRIVACY POLICY
              </a>
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-300 text-center">
          <div className="text-xs text-slate-600 font-bold">
            POWERED BY{" "}
            <span className="text-slate-900 font-black tracking-wider">
              BOGLE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchPaymentForm;
