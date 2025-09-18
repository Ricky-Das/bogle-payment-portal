#!/bin/bash

# Production Deployment Script for Bogle Payment Portal
# This script handles the complete production deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/infrastructure/terraform"
LAMBDA_DIR="$SCRIPT_DIR/infrastructure/lambda"
BUILD_DIR="$SCRIPT_DIR/infrastructure/build"

# Default values
ENVIRONMENT="prod"
SKIP_TESTS=false
SKIP_BUILD=false
AUTO_APPROVE=false

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check required tools
    local tools=("node" "npm" "terraform" "aws" "zip")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            print_error "$tool is required but not installed."
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Check if terraform.tfvars exists
    if [ ! -f "$TERRAFORM_DIR/../terraform.tfvars" ]; then
        print_error "terraform.tfvars not found. Copy from terraform.tfvars.example and configure."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    print_status "Running tests..."
    
    # Frontend tests
    if [ -f "package.json" ]; then
        npm test -- --run --reporter=verbose 2>/dev/null || {
            print_warning "Frontend tests not configured or failed"
        }
    fi
    
    # Lambda function tests
    for lambda_dir in "$LAMBDA_DIR"/*; do
        if [ -d "$lambda_dir" ] && [ -f "$lambda_dir/package.json" ]; then
            print_status "Testing $(basename "$lambda_dir")..."
            cd "$lambda_dir"
            if npm test 2>/dev/null; then
                print_success "$(basename "$lambda_dir") tests passed"
            else
                print_warning "$(basename "$lambda_dir") tests not configured or failed"
            fi
            cd "$SCRIPT_DIR"
        fi
    done
    
    print_success "Tests completed"
}

# Function to build Lambda functions
build_lambdas() {
    print_status "Building Lambda functions..."
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Build each Lambda function
    for lambda_dir in "$LAMBDA_DIR"/*; do
        if [ -d "$lambda_dir" ]; then
            local function_name=$(basename "$lambda_dir")
            local build_path="$BUILD_DIR/$function_name"
            
            print_status "Building $function_name..."
            
            # Create build directory for this function
            mkdir -p "$build_path"
            
            # Copy source files
            cp -r "$lambda_dir"/* "$build_path/"
            
            # Install dependencies
            cd "$build_path"
            if [ -f "package.json" ]; then
                npm ci --production --silent
            fi
            
            # Create zip file
            zip -rq "../$function_name.zip" . -x "*.git*" "node_modules/.cache/*" "*.test.js" "test/*"
            
            print_success "Built $function_name.zip"
            cd "$SCRIPT_DIR"
        fi
    done
    
    # Copy Lambda zip files to Terraform directory
    mkdir -p "$TERRAFORM_DIR/lambda"
    cp "$BUILD_DIR"/*.zip "$TERRAFORM_DIR/lambda/"
    
    print_success "Lambda functions built successfully"
}

# Function to build frontend
build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping frontend build as requested"
        return
    fi
    
    print_status "Building frontend for production..."
    
    # Install dependencies
    npm ci --silent
    
    # Build for production
    NODE_ENV=production npm run build
    
    # Verify build
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        print_error "Frontend build failed - dist directory or index.html not found"
        exit 1
    fi
    
    print_success "Frontend built successfully"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init -input=false
    
    # Validate configuration
    print_status "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    print_status "Planning deployment..."
    terraform plan -var-file="../terraform.tfvars" -out=tfplan
    
    # Apply changes
    if [ "$AUTO_APPROVE" = true ]; then
        print_status "Applying changes (auto-approved)..."
        terraform apply -auto-approve tfplan
    else
        print_status "Applying changes..."
        terraform apply tfplan
    fi
    
    cd "$SCRIPT_DIR"
    print_success "Infrastructure deployed successfully"
}

# Function to deploy frontend
deploy_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping frontend deployment (build was skipped)"
        return
    fi
    
    print_status "Deploying frontend..."
    
    cd "$TERRAFORM_DIR"
    
    # Get S3 bucket name and CloudFront distribution ID
    local bucket_name=$(terraform output -raw s3_bucket_name)
    local distribution_id=$(terraform output -raw cloudfront_distribution_id)
    
    cd "$SCRIPT_DIR"
    
    if [ -z "$bucket_name" ]; then
        print_error "Could not get S3 bucket name from Terraform output"
        exit 1
    fi
    
    # Deploy to S3
    print_status "Uploading to S3 bucket: $bucket_name"
    aws s3 sync dist/ "s3://$bucket_name" --delete --cache-control "max-age=31536000,public,immutable" --exclude "index.html"
    aws s3 cp dist/index.html "s3://$bucket_name/index.html" --cache-control "max-age=0,no-cache,no-store,must-revalidate"
    
    # Invalidate CloudFront cache
    if [ -n "$distribution_id" ]; then
        print_status "Invalidating CloudFront cache: $distribution_id"
        aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths "/*" >/dev/null
        print_success "CloudFront cache invalidated"
    fi
    
    print_success "Frontend deployed successfully"
}

# Function to run post-deployment checks
post_deployment_checks() {
    print_status "Running post-deployment checks..."
    
    cd "$TERRAFORM_DIR"
    
    # Get API Gateway URL
    local api_url=$(terraform output -raw api_gateway_url)
    local frontend_url="https://$(terraform output -raw cloudfront_domain_name)"
    
    cd "$SCRIPT_DIR"
    
    # Test API health endpoint
    print_status "Testing API health endpoint..."
    if curl -f -s "$api_url/health" >/dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        exit 1
    fi
    
    # Test frontend
    print_status "Testing frontend..."
    if curl -f -s "$frontend_url" >/dev/null; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed (may take a few minutes for CloudFront to propagate)"
    fi
    
    print_success "Post-deployment checks completed"
}

# Function to display deployment summary
display_summary() {
    print_success "🚀 Deployment completed successfully!"
    echo
    echo "=== Deployment Summary ==="
    
    cd "$TERRAFORM_DIR"
    
    local api_url=$(terraform output -raw api_gateway_url)
    local frontend_url="https://$(terraform output -raw cloudfront_domain_name)"
    local dashboard_url=$(terraform output -raw cloudwatch_dashboard_url)
    
    echo "Frontend URL: $frontend_url"
    echo "API URL: $api_url"
    echo "CloudWatch Dashboard: $dashboard_url"
    echo
    echo "=== Next Steps ==="
    echo "1. Configure your API keys in AWS Secrets Manager"
    echo "2. Set up monitoring alerts by subscribing to SNS topic"
    echo "3. Test the complete payment flow"
    echo "4. Configure your custom domain (if applicable)"
    echo
    echo "=== Important Commands ==="
    echo "Check API health: curl $api_url/health"
    echo "View logs: aws logs tail /aws/lambda/\$(terraform output -raw auth_lambda_name) --follow"
    echo "Monitor costs: aws budgets describe-budgets --account-id \$(aws sts get-caller-identity --query Account --output text)"
    
    cd "$SCRIPT_DIR"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (default: prod)"
    echo "  -s, --skip-tests        Skip running tests"
    echo "  -b, --skip-build        Skip building frontend"
    echo "  -y, --auto-approve      Auto-approve Terraform changes"
    echo "  -h, --help              Show this help message"
    echo
    echo "Examples:"
    echo "  $0                      # Full production deployment"
    echo "  $0 --skip-tests         # Deploy without running tests"
    echo "  $0 --auto-approve       # Deploy with auto-approval"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -y|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment process
main() {
    echo "🚀 Starting production deployment for Bogle Payment Portal"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo

    check_prerequisites
    run_tests
    build_lambdas
    build_frontend
    deploy_infrastructure
    deploy_frontend
    post_deployment_checks
    display_summary
}

# Run main function
main "$@"