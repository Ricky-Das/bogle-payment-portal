import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingProgress from "../components/OnboardingProgress";

const AddressPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, personalInfo, orderDetails } = location.state || {};

  const [formData, setFormData] = useState({
    street1: "",
    street2: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const [errors, setErrors] = useState({});

  // US States for dropdown
  const states = [
    { code: "", name: "Select State" },
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format ZIP code
    if (name === "zipCode") {
      const digits = value.replace(/\D/g, "");
      if (digits.length <= 5) {
        formattedValue = digits;
      } else if (digits.length <= 9) {
        formattedValue = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else {
        return; // Don't update if more than 9 digits
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.street1.trim()) {
      newErrors.street1 = "Street address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state) {
      newErrors.state = "State is required";
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      navigate("/identity-verification", {
        state: {
          phone,
          personalInfo,
          address: formData,
          orderDetails,
        },
      });
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingProgress currentStep={3} />
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Address Information
          </h2>
          <p className="text-gray-600 mt-2">
            Please provide your current residential address
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              name="street1"
              value={formData.street1}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                errors.street1 ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="123 Main Street"
            />
            {errors.street1 && (
              <p className="text-red-500 text-sm mt-1">{errors.street1}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apartment, Suite, etc. (Optional)
            </label>
            <input
              type="text"
              name="street2"
              value={formData.street2}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                  errors.city ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="New York"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                  errors.state ? "border-red-500" : "border-gray-300"
                }`}
              >
                {states.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                errors.zipCode ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="12345"
              maxLength="10"
            />
            {errors.zipCode && (
              <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Please ensure your address matches your bank account and
                  government-issued ID. This helps us verify your identity and
                  prevent fraud.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressPage;
