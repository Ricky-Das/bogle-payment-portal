import React, { useState, useRef } from "react";
import {
  createCheckoutSession,
  confirmPayment,
  pollUntilComplete,
} from "../config/api";
import FinixTokenizationForm from "../components/FinixTokenizationForm";

const SmokeTestPage = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const tokenizationRef = useRef(null);

  const addResult = (step, status, details = "") => {
    setTestResults((prev) => [
      ...prev,
      {
        step,
        status,
        details,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const runSmokeTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Environment Check
      setCurrentStep("Checking environment variables...");
      const requiredEnvs = ["VITE_FINIX_APPLICATION_ID", "VITE_FINIX_SDK_URL"];
      const missingEnvs = requiredEnvs.filter((env) => !import.meta.env[env]);

      if (missingEnvs.length > 0) {
        addResult(
          "Environment Check",
          "FAIL",
          `Missing: ${missingEnvs.join(", ")}`
        );
        return;
      }
      addResult(
        "Environment Check",
        "PASS",
        "All required environment variables present"
      );

      // Test 2: Create Checkout Session
      setCurrentStep("Creating checkout session...");
      let sessionId;
      try {
        sessionId = await createCheckoutSession({
          line_items: [
            {
              name: "Smoke Test Product",
              quantity: 1,
              unit_amount: 1000, // $10.00
              currency: "USD",
            },
          ],
          success_url: `${window.location.origin}/confirmation`,
          cancel_url: `${window.location.origin}/payment-method`,
          customer: {
            email: "test@example.com",
            name: "Smoke Test User",
          },
        });

        if (sessionId) {
          addResult("Create Session", "PASS", `Session ID: ${sessionId}`);
        } else {
          addResult("Create Session", "FAIL", "No session ID returned");
          return;
        }
      } catch (error) {
        addResult("Create Session", "FAIL", `Error: ${error.message}`);
        return;
      }

      // Test 3: Finix Tokenization Check
      setCurrentStep("Checking Finix tokenization...");
      try {
        if (!tokenizationRef.current) {
          addResult(
            "Finix Tokenization",
            "FAIL",
            "Tokenization form not ready"
          );
          return;
        }

        // Try to get fraud session ID (optional)
        const fraudSessionId = tokenizationRef.current.getFraudSessionId?.();
        addResult(
          "Fraud Session",
          fraudSessionId ? "PASS" : "SKIP",
          fraudSessionId
            ? `Fraud ID: ${fraudSessionId}`
            : "Fraud SDK not available"
        );

        addResult(
          "Finix Tokenization",
          "PASS",
          "Tokenization form initialized"
        );
      } catch (error) {
        addResult("Finix Tokenization", "FAIL", `Error: ${error.message}`);
      }

      // Test 4: API Connectivity
      setCurrentStep("Testing API connectivity...");
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE ||
            "https://tstd5z72k1.execute-api.us-east-1.amazonaws.com"
          }/v1/checkout-sessions/${sessionId}`
        );

        if (response.ok) {
          const session = await response.json();
          addResult(
            "API Connectivity",
            "PASS",
            `Retrieved session: ${session.status || "active"}`
          );
        } else {
          addResult(
            "API Connectivity",
            "FAIL",
            `HTTP ${response.status}: ${response.statusText}`
          );
        }
      } catch (error) {
        addResult(
          "API Connectivity",
          "FAIL",
          `Network error: ${error.message}`
        );
      }

      addResult(
        "Smoke Test Complete",
        "INFO",
        "Manual testing required for full payment flow"
      );
    } catch (error) {
      addResult("Smoke Test", "FAIL", `Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentStep("");
    }
  };

  const runManualPaymentTest = async () => {
    if (!tokenizationRef.current) {
      alert("Tokenization form not ready");
      return;
    }

    setIsRunning(true);
    setCurrentStep("Running manual payment test...");

    try {
      // Create session
      const sessionId = await createCheckoutSession({
        line_items: [
          {
            name: "Manual Test Product",
            quantity: 1,
            unit_amount: 100, // $1.00
            currency: "USD",
          },
        ],
        success_url: `${window.location.origin}/confirmation`,
        cancel_url: `${window.location.origin}/payment-method`,
        customer: {
          email: "manual-test@example.com",
          name: "Manual Test User",
        },
      });

      addResult("Manual Test - Session", "PASS", `Session: ${sessionId}`);

      // Tokenize (using stub in development)
      const cardToken = await tokenizationRef.current.tokenize();
      addResult("Manual Test - Tokenize", "PASS", `Token: ${cardToken.id}`);

      // Get fraud session
      const fraudSessionId = tokenizationRef.current.getFraudSessionId?.();

      // Confirm payment
      const payment = await confirmPayment(
        sessionId,
        cardToken.id,
        "94105", // Test ZIP
        fraudSessionId
      );

      addResult("Manual Test - Confirm", "PASS", `Payment initiated`);

      // Poll status
      const finalStatus = await pollUntilComplete(sessionId);
      addResult(
        "Manual Test - Complete",
        finalStatus === "paid" ? "PASS" : "FAIL",
        `Final status: ${finalStatus}`
      );
    } catch (error) {
      addResult("Manual Test", "FAIL", `Error: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentStep("");
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Payment System Smoke Test
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">About This Test</h3>
          <p className="text-blue-800 text-sm">
            This tool validates the payment system configuration and
            connectivity. It checks environment variables, API endpoints, and
            Finix integration.
          </p>
        </div>

        {/* Hidden Finix Form for Testing */}
        <div className="hidden">
          <FinixTokenizationForm ref={tokenizationRef} />
        </div>

        {/* Test Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={runSmokeTest}
            disabled={isRunning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRunning ? "Running Tests..." : "Run Smoke Test"}
          </button>

          <button
            onClick={runManualPaymentTest}
            disabled={isRunning}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isRunning ? "Testing..." : "Test Payment Flow"}
          </button>

          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
          >
            Clear Results
          </button>
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">{currentStep}</p>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Test Results
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 py-2 border-b border-gray-200 last:border-b-0"
                >
                  <span
                    className={`inline-block w-3 h-3 rounded-full mt-1 ${
                      result.status === "PASS"
                        ? "bg-green-500"
                        : result.status === "FAIL"
                        ? "bg-red-500"
                        : result.status === "SKIP"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {result.step}
                      </h4>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          result.status === "PASS"
                            ? "bg-green-100 text-green-800"
                            : result.status === "FAIL"
                            ? "bg-red-100 text-red-800"
                            : result.status === "SKIP"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>

                    {result.details && (
                      <p className="text-sm text-gray-600 mt-1 break-all">
                        {result.details}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Notes */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Testing Notes</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • <strong>Smoke Test:</strong> Validates configuration and basic
              connectivity
            </li>
            <li>
              • <strong>Payment Test:</strong> Attempts full payment flow (uses
              development stubs)
            </li>
            <li>
              • <strong>Manual Testing:</strong> Use actual credit card form for
              real Finix testing
            </li>
            <li>
              • <strong>Production:</strong> Test with actual Finix credentials
              and live endpoints
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SmokeTestPage;
