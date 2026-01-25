import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
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
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // ✅ Configuration optimisée pour éviter les erreurs CORS
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/192\.168\.1\.96:3000\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              // ✅ Gestion des erreurs CORS
              fetchOptions: {
                mode: 'cors',
                // credentials: 'include' // Supprimé car inutile pour l'auth JWT et cause des soucis CORS
              },
              matchOptions: {
                ignoreVary: true
              }
            }
          }
        ],
        // ✅ Important : Ne pas mettre en cache les requêtes qui échouent
        navigateFallback: null
      }
    })
  ],
  server: {
    host: '0.0.0.0',
  }
});