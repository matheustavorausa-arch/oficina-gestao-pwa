import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['jas-motors-logo.png'],
      manifest: {
        name: 'JAS Motors - Workshop Management',
        short_name: 'JAS Motors',
        description: 'Complete management system for auto repair shops',
        theme_color: '#05070a',
        background_color: '#05070a',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'jas-motors-logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 },
        }],
      },
    }),
  ],
})
