#!/bin/bash

# Strapi Cloud Push Transfer Script
# Pushes data FROM local TO Strapi Cloud using the native transfer command
# Usage: ./scripts/transfer-to-cloud.sh [--dry-run] [--force] [--exclude-files]

set -e  # Exit on any error

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

# Check if strapi-cloud.env exists
check_env_file() {
    if [ ! -f "strapi-cloud.env" ]; then
        log_error "strapi-cloud.env file not found!"
        log_info "Please create it from strapi-cloud.env.example and fill in your values"
        exit 1
    fi
}

# Source environment variables
source_env() {
    log_info "Loading Strapi Cloud configuration..."
    source strapi-cloud.env
    
    if [ -z "$STRAPI_CLOUD_BASE_URL" ]; then
        log_error "STRAPI_CLOUD_BASE_URL not set in strapi-cloud.env"
        exit 1
    fi
    
    if [ -z "$STRAPI_CLOUD_TRANSFER_TOKEN" ]; then
        log_error "STRAPI_CLOUD_TRANSFER_TOKEN not set in strapi-cloud.env"
        exit 1
    fi
    
    log_success "Configuration loaded successfully"
    log_info "Target URL: $STRAPI_CLOUD_BASE_URL/admin"
}

# Create backup before transfer
create_backup() {
    log_info "Creating automatic backup before transfer..."
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="backups/auto/auto-pre-transfer-${timestamp}"
    
    # Ensure auto backup directory exists
    mkdir -p "backups/auto"
    
    # Create logs directory for auto backup logs
    mkdir -p "logs"
    local auto_log_file="logs/auto-backup-$(date +%Y%m%d-%H%M%S).log"
    
    if pnpm strapi export --file "$backup_file" --no-encrypt > "$auto_log_file" 2>&1; then
        log_success "Auto backup created: ${backup_file}.tar.gz"
    else
        log_warning "Failed to create auto backup, continuing anyway..."
    fi
}

