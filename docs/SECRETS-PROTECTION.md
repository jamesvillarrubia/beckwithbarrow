# 🔒 Secrets Protection Setup

This repository is protected against accidentally committing secrets using **Gitleaks** and **Husky**.

## 🛡️ Protection Features

### Gitleaks + Husky Integration
- **Pre-commit hooks** automatically scan for secrets before commits
- **Husky management** ensures hooks are installed for all team members
- **Advanced pattern recognition** with minimal false positives
- **Automatic blocking** of commits containing secrets
- **Historical scanning** to find existing secrets in git history

### Protected Secret Types
- **API Keys**: AWS, Google, GitHub, etc.
- **Database Credentials**: Connection strings and passwords
- **Cloud Provider Keys**: Cloudinary, AWS, Azure, GCP
- **Authentication Tokens**: JWT, Bearer tokens, API tokens
- **Private Keys**: SSH keys, certificates, encryption keys
- **And 100+ other secret patterns**

## 🚀 How It Works

### Automatic Protection
1. **Husky Pre-commit Hook**: Automatically runs `gitleaks protect --staged` before every commit
2. **Team-wide Installation**: Husky ensures all team members get the hooks when they run `npm install`
3. **Advanced Pattern Matching**: Uses machine learning and entropy analysis
4. **Commit Blocking**: Prevents commits if secrets are detected
5. **Clear Error Messages**: Shows exactly what secrets were found with context

### Manual Scanning
```bash
# Scan all files in the repository
gitleaks detect --source .

# Scan specific files
gitleaks detect --source path/to/file

# Scan staged files only
gitleaks protect --staged

# Scan git history
gitleaks detect --source . --log-level info
```

## 🔧 Configuration

### Custom Configuration
Gitleaks uses a configuration file (`.gitleaks.toml`) for custom rules:

```bash
# Generate a default config
gitleaks config generate > .gitleaks.toml

# Use custom config
gitleaks detect --config .gitleaks.toml --source .
```

### Allowing False Positives
Add patterns to `.gitleaks.toml` to allow specific false positives:

```toml
[[rules.allowlist]]
regexes = [
  "frontend/.*",  # Allow all frontend files
  "localhost:1337",  # Allow localhost URLs
]
```

## 📁 Project-Specific Protection

This repository is protected against:
- **Cloudinary** credentials and API keys
- **Strapi** API tokens and authentication
- **AWS** access keys and credentials
- **Database** connection strings and passwords
- **Environment variables** containing secrets
- **And 100+ other secret types automatically**

## ⚠️ Important Notes

- **Never commit** `.env` files or environment files with secrets
- **Use environment variables** for sensitive configuration
- **Test patterns** before adding to avoid false positives
- **Review blocked commits** carefully to ensure no real secrets

## 🆘 Troubleshooting

### If a Commit is Blocked
1. **Check the error message** to see what was detected
2. **Verify it's not a real secret** - if it is, remove it immediately
3. **If it's a false positive**, add an allowed pattern
4. **Re-commit** after resolving the issue

### If Hooks Aren't Working
```bash
# Check if gitleaks is installed
gitleaks version

# Check if hooks are properly installed
ls -la .git/hooks/

# Test the pre-commit hook manually
.git/hooks/pre-commit
```

---
**Setup Date**: September 30, 2025  
**Status**: ✅ ACTIVE - All commits are protected against secrets
