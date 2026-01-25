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
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          // 1. Stratégie pour les données statiques/référentiels (ex: Categories)
          {
            urlPattern: /^http:\/\/192\.168\.1\.96:3000\/categories/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-static-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 2. Stratégie pour les données dynamiques (Projets, Sessions, User)
          {
            urlPattern: /^http:\/\/192\.168\.1\.96:3000\/(projects|sessions|users|materials|photos|notes).*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dynamic-data',
              networkTimeoutSeconds: 3, // Timeout réseau court (3s)
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24h
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              matchOptions: {
                ignoreVary: true
              },
              // 🔥 CRUCIAL : Si le réseau échoue ET que le cache est vide,
              // on force le SW à retourner une erreur réseau standard au lieu de planter.
              // Cela permet à Axios de catcher l'erreur.
              handlerDidError: async () => {
                return Response.error();
              }
            }
          }
        ],
        // 🔥 IMPORTANT : Ne pas rediriger les requêtes API vers index.html en cas d'échec
        navigateFallback: null
      }
    })
  ],
  server: {
    host: '0.0.0.0',
  }
});