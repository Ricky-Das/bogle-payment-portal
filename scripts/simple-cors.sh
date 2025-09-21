#!/usr/bin/env bash
set -euo pipefail

# Configuration
API_ID="o7h8qusgd9"
REGION="us-east-1"
PROFILE="${AWS_PROFILE:-boglepay-prod}"
STAGE="prod"

echo "Setting up simple CORS with proper escaping..."
echo "Using profile: ${PROFILE} | region: ${REGION} | api: ${API_ID} | stage: ${STAGE}"

# Find resource IDs
TXN_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/transactions'].id | [0]" --output text)
PROC_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/payments/process-payment'].id | [0]" --output text)

echo "Transactions resource id: $TXN_ID"
echo "Process-payment resource id: $PROC_ID"

# Simple function to set up CORS properly
setup_cors() {
  local RID=$1
  local PATH_NAME=$2
  
  echo "Setting up CORS for $PATH_NAME..."
  
  # Clean up existing OPTIONS
  aws apigateway delete-integration --rest-api-id "$API_ID" --resource-id "$RID" --http-method OPTIONS --region "$REGION" --profile "$PROFILE" 2>/dev/null || true
  aws apigateway delete-method --rest-api-id "$API_ID" --resource-id "$RID" --http-method OPTIONS --region "$REGION" --profile "$PROFILE" 2>/dev/null || true
  
  # Create OPTIONS method
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --authorization-type "NONE" \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  # Create MOCK integration
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  # Create method response with headers
  aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-models '{"application/json": "Empty"}' \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  # Create integration response with static headers
  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null
  
  echo "  ✓ CORS configured for $PATH_NAME"
}

# Set up CORS on both endpoints
setup_cors "$TXN_ID" "/transactions"
setup_cors "$PROC_ID" "/payments/process-payment"

# Redeploy
echo "Redeploying API..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Simple CORS setup" \
  --region "$REGION" \
  --profile "$PROFILE" >/dev/null

echo ""
echo "✅ CORS setup complete!"
echo ""
echo "Testing OPTIONS now..."

# Test OPTIONS request
echo "Testing /payments/process-payment OPTIONS..."
curl -s -X OPTIONS "https://o7h8qusgd9.execute-api.us-east-1.amazonaws.com/prod/payments/process-payment" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,x-api-key" \
  -I | grep -E "(HTTP|Access-Control)" | head -10

echo ""
echo "Testing /transactions OPTIONS..."
curl -s -X OPTIONS "https://o7h8qusgd9.execute-api.us-east-1.amazonaws.com/prod/transactions" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,x-api-key" \
  -I | grep -E "(HTTP|Access-Control)" | head -10
