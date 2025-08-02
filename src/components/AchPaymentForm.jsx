import React, { useState } from "react";
import { usePlaidLink } from "react-plaid-link";

function AchPaymentForm() {
  const [form, setForm] = useState({
    email: "",
    phone: "",
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

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Information Panel (duplicate from card form) */}
        <div className="order-2 lg:order-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 lg:p-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Premium Subscription
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Unlock all features with our premium plan
            </p>
            <div className="space-y-6 mb-8 text-gray-600">
              <p>Enjoy a $5 discount for ACH payments!</p>
            </div>
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Premium Plan (Monthly)</span>
                <span className="font-semibold text-gray-900">$49.00</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">ACH Discount</span>
                <span className="font-semibold text-green-600">- $5.00</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold text-gray-900">$4.90</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total</span>
                <span>$48.90</span>
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
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="phone"
                >
                  Phone (SMS verification)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg"
                >
                  {bankLinked
                    ? "Bank Account Linked ✓"
                    : "Connect Bank Account via Plaid"}
                </button>
              </div>

              {/* Recurring toggle */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="recurring"
                  className="flex-1 text-sm text-gray-700"
                >
                  I understand that this is a recurring payment
                </label>
                <input
                  id="recurring"
                  name="recurring"
                  type="checkbox"
                  checked={form.recurring}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 border-gray-300"
                />
              </div>

              {/* Save payment method */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="savePayment"
                  className="flex-1 text-sm text-gray-700"
                >
                  Save payment method for faster checkout
                </label>
                <input
                  id="savePayment"
                  name="savePayment"
                  type="checkbox"
                  checked={form.savePayment}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 border-gray-300"
                />
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchPaymentForm;
