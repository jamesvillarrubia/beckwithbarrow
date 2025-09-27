#!/bin/bash

# Strapi Cloud Deployment Script
# Pushes local Strapi data to Strapi Cloud instance

set -e  # Exit on any error

# Configuration
LOCAL_BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_NAME="cloud-deploy-${TIMESTAMP}"
VERBOSE=${VERBOSE:-true}

# Strapi Cloud Configuration (set via environment variables)
STRAPI_CLOUD_API_TOKEN=${STRAPI_CLOUD_API_TOKEN:-""}
STRAPI_CLOUD_PROJECT_ID=${STRAPI_CLOUD_PROJECT_ID:-""}
STRAPI_CLOUD_BASE_URL=${STRAPI_CLOUD_BASE_URL:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_config() {
    log_info "Checking Strapi Cloud configuration..."
    
    if [ -z "$STRAPI_CLOUD_API_TOKEN" ]; then
        log_error "STRAPI_CLOUD_API_TOKEN environment variable is not set"
        log_info "Please run: source strapi-cloud.env"
        exit 1
    fi
    
    if [ -z "$STRAPI_CLOUD_PROJECT_ID" ]; then
        log_error "STRAPI_CLOUD_PROJECT_ID environment variable is not set"
        log_info "Please run: source strapi-cloud.env"
        exit 1
    fi
    
    if [ -z "$STRAPI_CLOUD_BASE_URL" ]; then
        log_error "STRAPI_CLOUD_BASE_URL environment variable is not set"
        log_info "Please run: source strapi-cloud.env"
        exit 1
    fi
    
    log_success "Configuration validated"
}

# Create local backup before deployment
create_backup_before_deploy() {
    log_info "Creating automatic backup before deployment..."
    
    # Ensure auto backup directory exists
    mkdir -p "backups/auto"
    
    if pnpm strapi export --file "backups/auto/auto-pre-deploy-${TIMESTAMP}" --no-encrypt > /dev/null 2>&1; then
        log_success "Auto pre-deployment backup created: auto-pre-deploy-${TIMESTAMP}.tar.gz"
    else
        log_warning "Failed to create auto pre-deployment backup"
    fi
}

# Create cloud backup before deployment
create_cloud_backup_before_deploy() {
    log_info "Creating cloud backup before deployment..."
    
    if source strapi-cloud.env && ./scripts/cloud-backup.sh > /dev/null 2>&1; then
        log_success "Pre-deployment cloud backup created"
    else
        log_warning "Failed to create pre-deployment cloud backup"
    fi
}

# Deploy content via API
deploy_content_type() {
    local content_type=$1
    local endpoint=$2
    local method=${3:-POST}
    
    log_info "Deploying $content_type..."
    
    # Export specific content type from local Strapi
    local temp_file="/tmp/${content_type}-export.json"
    
    # Get local data
    if curl -s "http://localhost:1337/api/${endpoint}?populate=*" > "$temp_file" 2>/dev/null; then
        local data=$(cat "$temp_file")
        
        # Check if we have data
        if echo "$data" | jq -e '.data | length > 0' > /dev/null 2>&1; then
            # Process each item
            echo "$data" | jq -c '.data[]' | while read -r item; do
                local item_data=$(echo "$item" | jq '.attributes')
                
                # Post to cloud
                local response=$(curl -s -X "$method" \
                    -H "Authorization: Bearer $STRAPI_CLOUD_API_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "{\"data\": $item_data}" \
                    "${STRAPI_CLOUD_BASE_URL}/api/${endpoint}")
                
                if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
                    log_success "Deployed $content_type item"
                else
                    log_warning "Failed to deploy $content_type item: $(echo "$response" | jq -r '.error.message // "Unknown error"')"
                fi
            done
        else
            log_info "No $content_type data to deploy"
        fi
    else
        log_warning "Could not fetch local $content_type data. Is your local Strapi running?"
    fi
    
    rm -f "$temp_file"
}

# Deploy media files
deploy_media() {
    log_info "Deploying media files..."
    log_warning "Media file deployment requires manual implementation"
    log_info "Consider using Strapi's built-in transfer features for media"
}

# Use Strapi transfer command if available
try_strapi_transfer() {
    log_info "Attempting Strapi data transfer..."
    
    # Check if transfer command is available
    if pnpm strapi transfer --help > /dev/null 2>&1; then
        log_info "Strapi transfer command found, attempting transfer..."
        
        # Try to transfer using Strapi's built-in command
        if pnpm strapi transfer \
            --to "strapi-cloud://${STRAPI_CLOUD_PROJECT_ID}" \
            --token "$STRAPI_CLOUD_API_TOKEN" \
            --force; then
            log_success "Strapi transfer completed successfully"
            return 0
        else
            log_warning "Strapi transfer failed, falling back to API method"
            return 1
        fi
    else
        log_warning "Strapi transfer command not available, using API method"
        return 1
    fi
}

# Deploy via API method
deploy_via_api() {
    log_info "Deploying data via API method..."
    
    # Check if local Strapi is running
    if ! curl -s "http://localhost:1337/api" > /dev/null 2>&1; then
        log_error "Local Strapi is not running on port 1337"
        log_info "Please start your local Strapi: pnpm dev"
        exit 1
    fi
    
    # Deploy different content types
    deploy_content_type "projects" "projects"
    deploy_content_type "categories" "categories"
    deploy_content_type "about" "about"
    deploy_content_type "global" "global"
    
    # Deploy media files (placeholder)
    deploy_media
}

# Display deployment help
show_deploy_help() {
    log_info "=== Strapi Cloud Deployment Help ==="
    echo
    log_info "This script pushes your local Strapi data to Strapi Cloud."
    echo
    log_info "Prerequisites:"
    log_info "1. Local Strapi must be running: pnpm dev"
    log_info "2. Cloud credentials must be configured: source strapi-cloud.env"
    log_info "3. API tokens must have write permissions"
    echo
    log_info "Deployment methods (tried in order):"
    log_info "1. Strapi transfer command (if available)"
    log_info "2. API-based deployment (fallback)"
    echo
    log_info "What gets deployed:"
    log_info "- Content types (projects, categories, about, global)"
    log_info "- Content data and relationships"
    log_info "- Media files (manual implementation required)"
    echo
    log_warning "IMPORTANT: This will overwrite data in your Strapi Cloud!"
    log_warning "Backups are created automatically before deployment."
    echo
}

# Main execution
main() {
    log_info "=== Strapi Cloud Deployment Script ==="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Deploy name: $DEPLOY_NAME"
    echo
    
    # Check configuration
    check_config
    
    # Create backups before deployment
    create_backup_before_deploy
    create_cloud_backup_before_deploy
    
    # Try Strapi transfer first, fall back to API if it fails
    if ! try_strapi_transfer; then
        deploy_via_api
    fi
    
    echo
    log_success "=== Deployment Process Complete ==="
    log_info "Local backup: backups/auto/auto-pre-deploy-${TIMESTAMP}.tar.gz"
    log_info "Cloud backup: ./backups/cloud/cloud-*.tar.gz"
    
    echo
    log_warning "Remember to verify your deployment in Strapi Cloud!"
    log_info "Visit: ${STRAPI_CLOUD_BASE_URL}/admin"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_deploy_help
        exit 0
        ;;
    --dry-run)
        log_info "Dry run mode - no actual deployment will occur"
        log_info "This would deploy local data to: $STRAPI_CLOUD_BASE_URL"
        exit 0
        ;;
    *)
        # Confirm deployment
        echo -e "${YELLOW}WARNING:${NC} This will push local data to Strapi Cloud and may overwrite existing data."
        echo -e "${YELLOW}Cloud URL:${NC} $STRAPI_CLOUD_BASE_URL"
        echo
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
        
        main "$@"
        ;;
esac
