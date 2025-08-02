import React from "react";
import PaymentContainer from "./components/PaymentContainer";
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

      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <PaymentContainer />
      </div>
    </div>
  );
}

export default App;
