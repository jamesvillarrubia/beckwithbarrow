# Email Setup Guide

## Overview
This project uses Resend API to send contact form emails via a secure Vercel serverless function.

## Setup Steps

### 1. Get Resend API Key
1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

### 2. Configure Environment Variables

#### For Local Development
Create a `.env.local` file in the frontend directory:
```bash
RESEND_API_KEY=re_your_actual_api_key_here
CONTACT_EMAIL=hello@beckwithbarrow.com
```

#### For Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add these variables:
   - `RESEND_API_KEY`: Your Resend API key
   - `CONTACT_EMAIL`: Email where form submissions will be sent

### 3. Domain Setup (Optional but Recommended)
For production, you should:
1. Add your domain to Resend
2. Update the `from` email in `/api/send-email.js` to use your domain
3. This prevents emails from going to spam

## How It Works

1. **Frontend Form**: User fills out contact form
2. **API Call**: Form data sent to `/api/send-email` endpoint
3. **Serverless Function**: Validates data and calls Resend API
4. **Email Sent**: Resend sends formatted email to your inbox
5. **Response**: Success/error message shown to user

## File Structure
```
frontend/
├── api/
│   └── send-email.js          # Vercel serverless function
├── src/
│   └── pages/
│       └── ConnectPage.tsx    # Contact form component
├── vercel.json               # Vercel configuration
└── EMAIL-SETUP.md           # This guide
```

## Testing

### Local Testing
1. Start your development server: `pnpm dev`
2. Go to `/connect` page
3. Fill out and submit the form
4. Check your email inbox

### Production Testing
1. Deploy to Vercel
2. Test the live contact form
3. Verify emails are received

## Troubleshooting

### Common Issues
- **"Email service not configured"**: RESEND_API_KEY not set
- **"Invalid email format"**: Email validation failed
- **"Failed to send email"**: Check Resend API key and domain setup

### Debug Steps
1. Check Vercel function logs
2. Verify environment variables are set
3. Test Resend API key in their dashboard
4. Check email spam folder

## Security Features
- ✅ API keys stored securely on server
- ✅ Input validation and sanitization
- ✅ Rate limiting via Vercel
- ✅ HTTPS only in production
- ✅ No sensitive data exposed to frontend
