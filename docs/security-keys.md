# Security Guide for Managing Keys and Sensitive Data

This document outlines the security practices for handling sensitive information in the SonicRedDragon project.

## Sensitive Files

The following sensitive files are used in the project:

1. **API Key Files**: 
   - Located at `deploy/config/api_key.txt`
   - Used for interactions with SonicScan API

2. **Private Key Files**:
   - Located at `deploy/config/private_key.txt`
   - Used for contract deployments and transactions

3. **Environment Variables**:
   - Located at `.env`
   - Contains various configuration values and secrets

## Security Measures

We have implemented several layers of security to protect these sensitive files:

1. **Git Exclusion**: 
   - All sensitive files are excluded from Git via multiple `.gitignore` files
   - The main `.gitignore` excludes patterns matching sensitive files
   - The `deploy/config/.gitignore` uses a deny-all approach for extra protection

2. **Example Templates**:
   - Template files with the `.example` extension are provided
   - These templates show the required format without containing actual secrets

3. **Cloud Secret Management**:
   - For production, secrets are stored in Google Cloud Secret Manager
   - Service accounts with proper permissions are used to access these secrets
   - Secret rotation is supported through the version system

## Developer Guidelines

When working with this project:

1. **Never commit sensitive files**:
   - Verify changes before committing to ensure no secrets are included
   - Use `git status` and check for sensitive files before committing

2. **Setting up your local environment**:
   - Copy example templates and populate with your own secrets:
     ```bash
     cp deploy/config/api_key.txt.example deploy/config/api_key.txt
     cp deploy/config/private_key.txt.example deploy/config/private_key.txt
     cp .env.example .env
     ```
   - Edit these files with your personal API keys and private keys

3. **Deployment security**:
   - For production deployments, use the Google Cloud Secret Manager
   - Follow the deployment scripts which handle secret management automatically

4. **Reporting security issues**:
   - If you discover any security vulnerabilities, please report them immediately
   - Do not share or discuss security issues publicly until fixed

## Key Rotation

It's recommended to rotate your API keys and private keys regularly:

1. **API Keys**: Regenerate these monthly or after suspected compromise
2. **Private Keys**: Use different private keys for development and production
3. **Environment Variables**: Update sensitive values periodically

## Emergency Response

If you believe a key has been compromised:

1. Immediately generate new keys to replace the compromised ones
2. Revoke the old keys where possible
3. Check for any unauthorized transactions or API calls
4. Update all deployed instances with the new keys

Remember: Security is everyone's responsibility. When in doubt, err on the side of caution. 