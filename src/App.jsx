import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CartPage from "./pages/CartPage";
import SignInPage from "./pages/SignInPage";
import PasswordPage from "./pages/PasswordPage";
import SmsVerificationPage from "./pages/SmsVerificationPage";
import BankLinkPage from "./pages/BankLinkPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import Logo from "./components/Logo";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-white/20 backdrop-blur-sm bg-white/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo />
          </div>
        </div>
      </nav>

      <div className="min-h-[calc(100vh-80px)] p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/cart" replace />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/password" element={<PasswordPage />} />
          <Route path="/sms" element={<SmsVerificationPage />} />
          <Route path="/bank-link" element={<BankLinkPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
