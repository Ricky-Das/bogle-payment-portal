import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { IS_DEMO_MODE } from "./config/demo";

// In demo mode, guard network calls to ensure no backend is hit
if (IS_DEMO_MODE && typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const url = String(args[0] || "");
    // Allow loading of local assets and Finix SDK if provided
    const isLocal = url.startsWith("/") || url.startsWith(window.location.origin);
    const isHttp = url.startsWith("http://") || url.startsWith("https://");
    const isFinix = /finix/i.test(url);
    if (isHttp && !isFinix) {
      throw new Error("Network calls are disabled in demo mode: " + url);
    }
    return originalFetch(...args);
  };
  // Expose for debugging toggle
  window.__BOGLE_DEMO__ = true;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      basename={(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
