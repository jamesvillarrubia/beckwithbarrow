import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-persist-client', '@tanstack/query-sync-storage-persister'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          'lightbox-vendor': ['yet-another-react-lightbox', 'react-photo-album'],
        },
      },
    },
    // Increase chunk size warning to 1000 kB (only as fallback)
    chunkSizeWarningLimit: 1000,
  },
})
