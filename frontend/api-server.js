/**
 * Simple Node.js server for local development
 * Replaces Vercel dev server for local API function testing
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Debug environment variables
console.log('🔧 Environment check:');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
console.log('CONTACT_EMAIL:', process.env.CONTACT_EMAIL || 'Not set');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Route for the email API
app.post('/api/send-email', async (req, res) => {
  try {
    // Import the Vercel function dynamically
    const { default: sendEmailHandler } = await import('./api/send-email.js');
    
    // Create a mock Vercel request/response
    const mockReq = {
      method: 'POST',
      body: req.body
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await sendEmailHandler(mockReq, mockRes);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📧 Email endpoint: http://localhost:${PORT}/api/send-email`);
});

// Keep the server running
process.on('SIGINT', () => {
  console.log('\n🛑 API server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 API server shutting down...');
  process.exit(0);
});
