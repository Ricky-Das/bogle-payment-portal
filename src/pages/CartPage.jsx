import React from "react";
import { useNavigate } from "react-router-dom";

const ITEMS = [{ id: 1, name: "Premium Product", price: 49.0 }];
const TAX_RATE = 0.1; // 10% for demo

function CartPage() {
  const navigate = useNavigate();
  const subtotal = ITEMS.reduce((acc, item) => acc + item.price, 0);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const bankSavings = +(total * 0.02).toFixed(2); // 2% savings
  const bankTotal = +(total - bankSavings).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
      {/* Line items */}
      <div className="md:col-span-2 bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
        <div className="space-y-6">
          {ITEMS.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <span>{item.name}</span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary / CTAs */}
      <div className="bg-white rounded-xl shadow p-8 space-y-6 sticky top-24 h-fit">
        <h2 className="text-xl font-bold">Order Summary</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg text-gray-900 pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => alert("Redirect to Stripe flow")}
          className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
        >
          Pay with Card
        </button>

        <button
          onClick={() => navigate("/signin")}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 flex flex-col"
        >
          <span className="text-base font-semibold">
            Pay ${bankTotal.toFixed(2)} with Bank
          </span>
          <span className="text-xs opacity-80 -mt-0.5">
            Save 2% (${bankSavings}) by paying from your bank
          </span>
        </button>
      </div>
    </div>
  );
}

export default CartPage;
