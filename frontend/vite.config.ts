import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
        lang: 'fr', // <--- CORRECTION : On force le Français

        // --- COULEURS ---
        // theme_color : La couleur de la barre du navigateur/téléphone (Le Violet Pastel)
        theme_color: '#C4B5FD',
        // background_color : La couleur de fond de l'écran de chargement (L'Anthracite)
        background_color: '#1E1E1E',

        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo-mini.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})