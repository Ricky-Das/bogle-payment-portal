#!/bin/bash

# Comprehensive Health Check Script for Bogle Payment Portal
# Checks infrastructure status, health endpoints, and system metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TERRAFORM_DIR="infrastructure/terraform"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    if curl -f -s --max-time "$timeout" "$url" >/dev/null 2>&1; then
        print_success "$name is accessible"
        return 0
    else
        print_error "$name is not accessible"
        return 1
    fi
}

# Function to get metric value from CloudWatch
get_metric() {
    local namespace=$1
    local metric_name=$2
    local dimension_name=$3
    local dimension_value=$4
    local start_time=$5
    
    aws cloudwatch get-metric-statistics \
        --namespace "$namespace" \
        --metric-name "$metric_name" \
        --dimensions Name="$dimension_name",Value="$dimension_value" \
        --start-time "$start_time" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0"
}

echo "🔍 Bogle Payment Portal - Comprehensive Health Check"
echo "====================================================="
echo "Timestamp: $(date)"
echo

# Check prerequisites
print_status "Checking prerequisites..."

if [ ! -d "$TERRAFORM_DIR" ]; then
    print_error "Terraform directory not found"
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    print_error "AWS CLI not found"
    exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_error "AWS credentials not configured"
    exit 1
fi

cd "$TERRAFORM_DIR"

# Check if Terraform state exists
if [ ! -f "terraform.tfstate" ]; then
    print_error "No Terraform state found. Infrastructure may not be deployed."
    exit 1
fi

print_success "Prerequisites check passed"

echo
echo "📊 Infrastructure Status"
echo "========================"

# Get Terraform outputs
API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
FRONTEND_URL="https://$(terraform output -raw cloudfront_domain_name 2>/dev/null || echo "")"
BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
AUTH_FUNCTION=$(terraform output -raw auth_lambda_name 2>/dev/null || echo "")
PAYMENT_FUNCTION=$(terraform output -raw payment_lambda_name 2>/dev/null || echo "")
USERS_TABLE=$(terraform output -raw users_table_name 2>/dev/null || echo "")
TRANSACTIONS_TABLE=$(terraform output -raw transactions_table_name 2>/dev/null || echo "")

echo "API Gateway URL: ${API_URL:-'Not deployed'}"
echo "Frontend URL: ${FRONTEND_URL/https:\/\//}"
echo "S3 Bucket: ${BUCKET_NAME:-'Not deployed'}"
echo "CloudFront Distribution: ${DISTRIBUTION_ID:-'Not deployed'}"
echo "Auth Lambda: ${AUTH_FUNCTION:-'Not deployed'}"
echo "Payment Lambda: ${PAYMENT_FUNCTION:-'Not deployed'}"

echo
echo "🏥 Health Checks"
echo "================"

health_score=0
total_checks=0

# API Health Check
if [ -n "$API_URL" ]; then
    total_checks=$((total_checks + 1))
    echo -n "API Health Endpoint: "
    if check_url "$API_URL/health" "API" 15; then
        health_score=$((health_score + 1))
    fi
else
    print_warning "API URL not available - skipping health check"
fi

# Frontend Health Check
if [ -n "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "https://" ]; then
    total_checks=$((total_checks + 1))
    echo -n "Frontend Accessibility: "
    if check_url "$FRONTEND_URL" "Frontend" 15; then
        health_score=$((health_score + 1))
    fi
else
    print_warning "Frontend URL not available - skipping health check"
fi

# Lambda Function Status
if [ -n "$AUTH_FUNCTION" ]; then
    total_checks=$((total_checks + 1))
    echo -n "Auth Lambda Status: "
    if aws lambda get-function --function-name "$AUTH_FUNCTION" >/dev/null 2>&1; then
        print_success "Active"
        health_score=$((health_score + 1))
    else
        print_error "Not found or inaccessible"
    fi
fi

if [ -n "$PAYMENT_FUNCTION" ]; then
    total_checks=$((total_checks + 1))
    echo -n "Payment Lambda Status: "
    if aws lambda get-function --function-name "$PAYMENT_FUNCTION" >/dev/null 2>&1; then
        print_success "Active"
        health_score=$((health_score + 1))
    else
        print_error "Not found or inaccessible"
    fi
fi

# DynamoDB Table Status
if [ -n "$USERS_TABLE" ]; then
    total_checks=$((total_checks + 1))
    echo -n "Users Table Status: "
    table_status=$(aws dynamodb describe-table --table-name "$USERS_TABLE" --query 'Table.TableStatus' --output text 2>/dev/null || echo "ERROR")
    if [ "$table_status" = "ACTIVE" ]; then
        print_success "Active"
        health_score=$((health_score + 1))
    else
        print_error "Status: $table_status"
    fi
fi

if [ -n "$TRANSACTIONS_TABLE" ]; then
    total_checks=$((total_checks + 1))
    echo -n "Transactions Table Status: "
    table_status=$(aws dynamodb describe-table --table-name "$TRANSACTIONS_TABLE" --query 'Table.TableStatus' --output text 2>/dev/null || echo "ERROR")
    if [ "$table_status" = "ACTIVE" ]; then
        print_success "Active"
        health_score=$((health_score + 1))
    else
        print_error "Status: $table_status"
    fi
fi

# CloudFront Distribution Status
if [ -n "$DISTRIBUTION_ID" ]; then
    total_checks=$((total_checks + 1))
    echo -n "CloudFront Distribution: "
    dist_status=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query 'Distribution.Status' --output text 2>/dev/null || echo "ERROR")
    if [ "$dist_status" = "Deployed" ]; then
        print_success "Deployed"
        health_score=$((health_score + 1))
    else
        print_warning "Status: $dist_status"
    fi
fi

# Calculate health percentage
if [ $total_checks -gt 0 ]; then
    health_percentage=$((health_score * 100 / total_checks))
    echo
    if [ $health_percentage -ge 90 ]; then
        print_success "Overall Health: $health_percentage% ($health_score/$total_checks checks passed)"
    elif [ $health_percentage -ge 70 ]; then
        print_warning "Overall Health: $health_percentage% ($health_score/$total_checks checks passed)"
    else
        print_error "Overall Health: $health_percentage% ($health_score/$total_checks checks passed)"
    fi
fi

echo
echo "📈 Performance Metrics (Last Hour)"
echo "=================================="

# Get current time minus 1 hour
start_time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)

if [ -n "$AUTH_FUNCTION" ]; then
    invocations=$(get_metric "AWS/Lambda" "Invocations" "FunctionName" "$AUTH_FUNCTION" "$start_time")
    errors=$(get_metric "AWS/Lambda" "Errors" "FunctionName" "$AUTH_FUNCTION" "$start_time")
    echo "Auth Lambda - Invocations: $invocations, Errors: $errors"
fi

if [ -n "$PAYMENT_FUNCTION" ]; then
    invocations=$(get_metric "AWS/Lambda" "Invocations" "FunctionName" "$PAYMENT_FUNCTION" "$start_time")
    errors=$(get_metric "AWS/Lambda" "Errors" "FunctionName" "$PAYMENT_FUNCTION" "$start_time")
    echo "Payment Lambda - Invocations: $invocations, Errors: $errors"
fi

# API Gateway metrics
if [ -n "$API_URL" ]; then
    api_name=$(terraform output -raw api_gateway_id 2>/dev/null || echo "")
    if [ -n "$api_name" ]; then
        api_count=$(get_metric "AWS/ApiGateway" "Count" "ApiName" "$api_name" "$start_time")
        api_4xx=$(get_metric "AWS/ApiGateway" "4XXError" "ApiName" "$api_name" "$start_time")
        api_5xx=$(get_metric "AWS/ApiGateway" "5XXError" "ApiName" "$api_name" "$start_time")
        echo "API Gateway - Requests: $api_count, 4XX Errors: $api_4xx, 5XX Errors: $api_5xx"
    fi
fi

echo
echo "🔍 Recent Error Analysis"
echo "========================"

# Check for recent errors in Lambda logs
if [ -n "$AUTH_FUNCTION" ]; then
    error_count=$(aws logs filter-log-events \
        --log-group-name "/aws/lambda/$AUTH_FUNCTION" \
        --start-time $(date -d '1 hour ago' +%s)000 \
        --filter-pattern "ERROR" \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$error_count" -gt 0 ]; then
        print_warning "Auth Lambda: $error_count errors in the last hour"
    else
        print_success "Auth Lambda: No errors in the last hour"
    fi
fi

if [ -n "$PAYMENT_FUNCTION" ]; then
    error_count=$(aws logs filter-log-events \
        --log-group-name "/aws/lambda/$PAYMENT_FUNCTION" \
        --start-time $(date -d '1 hour ago' +%s)000 \
        --filter-pattern "ERROR" \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$error_count" -gt 0 ]; then
        print_warning "Payment Lambda: $error_count errors in the last hour"
    else
        print_success "Payment Lambda: No errors in the last hour"
    fi
fi

echo
echo "💰 Cost Analysis"
echo "================"

# Get current month cost
current_month_start=$(date +%Y-%m-01)
current_date=$(date +%Y-%m-%d)

cost=$(aws ce get-cost-and-usage \
    --time-period Start="$current_month_start",End="$current_date" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
    --output text 2>/dev/null || echo "0")

if [ "$cost" != "0" ] && [ -n "$cost" ]; then
    printf "Current month cost: $%.2f USD\n" "$cost"
else
    echo "Cost data not available (may take 24 hours to appear)"
fi

echo
echo "🔧 Useful Commands"
echo "=================="
echo "View API logs:"
echo "  aws logs tail /aws/lambda/$AUTH_FUNCTION --follow"
echo
echo "View payment logs:"
echo "  aws logs tail /aws/lambda/$PAYMENT_FUNCTION --follow"
echo
echo "Monitor dashboard:"
dashboard_url=$(terraform output -raw cloudwatch_dashboard_url 2>/dev/null || echo "")
if [ -n "$dashboard_url" ]; then
    echo "  $dashboard_url"
else
    echo "  https://console.aws.amazon.com/cloudwatch/home#dashboards:"
fi
echo
echo "Test API endpoint:"
echo "  curl $API_URL/health"
echo
echo "Deploy updates:"
echo "  ./deploy-production.sh"
echo
echo "Configure secrets:"
echo "  python3 configure-secrets.py"

cd "$SCRIPT_DIR"

echo
echo "✅ Health check completed at $(date)"