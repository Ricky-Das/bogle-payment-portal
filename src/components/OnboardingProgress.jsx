import React from "react";

const OnboardingProgress = ({ currentStep, totalSteps = 5 }) => {
  const steps = [
    { id: 1, name: "Phone", description: "Verify phone number" },
    { id: 2, name: "Personal", description: "Personal information" },
    { id: 3, name: "Address", description: "Address details" },
    { id: 4, name: "Identity", description: "Identity verification" },
    { id: 5, name: "Banking", description: "Link bank account" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep
                    ? "bg-green-500 text-white"
                    : step.id === currentStep
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.id < currentStep ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs font-medium text-gray-900">{step.name}</div>
                <div className="text-xs text-gray-500 hidden sm:block">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  step.id < currentStep ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingProgress;