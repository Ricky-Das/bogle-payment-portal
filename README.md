# Bogle Payment Portal

A secure React-based payment portal with AWS infrastructure, supporting both credit card and ACH payments through Finix and Plaid integration.

## ✨ Features

- **Modern Frontend**: React 18 + Vite with Tailwind CSS
- **Secure Payments**: Credit card and ACH processing via Finix
- **Bank Verification**: Plaid Link integration for instant account verification
- **AWS Infrastructure**: Serverless backend with Lambda, API Gateway, and DynamoDB
- **Complete KYC Flow**: Identity verification and onboarding process
- **Security First**: AWS Secrets Manager, KMS encryption, WAF protection

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start with mock API (recommended for frontend development)
./start-dev.sh

# Or start with Vite directly
npm run dev
```

### Production Deployment
See the comprehensive [SETUP_GUIDE.md](SETUP_GUIDE.md) for full production deployment instructions.

## 📂 Project Structure

```
.
├─ src/                    # React application source
│  ├─ components/          # Reusable UI components
│  ├─ pages/              # Page components
│  └─ config/             # Configuration files
├─ infrastructure/         # AWS infrastructure code
│  ├─ terraform/          # Terraform configurations
│  └─ lambda/             # Lambda function source
├─ SETUP_GUIDE.md         # Complete deployment guide
├─ ONBOARDING_FLOW.md     # User onboarding documentation
└─ check_status.sh        # Infrastructure health check
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run dev:mock` - Start with mock API server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `./start-dev.sh` - Interactive development setup
- `./check_status.sh` - Check deployed infrastructure status


## 📝 License

MIT