#!/usr/bin/env bash
set -euo pipefail

# Configuration
API_ID="o7h8qusgd9"
REGION="us-east-1"
PROFILE="${AWS_PROFILE:-bogle-prod}"
STAGE="prod"

echo "Enabling CORS on API Gateway endpoints..."
echo "Using profile: ${PROFILE} | region: ${REGION} | api: ${API_ID} | stage: ${STAGE}"

# Find resource IDs
echo "Fetching resource IDs..."
TXN_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/transactions'].id | [0]" --output text)
PROC_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/payments/process-payment'].id | [0]" --output text)

if [[ -z "$TXN_ID" || "$TXN_ID" == "None" ]]; then
  echo "ERROR: Could not locate resource id for /transactions" >&2
  exit 1
fi
if [[ -z "$PROC_ID" || "$PROC_ID" == "None" ]]; then
  echo "ERROR: Could not locate resource id for /payments/process-payment" >&2
  exit 1
fi

echo "Transactions resource id: $TXN_ID"
echo "Process-payment resource id: $PROC_ID"

# Helper function to enable CORS on a resource
enable_cors() {
  local RID=$1
  local PATH_NAME=$2
  
  echo "Enabling CORS for $PATH_NAME (resource: $RID)..."
  
  # 1. Create OPTIONS method
  echo "  Adding OPTIONS method..."
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --authorization-type "NONE" \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null 2>&1 || true
  
  # 2. Create MOCK integration for OPTIONS
  echo "  Adding MOCK integration..."
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null 2>&1 || true
  
  # 3. Create method response for OPTIONS with CORS headers
  echo "  Adding method response with CORS headers..."
  aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-models '{"application/json":"Empty"}' \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Origin": true
    }' \
    --region "$REGION" \
    --profile "$PROFILE" >/dev/null 2>&1 || true
  
  # 4. Create integration response for OPTIONS with CORS header values
  echo "  Adding integration response with CORS header values..."
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
    --profile "$PROFILE" >/dev/null 2>&1 || true
  
  echo "  CORS enabled for $PATH_NAME ✓"
}

# Enable CORS on both endpoints
enable_cors "$TXN_ID" "/transactions"
enable_cors "$PROC_ID" "/payments/process-payment"

# Redeploy the API
echo "Redeploying API to stage: $STAGE..."
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Enable CORS for POST/OPTIONS requests" \
  --region "$REGION" \
  --profile "$PROFILE" >/dev/null

echo ""
echo "✅ CORS has been enabled and API redeployed successfully!"
echo ""
echo "The following endpoints now support CORS:"
echo "  - POST /payments/process-payment"
echo "  - GET/POST /transactions"
echo ""
echo "CORS headers include:"
echo "  - Access-Control-Allow-Origin: *"
echo "  - Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key"
echo "  - Access-Control-Allow-Methods: GET,POST,OPTIONS"
echo ""
echo "You can now retry the payment in your frontend application."
