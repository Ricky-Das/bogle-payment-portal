import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CartPage from "./pages/CartPage";
import SignInPage from "./pages/SignInPage";
import PersonalInfoPage from "./pages/PersonalInfoPage";
import AddressPage from "./pages/AddressPage";
import IdentityVerificationPage from "./pages/IdentityVerificationPage";
import PasswordPage from "./pages/PasswordPage";
import SmsVerificationPage from "./pages/SmsVerificationPage";
import BankLinkPage from "./pages/BankLinkPage";
import PaymentMethodPage from "./pages/PaymentMethodPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import SmokeTestPage from "./pages/SmokeTestPage";
import Logo from "./components/Logo";
import { Link } from "react-router-dom";
import TransactionsPage from "./pages/TransactionsPage";
import { IS_DEMO_MODE } from "./config/demo";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-white/20 backdrop-blur-sm bg-white/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo />
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <Link to="/cart" className="text-gray-700 hover:text-blue-600">
              Cart
            </Link>
            <Link
              to="/payment-method"
              className="text-gray-700 hover:text-blue-600"
            >
              Pay
            </Link>
            {(import.meta.env.MODE === "development" || IS_DEMO_MODE) && (
              <Link
                to="/smoke-test"
                className="text-gray-500 hover:text-blue-600 text-xs"
              >
                Test
              </Link>
            )}
            {IS_DEMO_MODE && (
              <Link
                to="/transactions"
                className="text-gray-700 hover:text-blue-600"
              >
                Transactions
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="min-h-[calc(100vh-80px)] p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/cart" replace />} />
          <Route path="/cart" element={<CartPage />} />
          {/* Sign-in and onboarding routes temporarily disabled */}
          {/* <Route path="/signin" element={<SignInPage />} />
          <Route path="/personal-info" element={<PersonalInfoPage />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/identity-verification" element={<IdentityVerificationPage />} />
          <Route path="/password" element={<PasswordPage />} />
          <Route path="/sms" element={<SmsVerificationPage />} />
          <Route path="/bank-link" element={<BankLinkPage />} /> */}
          <Route path="/payment-method" element={<PaymentMethodPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/smoke-test" element={<SmokeTestPage />} />
          {IS_DEMO_MODE && (
            <Route path="/transactions" element={<TransactionsPage />} />
          )}
          {/* Legacy Transactions route removed */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
