#!/bin/bash

# Backup Cleanup Script
# Cleans up old backups based on retention policies
# Usage: ./scripts/backup-cleanup.sh [--local-only] [--cloud-only] [--auto-only] [--dry-run]

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

# Configuration - retention policies
LOCAL_RETENTION=10    # Keep last 10 local backups
CLOUD_RETENTION=5     # Keep last 5 cloud backups  
AUTO_RETENTION=20     # Keep last 20 auto backups (more safety)

# Parse command line arguments
DRY_RUN=false
LOCAL_ONLY=false
CLOUD_ONLY=false
AUTO_ONLY=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --local-only)
            LOCAL_ONLY=true
            ;;
        --cloud-only)
            CLOUD_ONLY=true
            ;;
        --auto-only)
            AUTO_ONLY=true
            ;;
        --help|-h)
            echo "Backup Cleanup Script"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --local-only    Clean only local backups"
            echo "  --cloud-only    Clean only cloud backups"
            echo "  --auto-only     Clean only auto backups"
            echo "  --dry-run       Show what would be deleted without actually deleting"
            echo "  --help          Show this help message"
            echo
            echo "Retention Policies:"
            echo "  Local backups:  Keep last $LOCAL_RETENTION"
            echo "  Cloud backups:  Keep last $CLOUD_RETENTION"
            echo "  Auto backups:   Keep last $AUTO_RETENTION"
            exit 0
            ;;
    esac
done

# Cleanup function
cleanup_backups() {
    local backup_type=$1
    local backup_dir=$2
    local retention=$3
    local pattern=$4
    
    if [ ! -d "$backup_dir" ]; then
        log_warning "$backup_type backup directory not found: $backup_dir"
        return 0
    fi
    
    log_info "Cleaning up $backup_type backups (keeping last $retention)..."
    
    cd "$backup_dir"
    
    # Find files to delete
    local files_to_delete=$(ls -t $pattern 2>/dev/null | tail -n +$((retention + 1)))
    local manifest_files_to_delete=$(ls -t ${pattern%-*.tar.gz}-*-manifest.json 2>/dev/null | tail -n +$((retention + 1)))
    
    if [ -z "$files_to_delete" ] && [ -z "$manifest_files_to_delete" ]; then
        log_info "No old $backup_type backups to clean up"
        cd - > /dev/null
        return 0
    fi
    
    local total_files=0
    local total_size=0
    
    # Count and calculate size
    for file in $files_to_delete $manifest_files_to_delete; do
        if [ -f "$file" ]; then
            total_files=$((total_files + 1))
            if [[ "$file" == *.tar.gz ]]; then
                size=$(du -k "$file" | cut -f1)
                total_size=$((total_size + size))
            fi
        fi
    done
    
    if [ $total_files -eq 0 ]; then
        log_info "No old $backup_type backups to clean up"
        cd - > /dev/null
        return 0
    fi
    
    # Convert size to human readable
    local human_size
    if [ $total_size -gt 1048576 ]; then
        human_size="$(echo "scale=1; $total_size / 1048576" | bc)G"
    elif [ $total_size -gt 1024 ]; then
        human_size="$(echo "scale=1; $total_size / 1024" | bc)M"
    else
        human_size="${total_size}K"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would delete $total_files $backup_type backup files ($human_size):"
        for file in $files_to_delete $manifest_files_to_delete; do
            if [ -f "$file" ]; then
                echo "  - $file"
            fi
        done
    else
        log_warning "Deleting $total_files old $backup_type backup files ($human_size)..."
        for file in $files_to_delete $manifest_files_to_delete; do
            if [ -f "$file" ]; then
                rm -f "$file"
                log_info "Deleted: $file"
            fi
        done
        log_success "$backup_type cleanup completed"
    fi
    
    cd - > /dev/null
}

# Main execution
main() {
    log_info "=== Backup Cleanup Script ==="
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No files will actually be deleted"
    fi
    
    echo
    
    # Determine what to clean based on flags
    if [ "$LOCAL_ONLY" = true ]; then
        cleanup_backups "local" "backups/local" $LOCAL_RETENTION "local-*.tar.gz"
    elif [ "$CLOUD_ONLY" = true ]; then
        cleanup_backups "cloud" "backups/cloud" $CLOUD_RETENTION "cloud-*.tar.gz"
    elif [ "$AUTO_ONLY" = true ]; then
        cleanup_backups "auto" "backups/auto" $AUTO_RETENTION "auto-*.tar.gz"
    else
        # Clean all backup types
        cleanup_backups "local" "backups/local" $LOCAL_RETENTION "local-*.tar.gz"
        cleanup_backups "cloud" "backups/cloud" $CLOUD_RETENTION "cloud-*.tar.gz"
        cleanup_backups "auto" "backups/auto" $AUTO_RETENTION "auto-*.tar.gz"
    fi
    
    echo
    if [ "$DRY_RUN" = true ]; then
        log_success "=== Dry Run Complete ==="
        log_info "Run without --dry-run to actually delete files"
    else
        log_success "=== Cleanup Process Complete ==="
        
        # Show current backup counts
        echo
        log_info "Current backup counts:"
        [ -d "backups/local" ] && echo "  Local: $(ls backups/local/local-*.tar.gz 2>/dev/null | wc -l | tr -d ' ') backups"
        [ -d "backups/cloud" ] && echo "  Cloud: $(ls backups/cloud/cloud-*.tar.gz 2>/dev/null | wc -l | tr -d ' ') backups"
        [ -d "backups/auto" ] && echo "  Auto:  $(ls backups/auto/auto-*.tar.gz 2>/dev/null | wc -l | tr -d ' ') backups"
    fi
}

# Check if bc is available for size calculations
if ! command -v bc &> /dev/null; then
    log_warning "bc command not found - size calculations will be approximate"
    # Fallback function for size calculation
    bc() {
        echo "$1" | awk '{print int($1)}'
    }
fi

# Run main function
main "$@"
