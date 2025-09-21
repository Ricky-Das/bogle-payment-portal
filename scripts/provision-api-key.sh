#!/usr/bin/env bash
set -euo pipefail

# Configuration
REGION="us-east-1"
PROFILE="${AWS_PROFILE:-bogle-prod}"
REST_API_ID="o7h8qusgd9"
STAGE="prod"
USAGE_PLAN_NAME="bogle-portal-${STAGE}"
API_KEY_NAME="bogle-portal-${STAGE}"

echo "Using profile: ${PROFILE} | region: ${REGION} | api: ${REST_API_ID} | stage: ${STAGE}"

# Find resource IDs
echo "Fetching resources..."
TXN_ID=$(aws apigateway get-resources --rest-api-id "$REST_API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/transactions'].id | [0]" --output text)
PROC_ID=$(aws apigateway get-resources --rest-api-id "$REST_API_ID" --region "$REGION" --profile "$PROFILE" --query "items[?path=='/payments/process-payment'].id | [0]" --output text)

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

# Require API key on methods
for METHOD in GET POST; do
  echo "Enabling apiKeyRequired for /transactions $METHOD"
  aws apigateway update-method \
    --rest-api-id "$REST_API_ID" \
    --resource-id "$TXN_ID" \
    --http-method "$METHOD" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --patch-operations op=replace,path=/apiKeyRequired,value=true >/dev/null
  echo "Done: /transactions $METHOD"

done

echo "Enabling apiKeyRequired for /payments/process-payment POST"
aws apigateway update-method \
  --rest-api-id "$REST_API_ID" \
  --resource-id "$PROC_ID" \
  --http-method POST \
  --region "$REGION" \
  --profile "$PROFILE" \
  --patch-operations op=replace,path=/apiKeyRequired,value=true >/dev/null

# Create or get usage plan
echo "Ensuring usage plan exists: $USAGE_PLAN_NAME"
PLAN_ID=$(aws apigateway get-usage-plans --region "$REGION" --profile "$PROFILE" --query "items[?name=='$USAGE_PLAN_NAME'].id | [0]" --output text)
if [[ -z "$PLAN_ID" || "$PLAN_ID" == "None" ]]; then
  PLAN_ID=$(aws apigateway create-usage-plan \
    --name "$USAGE_PLAN_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --api-stages apiId=$REST_API_ID,stage=$STAGE \
    --query id --output text)
  echo "Created usage plan: $PLAN_ID"
else
  echo "Found usage plan: $PLAN_ID"
fi

# Create API key
echo "Creating API key: $API_KEY_NAME"
KEY_ID=$(aws apigateway create-api-key \
  --name "$API_KEY_NAME" \
  --enabled \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query id --output text)

# Attach key to usage plan
aws apigateway create-usage-plan-key \
  --usage-plan-id "$PLAN_ID" \
  --key-id "$KEY_ID" \
  --key-type "API_KEY" \
  --region "$REGION" \
  --profile "$PROFILE" >/dev/null

echo "Attached API key to usage plan."

# Get the API key value
KEY_VALUE=$(aws apigateway get-api-key --api-key "$KEY_ID" --include-value --region "$REGION" --profile "$PROFILE" --query value --output text)

echo "\nAPI key created. Save this in your environment as VITE_API_KEY:"
echo "$KEY_VALUE"

# Redeploy stage
aws apigateway create-deployment --rest-api-id "$REST_API_ID" --stage-name "$STAGE" --description "Enable API key on methods and attach usage plan" --region "$REGION" --profile "$PROFILE" >/dev/null

echo "Deployment created. API key requirement should now be enforced."

