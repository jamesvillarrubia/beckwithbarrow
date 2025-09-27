#!/bin/bash

# Strapi Cloud Data Backup Script
# Downloads and backs up data from Strapi Cloud with proper organization

set -e  # Exit on any error

# Configuration
BACKUP_DIR="./backups/cloud"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_TYPE=${1:-full}  # full, content, files
BACKUP_NAME="cloud-${BACKUP_TYPE}-${TIMESTAMP}"
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
        log_info "Please set your Strapi Cloud API token:"
        log_info "export STRAPI_CLOUD_API_TOKEN='your-token-here'"
        exit 1
    fi
    
    if [ -z "$STRAPI_CLOUD_PROJECT_ID" ]; then
        log_error "STRAPI_CLOUD_PROJECT_ID environment variable is not set"
        log_info "Please set your Strapi Cloud project ID:"
        log_info "export STRAPI_CLOUD_PROJECT_ID='your-project-id'"
        exit 1
    fi
    
    if [ -z "$STRAPI_CLOUD_BASE_URL" ]; then
        log_error "STRAPI_CLOUD_BASE_URL environment variable is not set"
        log_info "Please set your Strapi Cloud base URL:"
        log_info "export STRAPI_CLOUD_BASE_URL='https://your-project.strapiapp.com'"
        exit 1
    fi
    
    log_success "Configuration validated"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating cloud backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Clean old backups (keep last 5 cloud backups)
cleanup_old_backups() {
    log_info "Cleaning up old cloud backups (keeping last 5)..."
    cd "$BACKUP_DIR"
    ls -t cloud-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    # Also clean up old manifest files
    ls -t cloud-*-manifest.json 2>/dev/null | tail -n +6 | xargs -r rm -f
    cd - > /dev/null
    log_success "Cleanup completed"
}

# Backup content types via API
backup_content_types() {
    log_info "Backing up content types from Strapi Cloud..."
    
    local content_dir="${BACKUP_DIR}/${BACKUP_NAME}/content"
    mkdir -p "$content_dir"
    
    # Define content types to backup
    local content_types=("projects" "categories" "about" "global")
    
    for content_type in "${content_types[@]}"; do
        log_info "Downloading $content_type..."
        
        curl -s -H "Authorization: Bearer $STRAPI_CLOUD_API_TOKEN" \
             -H "Content-Type: application/json" \
             "${STRAPI_CLOUD_BASE_URL}/api/${content_type}?populate=*" \
             -o "${content_dir}/${content_type}.json"
        
        if [ $? -eq 0 ]; then
            log_success "Downloaded $content_type"
        else
            log_warning "Failed to download $content_type"
        fi
    done
}

# Backup media files (if accessible via API)
backup_media() {
    log_info "Backing up media files from Strapi Cloud..."
    
    local media_dir="${BACKUP_DIR}/${BACKUP_NAME}/media"
    mkdir -p "$media_dir"
    
    # Get list of uploaded files
    curl -s -H "Authorization: Bearer $STRAPI_CLOUD_API_TOKEN" \
         -H "Content-Type: application/json" \
         "${STRAPI_CLOUD_BASE_URL}/api/upload/files" \
         -o "${media_dir}/files-list.json"
    
    if [ $? -eq 0 ]; then
        log_success "Downloaded media files list"
        
        # Parse and download individual files (simplified approach)
        # Note: This would need more sophisticated parsing in production
        log_info "Media files list saved to files-list.json"
        log_warning "Individual media file downloads require additional implementation"
    else
        log_warning "Failed to download media files list"
    fi
}

