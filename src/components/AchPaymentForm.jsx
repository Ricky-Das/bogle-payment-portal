import React, { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useNavigate, useLocation } from "react-router-dom";

function AchPaymentForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const initPhone = location.state?.phone || "";

  const [form, setForm] = useState({
    phone: initPhone,
    recurring: true,
    consent: false,
    savePayment: true,
  });
  const [isProcessing, setProcessing] = useState(false);
  const [bankLinked, setBankLinked] = useState(false);

  /* Plaid Link */
  const onSuccess = (public_token, metadata) => {
    console.log("Plaid success", public_token, metadata);
    setBankLinked(true);
  };

  const config = {
    token: "PLAID_GENERATED_LINK_TOKEN", // TODO: Replace via backend
    onSuccess,
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

  const fakeAchPayment = () => new Promise((r) => setTimeout(r, 2000));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankLinked) return alert("Please connect your bank first.");
    if (!form.consent) return alert("You must provide NACHA authorization.");

    setProcessing(true);
    await fakeAchPayment();
    alert("ACH Payment scheduled!");
    setProcessing(false);
    navigate("/confirmation");
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Information Panel (duplicate from card form) */}
        <div className="order-2 lg:order-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 lg:p-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Premium Product
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              This is the description of the product.
            </p>
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Product Price</span>
                <span className="font-semibold text-gray-900">$49.00</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">ACH Discount</span>
                <span className="font-semibold text-green-600">- $2.45</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold text-gray-900">$4.90</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total</span>
                <span>$46.55</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACH Form Panel */}
        <div className="order-1 lg:order-2">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Bank Payment (ACH)
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact */}
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="phone"
                >
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Plaid Link */}
              <div>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={open}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                    bankLinked
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-[#00B795] hover:bg-[#00917E]"
                  }`}
                >
                  {bankLinked ? (
                    <>
                      Bank Account Linked
                      <svg
                        className="w-5 h-5"
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
                    </>
                  ) : (
                    <>
                      Connect with Plaid
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* NACHA consent */}
              <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-indigo-600 border-gray-300"
                />
                <label htmlFor="consent" className="text-xs text-gray-600">
                  I authorize Bogle to debit my bank account for the amount
                  shown above. I understand this is an electronic ACH debit
                  governed by the rules of NACHA, and that I may revoke this
                  authorization by contacting Bogle at least 3 business days
                  before the scheduled debit.
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-primary to-emerald-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-primary disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing
                  ? "Processing..."
                  : "Complete ACH Payment • $48.90"}
              </button>
              {/* Legal disclaimers */}
              <p className="mt-4 text-[10px] text-gray-500 text-center">
                By clicking Pay, you agree to the{" "}
                <a href="#" className="underline">
                  Link Terms
                </a>{" "}
                and{" "}
                <a href="#" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
              <div className="text-[10px] text-gray-500 text-center mt-1">
                Powered by{" "}
                <span className="font-semibold text-gray-600">Bogle</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 mt-1">
                <a href="#" className="underline">
                  Terms
                </a>
                <a href="#" className="underline">
                  Privacy
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchPaymentForm;
