import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // Note: the dev server port and the /api proxy are now owned by server.js
  // (the Express SSR server), which runs Vite in middleware mode. Vite's own
  // server.proxy no longer applies since Express handles the top-level request.
  server: {
    allowedHosts: ['pmportal.autonexai360.com'],
    // or you can use allowedHosts: true to allow all domains temporarily
  },
  build: {
    // Production optimizations - using esbuild (built-in, no extra deps)
    minify: 'esbuild',
    rollupOptions: {
      // manualChunks only applies to the client build. In the SSR build,
      // react/react-dom are externalized (required from node_modules at
      // runtime, not bundled), so listing them in manualChunks throws
      // "react cannot be included in manualChunks". The SSR bundle is a
      // single entry and needs no chunk splitting anyway.
      output: isSsrBuild
        ? {}
        : {
            // Code splitting for better caching
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              tanstack: ['@tanstack/react-query'],
              ui: ['lucide-react', 'date-fns']
            }
          }
    },
    // Increase chunk warning limit
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging (optional - can disable for smaller builds)
    sourcemap: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
  }
}))
