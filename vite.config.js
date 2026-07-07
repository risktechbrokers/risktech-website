import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor libs into separate chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            if (id.includes('@emailjs')) return 'email-vendor';
          }
        },
      },
    },
    cssCodeSplit: true,
    target: 'es2020',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
  },
})
