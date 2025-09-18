import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingProgress from "../components/OnboardingProgress";

const PersonalInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, orderDetails } = location.state || {};

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    ssn: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format SSN
    if (name === "ssn") {
      const digits = value.replace(/\D/g, "");
      if (digits.length <= 9) {
        if (digits.length > 5) {
          formattedValue = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
        } else if (digits.length > 3) {
          formattedValue = `${digits.slice(0, 3)}-${digits.slice(3)}`;
        } else {
          formattedValue = digits;
        }
      } else {
        return; // Don't update if more than 9 digits
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
    }

    if (!formData.ssn.trim()) {
      newErrors.ssn = "SSN is required for identity verification";
    } else if (formData.ssn.replace(/\D/g, "").length !== 9) {
      newErrors.ssn = "Please enter a valid 9-digit SSN";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      navigate("/address", {
        state: {
          phone,
          personalInfo: formData,
          orderDetails
        }
      });
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingProgress currentStep={2} />
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
        <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-gray-600 mt-2">
          We need this information to verify your identity and comply with financial regulations
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth *
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
              errors.dateOfBirth ? "border-red-500" : "border-gray-300"
            }`}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
          />
          {errors.dateOfBirth && (
            <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Social Security Number *
          </label>
          <input
            type="text"
            name="ssn"
            value={formData.ssn}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-primary focus:border-primary ${
              errors.ssn ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="123-45-6789"
            maxLength="11"
          />
          {errors.ssn && (
            <p className="text-red-500 text-sm mt-1">{errors.ssn}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Required for identity verification. Your information is encrypted and secure.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Why we need this information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Federal law requires us to verify your identity before processing payments. 
                All information is encrypted and used only for verification purposes.
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

export default PersonalInfoPage;