#!/bin/bash

# Strapi Data Backup Script
# Creates timestamped backups of Strapi data with proper organization

set -e  # Exit on any error

# Configuration
BACKUP_DIR="./backups/local"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_TYPE=${1:-full}  # full, content, files
BACKUP_NAME="local-${BACKUP_TYPE}-${TIMESTAMP}"
VERBOSE=${VERBOSE:-true}

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

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Clean old backups (keep last 10)
cleanup_old_backups() {
    log_info "Cleaning up old local backups (keeping last 10)..."
    cd "$BACKUP_DIR"
    ls -t local-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    # Also clean up old manifest files
    ls -t local-*-manifest.json 2>/dev/null | tail -n +11 | xargs -r rm -f
    cd - > /dev/null
    log_success "Cleanup completed"
}

# Export Strapi data
export_strapi_data() {
    log_info "Starting Strapi data export (type: $BACKUP_TYPE)..."
    
    # Build export command based on backup type
    local export_cmd="pnpm strapi export --file \"${BACKUP_DIR}/${BACKUP_NAME}\" --no-encrypt"
    
    case "$BACKUP_TYPE" in
        "content")
            export_cmd="$export_cmd --exclude files"
            log_info "Exporting content only (no files)"
            ;;
        "files")
            export_cmd="$export_cmd --only files"
            log_info "Exporting files only (no content)"
            ;;
        "full"|*)
            log_info "Exporting full backup (content + files)"
            ;;
    esac
    
    if [ "$VERBOSE" = true ]; then
        export_cmd="$export_cmd --verbose"
    fi
    
    # Create logs directory and execute the export command
    mkdir -p "logs"
    local log_file="logs/backup-$(date +%Y%m%d-%H%M%S).log"
    
    # Execute the export command with logging
    eval $export_cmd 2>&1 | tee "$log_file"
    
    if [ $? -eq 0 ]; then
        log_success "Export completed successfully!"
        log_info "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
        
        # Get file size
        BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
        log_info "Backup size: $BACKUP_SIZE"
    else
        log_error "Export failed!"
        exit 1
    fi
}

# Create backup manifest with metadata
create_manifest() {
    MANIFEST_FILE="${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"
    log_info "Creating backup manifest..."
    
    cat > "$MANIFEST_FILE" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "backup_type": "${BACKUP_TYPE}",
  "backup_source": "local",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "strapi_version": "$(pnpm strapi version 2>/dev/null || echo 'unknown')",
  "backup_file": "${BACKUP_NAME}.tar.gz",
  "backup_size": "$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)",
  "restore_command": "pnpm strapi import --file backups/local/${BACKUP_NAME} --no-encrypt"
}
EOF
    
    log_success "Manifest created: $MANIFEST_FILE"
}

# Main execution
main() {
    log_info "=== Strapi Local Backup Script ==="
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Backup name: $BACKUP_NAME"
    echo
    
    create_backup_dir
    export_strapi_data
    create_manifest
    cleanup_old_backups
    
    echo
    log_success "=== Backup Process Complete ==="
    log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "Manifest: ${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"
    
    # List recent backups
    echo
    log_info "Recent local backups:"
    ls -la "$BACKUP_DIR"/local-*.tar.gz 2>/dev/null | tail -5 || log_warning "No previous backups found"
}

# Run main function
main "$@"
