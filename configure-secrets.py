#!/usr/bin/env python3
"""
Secure Secrets Configuration Script for Bogle Payment Portal

This script securely configures API credentials in AWS Secrets Manager
without exposing sensitive values in logs or terminal history.
"""

import json
import sys
import getpass
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import re

class SecretsManager:
    def __init__(self):
        try:
            self.secrets_client = boto3.client('secretsmanager')
            self.sts_client = boto3.client('sts')
            
            # Verify AWS credentials
            self.account_id = self.sts_client.get_caller_identity()['Account']
            print(f"✅ Connected to AWS Account: {self.account_id}")
            
        except NoCredentialsError:
            print("❌ AWS credentials not configured. Run 'aws configure' first.")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error connecting to AWS: {e}")
            sys.exit(1)

    def validate_phone(self, phone):
        """Validate phone number format"""
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', phone)
        
        # Check if it's a valid US phone number (10 or 11 digits)
        if len(digits_only) == 10:
            return f"+1{digits_only}"
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            return f"+{digits_only}"
        else:
            return None

    def validate_finix_credentials(self, api_key, api_secret):
        """Validate Finix API credentials format"""
        if not api_key.startswith('PK_'):
            return False, "API Key must start with 'PK_'"
        
        if not api_secret.startswith('SK_'):
            return False, "API Secret must start with 'SK_'"
        
        if len(api_key) < 20 or len(api_secret) < 20:
            return False, "Credentials appear to be too short"
        
        return True, "Valid"

    def validate_plaid_credentials(self, client_id, secret_key):
        """Validate Plaid API credentials format"""
        if len(client_id) < 10:
            return False, "Client ID appears to be too short"
        
        if len(secret_key) < 20:
            return False, "Secret Key appears to be too short"
        
        return True, "Valid"

    def get_finix_credentials(self):
        """Securely collect Finix API credentials"""
        print("\n🔐 Finix API Credentials")
        print("Get these from: https://dashboard.finix.com/settings/api-keys")
        print("Note: Use PRODUCTION credentials for live payments")
        
        while True:
            api_key = getpass.getpass("Finix API Key (PK_...): ").strip()
            api_secret = getpass.getpass("Finix API Secret (SK_...): ").strip()
            
            if not api_key or not api_secret:
                print("❌ Both API Key and Secret are required")
                continue
            
            valid, message = self.validate_finix_credentials(api_key, api_secret)
            if not valid:
                print(f"❌ {message}")
                continue
            
            # Ask for environment confirmation
            env = input("Environment (sandbox/live) [sandbox]: ").strip().lower()
            if not env:
                env = "sandbox"
            
            if env not in ['sandbox', 'live']:
                print("❌ Environment must be 'sandbox' or 'live'")
                continue
            
            return {
                "api_key": api_key,
                "api_secret": api_secret,
                "environment": env
            }

    def get_plaid_credentials(self):
        """Securely collect Plaid API credentials"""
        print("\n🔐 Plaid API Credentials")
        print("Get these from: https://dashboard.plaid.com/team/keys")
        print("Note: Use PRODUCTION credentials for live bank verification")
        
        enable_plaid = input("Enable Plaid integration? (y/N): ").strip().lower()
        if enable_plaid not in ['y', 'yes']:
            return None
        
        while True:
            client_id = getpass.getpass("Plaid Client ID: ").strip()
            secret_key = getpass.getpass("Plaid Secret Key: ").strip()
            
            if not client_id or not secret_key:
                print("❌ Both Client ID and Secret Key are required")
                continue
            
            valid, message = self.validate_plaid_credentials(client_id, secret_key)
            if not valid:
                print(f"❌ {message}")
                continue
            
            # Ask for environment confirmation
            env = input("Environment (sandbox/development/production) [sandbox]: ").strip().lower()
            if not env:
                env = "sandbox"
            
            if env not in ['sandbox', 'development', 'production']:
                print("❌ Environment must be 'sandbox', 'development', or 'production'")
                continue
            
            return {
                "client_id": client_id,
                "secret": secret_key,
                "environment": env
            }

    def store_secret(self, secret_name, secret_value, description):
        """Store secret in AWS Secrets Manager"""
        try:
            # Try to update existing secret
            self.secrets_client.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps(secret_value),
                Description=description
            )
            print(f"✅ Updated existing secret: {secret_name}")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                # Create new secret
                try:
                    response = self.secrets_client.create_secret(
                        Name=secret_name,
                        SecretString=json.dumps(secret_value),
                        Description=description
                    )
                    print(f"✅ Created new secret: {secret_name}")
                    return response['ARN']
                    
                except ClientError as create_error:
                    print(f"❌ Error creating secret {secret_name}: {create_error}")
                    return None
            else:
                print(f"❌ Error updating secret {secret_name}: {e}")
                return None

    def configure_finix_secrets(self, project_name):
        """Configure Finix secrets"""
        print("\n📝 Configuring Finix API credentials...")
        
        finix_creds = self.get_finix_credentials()
        
        secret_name = f"{project_name}-finix-keys"
        description = f"Finix API credentials for {project_name} payment processing"
        
        arn = self.store_secret(secret_name, finix_creds, description)
        return secret_name, arn

    def configure_plaid_secrets(self, project_name):
        """Configure Plaid secrets"""
        print("\n📝 Configuring Plaid API credentials...")
        
        plaid_creds = self.get_plaid_credentials()
        
        if not plaid_creds:
            print("⏭️  Skipping Plaid configuration")
            return None, None
        
        secret_name = f"{project_name}-plaid-keys"
        description = f"Plaid API credentials for {project_name} bank verification"
        
        arn = self.store_secret(secret_name, plaid_creds, description)
        return secret_name, arn

    def update_terraform_vars(self, project_name, enable_plaid):
        """Update terraform.tfvars with configuration"""
        tfvars_path = "infrastructure/terraform.tfvars"
        
        try:
            # Read existing tfvars
            try:
                with open(tfvars_path, 'r') as f:
                    content = f.read()
            except FileNotFoundError:
                content = ""
            
            # Update or add enable_plaid setting
            plaid_setting = f'enable_plaid = {str(enable_plaid).lower()}'
            
            if 'enable_plaid' in content:
                # Replace existing setting
                content = re.sub(r'enable_plaid\s*=\s*\w+', plaid_setting, content)
            else:
                # Add new setting
                content += f'\n# Feature Configuration\n{plaid_setting}\n'
            
            # Write updated content
            with open(tfvars_path, 'w') as f:
                f.write(content)
            
            print(f"✅ Updated {tfvars_path}")
            
        except Exception as e:
            print(f"⚠️  Could not update terraform.tfvars: {e}")
            print(f"   Please manually set: enable_plaid = {str(enable_plaid).lower()}")

