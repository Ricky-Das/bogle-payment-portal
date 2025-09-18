import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingProgress from "../components/OnboardingProgress";
import apiClient from "../config/api";

const IdentityVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, personalInfo, address, orderDetails } = location.state || {};

  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [error, setError] = useState("");

  const handleCreateIdentity = async () => {
    setIsCreatingIdentity(true);
    setError("");

    try {
      // Prepare identity data for Finix
      const identityData = {
        entity: {
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          email: personalInfo.email,
          phone: phone.replace(/\D/g, ""), // Remove formatting
          personal_address: {
            line1: address.street1,
            line2: address.street2 || null,
            city: address.city,
            region: address.state,
            postal_code: address.zipCode.replace("-", ""), // Remove dash from ZIP
            country: "USA"
          },
          dob: {
            day: parseInt(personalInfo.dateOfBirth.split("-")[2]),
            month: parseInt(personalInfo.dateOfBirth.split("-")[1]),
            year: parseInt(personalInfo.dateOfBirth.split("-")[0])
          },
          personal_ssn: personalInfo.ssn.replace(/\D/g, "") // Remove formatting
        },
        tags: {
          application_name: "bogle-payment-portal",
          user_phone: phone
        }
      };

      // Create identity with Finix
      const response = await apiClient.createIdentity("temp-user-id", identityData);
      
      if (response.identityId) {
        // Identity created successfully, proceed to bank linking
        navigate("/bank-link", {
          state: {
            phone,
            personalInfo,
            address,
            identityId: response.identityId,
            orderDetails
          }
        });
      } else {
        throw new Error("Failed to create identity");
      }
    } catch (err) {
      console.error("Identity creation error:", err);
      setError(err.message || "Failed to verify identity. Please check your information and try again.");
    } finally {
      setIsCreatingIdentity(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingProgress currentStep={4} />
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 space-y-6">
        <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Identity Verification</h2>
        <p className="text-gray-600 mt-2">
          Review your information before we verify your identity
        </p>
      </div>

      {/* Review Information */}
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Personal Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span>{personalInfo?.firstName} {personalInfo?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{personalInfo?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span>{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date of Birth:</span>
              <span>{personalInfo?.dateOfBirth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SSN:</span>
              <span>***-**-{personalInfo?.ssn?.slice(-4)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Address</h3>
          <div className="text-sm text-gray-700">
            <p>{address?.street1}</p>
            {address?.street2 && <p>{address.street2}</p>}
            <p>{address?.city}, {address?.state} {address?.zipCode}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>We'll verify your identity with our secure payment processor</li>
                <li>This process is instant and uses bank-level security</li>
                <li>Your information is encrypted and never stored on our servers</li>
                <li>Once verified, you can link your bank account securely</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleBack}
          disabled={isCreatingIdentity}
          className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleCreateIdentity}
          disabled={isCreatingIdentity}
          className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center"
        >
          {isCreatingIdentity ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </>
          ) : (
            "Verify Identity"
          )}
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => navigate("/personal-info", { state: { phone, orderDetails } })}
          className="text-primary hover:text-emerald-600 text-sm font-medium"
        >
          Need to edit your information?
        </button>
      </div>
      </div>
    </div>
  );
};

export default IdentityVerificationPage;