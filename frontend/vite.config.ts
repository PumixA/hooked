import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Met à jour dès qu'il peut
      devOptions: {
        enabled: true // Active le SW même en dev (npm run dev)
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-mini.svg'],
      manifest: {
        name: 'Hooked',
        short_name: 'Hooked',
        description: 'Suivi de projets tricot et crochet',
        lang: 'fr',
        theme_color: '#C4B5FD',
        background_color: '#1E1E1E',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/logo-mini.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      // --- CONFIGURATION WORKBOX (Le Cœur du Cache) ---
      workbox: {
        // 1. Force le SW à s'activer immédiatement
        skipWaiting: true,
        clientsClaim: true,

        // 2. Cache tous les fichiers statiques (App Shell)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // 3. Cache l'API
        runtimeCaching: [
          {
            // Cache tout ce qui va vers le backend (Port 3000)
            urlPattern: ({ url }) => url.host.includes(':3000'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
  }
});