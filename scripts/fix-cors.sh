#!/usr/bin/env bash
set -euo pipefail

# Configuration
API_ID="o7h8qusgd9"
REGION="us-east-1"
PROFILE="${AWS_PROFILE:-boglepay-prod}"
STAGE="prod"

echo "Fixing CORS OPTIONS integration..."
echo "Using profile: ${PROFILE} | region: ${REGION} | api: ${API_ID} | stage: ${STAGE}"

# Find resource IDs
echo "Fetching resource IDs..."
TXN_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/transactions'].id | [0]" --output text)
PROC_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/payments/process-payment'].id | [0]" --output text)

echo "Transactions resource id: $TXN_ID"
echo "Process-payment resource id: $PROC_ID"

# Helper function to fix CORS on a resource
fix_cors() {
  local RID=$1
  local PATH_NAME=$2
  
  echo "Fixing CORS for $PATH_NAME (resource: $RID)..."
  
  # Delete and recreate the OPTIONS integration with proper template
  echo "  Deleting existing integration..."
  aws apigateway delete-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --region "$REGION" \
    --profile "$PROFILE" 2>/dev/null || true
  
  # Recreate MOCK integration with correct template
  echo "  Creating new MOCK integration..."
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --type MOCK \
    --integration-http-method OPTIONS \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  # Delete and recreate integration response
  echo "  Recreating integration response..."
  aws apigateway delete-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --status-code 200 \
    --region "$REGION" \
    --profile "$PROFILE" 2>/dev/null || true
  
  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers":"\"Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key\"",
      "method.response.header.Access-Control-Allow-Methods":"\"GET,POST,OPTIONS\"",
      "method.response.header.Access-Control-Allow-Origin":"\"*\""
    }' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  echo "  CORS fixed for $PATH_NAME ✓"
}

# Fix CORS on both endpoints
fix_cors "$TXN_ID" "/transactions"
fix_cors "$PROC_ID" "/payments/process-payment"

# Redeploy the API
echo "Redeploying API to stage: $STAGE..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Fix CORS OPTIONS integration" \
  --region "$REGION" \
  --profile "$PROFILE" >/dev/null

echo ""
echo "✅ CORS has been fixed and API redeployed!"
echo ""
echo "Testing OPTIONS request now..."