def main():
    print("🔐 Bogle Payment Portal - Secure Secrets Configuration")
    print("=" * 60)
    
    # Get project name
    project_name = input("Project name [bogle-payment-portal]: ").strip()
    if not project_name:
        project_name = "bogle-payment-portal"
    
    # Initialize secrets manager
    sm = SecretsManager()
    
    # Configure secrets
    finix_name, finix_arn = sm.configure_finix_secrets(project_name)
    plaid_name, plaid_arn = sm.configure_plaid_secrets(project_name)
    
    # Update terraform configuration
    sm.update_terraform_vars(project_name, plaid_name is not None)
    
    # Display summary
    print("\n" + "=" * 60)
    print("✅ Configuration completed successfully!")
    print("\n📋 Summary:")
    print(f"   Finix Secret: {finix_name}")
    if plaid_name:
        print(f"   Plaid Secret: {plaid_name}")
        print(f"   Plaid Enabled: Yes")
    else:
        print(f"   Plaid Enabled: No")
    
    print("\n🚀 Next Steps:")
    print("1. Review your infrastructure/terraform.tfvars file")
    print("2. Run the deployment script: ./deploy-production.sh")
    print("3. Test your payment integration after deployment")
    
    print("\n🔒 Security Notes:")
    print("- Your credentials are encrypted in AWS Secrets Manager")
    print("- Lambda functions will access secrets securely at runtime")
    print("- Never commit API keys to version control")
    
    print("\n📞 Support:")
    print("- Finix: https://docs.finix.com")
    print("- Plaid: https://plaid.com/docs")
    print("- AWS Secrets Manager: https://docs.aws.amazon.com/secretsmanager/")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Configuration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)