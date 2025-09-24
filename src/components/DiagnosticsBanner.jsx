import React, { useState } from "react";
import { IS_DEMO_MODE } from "../config/demo";

const DiagnosticsBanner = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Skip banner in production
  if (import.meta.env.MODE === "production") {
    return null;
  }

  const requiredEnvs = [
    "VITE_FINIX_APPLICATION_ID",
    "VITE_FINIX_SDK_URL",
    "VITE_FINIX_ENVIRONMENT",
  ];

  const optionalEnvs = ["VITE_API_BASE", "VITE_FINIX_FRAUD_SDK_URL"];

  const missingRequired = requiredEnvs.filter((env) => !import.meta.env[env]);
  const missingOptional = optionalEnvs.filter((env) => !import.meta.env[env]);

  // Only show banner if there are issues
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800">
              {IS_DEMO_MODE
                ? "Demo Mode: Network calls disabled; using mock API"
                : missingRequired.length > 0
                ? `${missingRequired.length} required environment variable(s) missing`
                : `${missingOptional.length} optional environment variable(s) missing`}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-yellow-700 hover:text-yellow-900 underline"
          >
            {isExpanded ? "Hide Details" : "Show Details"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 text-xs space-y-2">
            <div>
              <p className="font-medium text-yellow-800">Mode</p>
              <ul className="list-disc list-inside text-yellow-700">
                <li>{IS_DEMO_MODE ? "Demo (offline, mocked)" : "Normal"}</li>
              </ul>
            </div>
            {missingRequired.length > 0 && (
              <div>
                <p className="font-medium text-yellow-800">Missing Required:</p>
                <ul className="list-disc list-inside text-yellow-700">
                  {missingRequired.map((env) => (
                    <li key={env}>{env}</li>
                  ))}
                </ul>
              </div>
            )}

            {missingOptional.length > 0 && (
              <div>
                <p className="font-medium text-yellow-800">Missing Optional:</p>
                <ul className="list-disc list-inside text-yellow-700">
                  {missingOptional.map((env) => (
                    <li key={env}>{env}</li>
                  ))}
                </ul>
              </div>
            )}

            {!IS_DEMO_MODE && (
              <div className="bg-yellow-100 p-2 rounded text-yellow-800">
                <p className="font-medium">Quick Fix:</p>
                <p>Create a .env.local file with the missing variables.</p>
                <p>See .env.example for reference values.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticsBanner;