# Perform the transfer
transfer_data() {
    local force_flag=""
    local dry_run_flag=""
    local exclude_files_flag=""
    local files_only_flag=""
    local from_cloud_flag=""
    
    # Check command line arguments
    for arg in "$@"; do
        case $arg in
            --force)
                force_flag="--force"
                ;;
            --dry-run)
                dry_run_flag="--dry-run"
                ;;
            --exclude-files)
                exclude_files_flag="--exclude files"
                ;;
            --files-only)
                files_only_flag="--only files"
                ;;
            --from-cloud)
                from_cloud_flag="true"
                ;;
        esac
    done
    
    # Determine direction and command
    local direction_desc=""
    local from_param=""
    local to_param=""
    local token_param=""
    
    if [ -n "$from_cloud_flag" ]; then
        # Pull FROM cloud TO local
        direction_desc="From: $STRAPI_CLOUD_BASE_URL/admin → To: Local Strapi instance"
        from_param="--from $STRAPI_CLOUD_BASE_URL/admin"
        # Token will be passed via STRAPI_TRANSFER_TOKEN environment variable
        token_param=""
    else
        # Push FROM local TO cloud (original behavior)
        direction_desc="From: Local Strapi instance → To: $STRAPI_CLOUD_BASE_URL/admin"
        to_param="--to $STRAPI_CLOUD_BASE_URL/admin"
        # Token will be passed via STRAPI_TRANSFER_TOKEN environment variable
        token_param=""
    fi
    
    if [ -n "$dry_run_flag" ]; then
        log_info "DRY RUN: Would transfer data"
        log_info "$direction_desc"
        log_info "Command that would be executed:"
        echo "STRAPI_TRANSFER_URL=\"$STRAPI_CLOUD_BASE_URL/admin\" STRAPI_TRANSFER_TOKEN=\"[HIDDEN]\" pnpm strapi transfer $from_param$to_param $force_flag $exclude_files_flag $files_only_flag"
        return 0
    fi
    
    # Determine transfer type
    local transfer_type="full"
    if [ -n "$exclude_files_flag" ]; then
        transfer_type="content only (excluding files)"
    elif [ -n "$files_only_flag" ]; then
        transfer_type="files only"
    fi
    
    log_info "Starting Strapi data transfer ($transfer_type)..."
    log_info "$direction_desc"
    
    # Set environment variables and run transfer
    # Create logs directory
    mkdir -p "logs"
    local log_file="logs/transfer-$(date +%Y%m%d-%H%M%S).log"
    
    # Due to CLI bug in Strapi 5.23.4, environment variables don't work reliably
    # Use interactive mode which works correctly
    if [ -n "$from_cloud_flag" ]; then
        # For pulling FROM cloud TO local
        log_info "Starting interactive transfer (you'll need to enter the remote token)"
        log_info "Remote token: ${STRAPI_CLOUD_TRANSFER_TOKEN:0:20}..."
        pnpm strapi transfer \
            $force_flag $exclude_files_flag $files_only_flag \
            2>&1 | tee "$log_file"
    else
        # For pushing TO cloud, environment variables work fine
        STRAPI_TRANSFER_URL="$STRAPI_CLOUD_BASE_URL/admin" \
        STRAPI_TRANSFER_TOKEN="$STRAPI_CLOUD_TRANSFER_TOKEN" \
        pnpm strapi transfer \
            $to_param \
            $force_flag $exclude_files_flag $files_only_flag \
            2>&1 | tee "$log_file"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Transfer completed successfully!"
        log_info "You can verify the transfer at: $STRAPI_CLOUD_BASE_URL/admin"
    else
        log_error "Transfer failed!"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Strapi Cloud Transfer Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --force           Force transfer without confirmation (overwrites existing data)"
    echo "  --dry-run         Show what would be transferred without actually doing it"
    echo "  --exclude-files   Transfer only content data, skip media files"
    echo "  --files-only      Transfer only media files, skip content data"
    echo "  --from-cloud      Pull data FROM cloud TO local (instead of local to cloud)"
    echo "  --help            Show this help message"
    echo
    echo "Environment:"
    echo "  Requires strapi-cloud.env file with:"
    echo "  - STRAPI_CLOUD_BASE_URL"
    echo "  - STRAPI_CLOUD_TRANSFER_TOKEN"
    echo
    echo "Transfer Types:"
    echo "  Push to Cloud (default):"
    echo "    ./cloud-transfer.sh                    # Full transfer to cloud"
    echo "    ./cloud-transfer.sh --exclude-files    # Content only to cloud"
    echo ""
    echo "  Pull from Cloud:"
    echo "    ./cloud-transfer.sh --from-cloud                    # Full transfer from cloud"
    echo "    ./cloud-transfer.sh --from-cloud --exclude-files    # Content only from cloud"
    echo ""
    echo "This script will:"
    echo "1. Create a backup before transfer"
    echo "2. Transfer data in the specified direction"
    echo "3. Verify the transfer completed successfully"
}

# Main execution
main() {
    # Handle help flag first
    for arg in "$@"; do
        if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
            show_help
            exit 0
        fi
    done
    
    log_info "=== Strapi Cloud Transfer ==="
    
    # Check prerequisites
    check_env_file
    source_env
    
    # Check if --force flag is present, otherwise ask for confirmation
    local force_present=false
    local dry_run_present=false
    
    for arg in "$@"; do
        if [ "$arg" = "--force" ]; then
            force_present=true
        elif [ "$arg" = "--dry-run" ]; then
            dry_run_present=true
        fi
    done
    
    if [ "$dry_run_present" = false ] && [ "$force_present" = false ]; then
        echo
        log_warning "This will transfer your local Strapi data to Strapi Cloud"
        log_warning "This may overwrite existing data in the cloud!"
        log_info "Target: $STRAPI_CLOUD_BASE_URL/admin"
        echo
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Transfer cancelled"
            exit 0
        fi
    fi
    
    # Create backup (skip for dry run)
    if [ "$dry_run_present" = false ]; then
        create_backup
    fi
    
    # Perform transfer
    transfer_data "$@"
    
    echo
    log_success "=== Transfer Process Complete ==="
}

# Run main function with all arguments
main "$@"
