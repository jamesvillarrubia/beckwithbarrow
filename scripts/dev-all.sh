#!/bin/bash

# Start all three development servers
echo "🚀 Starting all development servers..."

# Start Strapi API in background
echo "📡 Starting Strapi API server..."
nx run api:dev &
STRAPI_PID=$!

# Start Vercel dev server in background  
echo "⚡ Starting Vercel dev server..."
cd frontend && pnpm dev:api &
VERCEL_PID=$!

# Start Frontend dev server
echo "🎨 Starting Frontend dev server..."
nx run frontend:dev &
FRONTEND_PID=$!

# Wait for all processes
wait $STRAPI_PID $VERCEL_PID $FRONTEND_PID

