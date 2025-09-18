# Complete User Onboarding Flow

This document outlines the comprehensive KYC (Know Your Customer) onboarding flow that meets both Plaid and Finix requirements for secure payment processing.

## Flow Overview

The onboarding process consists of 5 main steps designed to collect all necessary information for identity verification and payment processing compliance:

```
1. Phone Verification → 2. Personal Info → 3. Address → 4. Identity Verification → 5. Bank Linking
```

## Step-by-Step Process

### 1. Phone Verification (`/signin`)
**Purpose**: Initial user identification and SMS verification setup
**Components**: `SignInPage.jsx`

**Collected Data**:
- Phone number (formatted and validated)
- User type detection (new vs existing)

**Validation**:
- US phone number format: `(XXX) XXX-XXXX`
- Minimum 10 digits required

**Next Step**: 
- New users → Personal Information
- Existing users → Password/SMS verification

### 2. Personal Information (`/personal-info`)
**Purpose**: Collect core identity information required by Finix for KYC
**Components**: `PersonalInfoPage.jsx`

**Collected Data**:
- First Name (required)
- Last Name (required)
- Email Address (required, validated)
- Date of Birth (required, 18+ validation)
- Social Security Number (required, formatted XXX-XX-XXXX)

**Validation**:
- Email format validation
- Age verification (must be 18+)
- SSN format validation (9 digits)
- All fields required for compliance

**Security Features**:
- SSN is masked in display (shows only last 4 digits)
- Real-time input formatting
- Clear error messaging

### 3. Address Information (`/address`)
**Purpose**: Collect residential address for identity verification
**Components**: `AddressPage.jsx`

**Collected Data**:
- Street Address (required)
- Apartment/Suite (optional)
- City (required)
- State (required, dropdown selection)
- ZIP Code (required, formatted XXXXX or XXXXX-XXXX)

**Validation**:
- All required fields validated
- ZIP code format validation
- State selection from dropdown

**Features**:
- Auto-formatting for ZIP codes
- Complete US states dropdown
- Address matching guidance

### 4. Identity Verification (`/identity-verification`)
**Purpose**: Create Finix identity and verify user information
**Components**: `IdentityVerificationPage.jsx`

**Process**:
1. Review all collected information
2. Format data for Finix API requirements
3. Create identity via Finix API
4. Handle verification results

**API Integration**:
- Calls `apiClient.createIdentity()` with formatted data
- Handles success/error responses
- Provides user feedback during processing

**Data Formatting for Finix**:
```javascript
{
  entity: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "1234567890", // Digits only
    personal_address: {
      line1: "123 Main St",
      line2: null,
      city: "New York",
      region: "NY",
      postal_code: "10001",
      country: "USA"
    },
    dob: {
      day: 15,
      month: 6,
      year: 1990
    },
    personal_ssn: "123456789" // Digits only
  }
}
```

### 5. Bank Account Linking (`/bank-link`)
**Purpose**: Connect user's bank account via Plaid or manual entry
**Components**: `BankLinkPage.jsx` (existing)

**Options**:
- **Plaid Link**: Instant bank verification (if enabled)
- **Manual Entry**: Direct ACH account details
- **Account Validation**: Real-time routing number validation

## Progress Tracking

**Component**: `OnboardingProgress.jsx`

Visual progress indicator showing:
- Current step highlighted
- Completed steps with checkmarks
- Remaining steps grayed out
- Step names and descriptions

## Security & Compliance Features

### Data Protection
- **No Local Storage**: Sensitive data passed via navigation state only
- **Input Masking**: SSN masked in display
- **Format Validation**: Real-time input formatting and validation
- **Error Handling**: Clear, user-friendly error messages

### Regulatory Compliance
- **KYC Requirements**: Collects all data required by Finix for identity verification
- **Age Verification**: Ensures users are 18+ for financial services
- **Address Verification**: Matches requirements for ACH processing
- **Identity Verification**: Real-time verification via Finix API

### User Experience
- **Progressive Disclosure**: Information collected in logical steps
- **Visual Progress**: Clear indication of completion status
- **Error Recovery**: Easy navigation back to edit information
- **Mobile Responsive**: Works on all device sizes

## API Endpoints Used

### Identity Creation
```javascript
POST /payments/create-identity
{
  userId: "temp-user-id",
  personalInfo: { /* formatted identity data */ }
}
```

**Response**:
```javascript
{
  identityId: "finix-identity-id",
  status: "VERIFIED",
  verification_status: "APPROVED"
}
```

## Error Handling

### Common Error Scenarios
1. **Invalid SSN**: Format or verification failure
2. **Age Restriction**: Under 18 years old
3. **Address Issues**: Invalid or unverifiable address
4. **API Failures**: Network or service errors
5. **Duplicate Identity**: User already exists

### Error Recovery
- Clear error messages with specific guidance
- Ability to go back and edit information
- Retry mechanisms for API failures
- Fallback options for verification issues

## Testing

### Mock Data for Development
The mock server (`dev-server.js`) provides realistic responses for all endpoints, allowing frontend development without backend deployment.

### Test Scenarios
1. **Happy Path**: Complete flow with valid data
2. **Validation Errors**: Test all form validations
3. **API Errors**: Test error handling and recovery
4. **Edge Cases**: Boundary conditions and unusual inputs

## Integration Points

### Finix Integration
- Identity creation and verification
- Compliance with Finix KYC requirements
- Error handling for verification failures

### Plaid Integration
- Bank account linking (optional)
- Instant account verification
- Fallback to manual entry

### State Management
- Data passed through React Router state
- No persistent storage of sensitive data
- Clean navigation flow with proper data flow

## Future Enhancements

### Potential Improvements
1. **Document Upload**: ID verification via photo upload
2. **Biometric Verification**: Face/fingerprint verification
3. **Enhanced Validation**: Real-time address validation
4. **Multi-language Support**: Internationalization
5. **Accessibility**: Enhanced screen reader support

### Analytics Integration
- Track completion rates by step
- Identify common drop-off points
- Monitor verification success rates
- A/B test different flows

This comprehensive onboarding flow ensures compliance with financial regulations while providing a smooth user experience for account creation and verification.