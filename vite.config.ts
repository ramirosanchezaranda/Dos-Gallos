import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png'],
      // El motor de OCR son varios MB y solo hace falta al leer un ticket:
      // se descarga cuando se usa, no al instalar la app.
      workbox: { globIgnores: ['**/ocr/**'] },
      manifest: {
        name: 'Dos Gallos - Stock',
        short_name: 'Dos Gallos',
        description: 'Control de stock para Pollería Dos Gallos',
        theme_color: '#104018',
        background_color: '#FDFFFD',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