# Use Strapi Cloud CLI if available
try_cloud_cli_export() {
    log_info "Attempting Strapi Cloud CLI export..."
    
    # Check if Strapi Cloud CLI is installed
    if command -v strapi-cloud &> /dev/null; then
        log_info "Strapi Cloud CLI found, attempting export..."
        
        # Try to export using CLI (syntax may vary)
        strapi-cloud export \
            --project-id "$STRAPI_CLOUD_PROJECT_ID" \
            --output "${BACKUP_DIR}/${BACKUP_NAME}/cli-export.tar.gz" \
            2>/dev/null
        
        if [ $? -eq 0 ]; then
            log_success "CLI export completed"
            return 0
        else
            log_warning "CLI export failed, falling back to API method"
            return 1
        fi
    else
        log_warning "Strapi Cloud CLI not found, using API method"
        return 1
    fi
}

# Create compressed backup
create_archive() {
    log_info "Creating compressed backup archive..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        # Clean up uncompressed directory
        rm -rf "$BACKUP_NAME"
        
        BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
        log_success "Archive created: ${BACKUP_NAME}.tar.gz ($BACKUP_SIZE)"
    else
        log_error "Failed to create archive"
        exit 1
    fi
    
    cd - > /dev/null
}

# Create backup manifest with metadata
create_manifest() {
    local manifest_file="${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"
    log_info "Creating cloud backup manifest..."
    
    cat > "$manifest_file" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "backup_type": "${BACKUP_TYPE}",
  "backup_source": "cloud",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "cloud_project_id": "${STRAPI_CLOUD_PROJECT_ID}",
  "cloud_base_url": "${STRAPI_CLOUD_BASE_URL}",
  "backup_file": "${BACKUP_NAME}.tar.gz",
  "backup_size": "$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)",
  "backup_method": "api_download",
  "node_version": "$(node --version)",
  "curl_version": "$(curl --version | head -n1)"
}
EOF
    
    log_success "Manifest created: $manifest_file"
}

# Display configuration help
show_config_help() {
    log_info "=== Strapi Cloud Backup Configuration ==="
    echo
    log_info "Required environment variables:"
    echo "export STRAPI_CLOUD_API_TOKEN='your-api-token'"
    echo "export STRAPI_CLOUD_PROJECT_ID='your-project-id'"
    echo "export STRAPI_CLOUD_BASE_URL='https://your-project.strapiapp.com'"
    echo
    log_info "To get these values:"
    log_info "1. Login to your Strapi Cloud dashboard"
    log_info "2. Go to Settings → API Tokens"
    log_info "3. Create or copy your API token"
    log_info "4. Get your project ID from the project settings"
    log_info "5. Use your project's public URL as the base URL"
    echo
    log_info "Example setup:"
    echo "echo 'export STRAPI_CLOUD_API_TOKEN=\"your-token\"' >> ~/.bashrc"
    echo "echo 'export STRAPI_CLOUD_PROJECT_ID=\"your-id\"' >> ~/.bashrc"
    echo "echo 'export STRAPI_CLOUD_BASE_URL=\"https://your-project.strapiapp.com\"' >> ~/.bashrc"
    echo "source ~/.bashrc"
    echo
}

# Main execution
main() {
    log_info "=== Strapi Cloud Backup Script ==="
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Backup name: $BACKUP_NAME"
    echo
    
    # Check configuration
    if ! check_config 2>/dev/null; then
        show_config_help
        exit 1
    fi
    
    create_backup_dir
    
    # Try CLI export first, fall back to API if it fails
    if ! try_cloud_cli_export; then
        case "$BACKUP_TYPE" in
            "content")
                backup_content_types
                log_info "Skipping files (content-only backup)"
                ;;
            "files")
                backup_media
                log_info "Skipping content data (files-only backup)"
                ;;
            "full"|*)
                backup_content_types
                backup_media
                ;;
        esac
    fi
    
    create_archive
    create_manifest
    cleanup_old_backups
    
    echo
    log_success "=== Cloud Backup Process Complete ==="
    log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "Manifest: ${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"
    
    # List recent backups
    echo
    log_info "Recent cloud backups:"
    ls -la "$BACKUP_DIR"/cloud-*.tar.gz 2>/dev/null | tail -5 || log_warning "No previous cloud backups found"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_config_help
        exit 0
        ;;
    --config)
        show_config_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
