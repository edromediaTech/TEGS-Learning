export default defineNuxtConfig({
  ssr: false,

  // GLB et configs lus par la page de partage du backend (autre origine).
  // En prod, meme en-tete dans firebase.json.
  routeRules: {
    '/simulations/**': { headers: { 'Access-Control-Allow-Origin': '*' } },
    // model-viewer et Draco embarques, charges aussi par la page de partage du backend.
    '/vendor/**': { headers: { 'Access-Control-Allow-Origin': '*' } },
  },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vite-pwa/nuxt'],

  // === PWA / Service Worker (Phase 1.3 offline-first pour Fort-Liberte) ===
  // Cache GLB GCS + manifest + shell Nuxt (model-viewer et Draco embarques, precaches).
  // Strategies:
  //   - shell statique : precache au build (autoUpdate sur nouvelle version)
  //   - GLB GCS : CacheFirst, expiry 7 jours, max 50 entrees (~250 Mo cap)
  //   - manifest.json : NetworkFirst (5s timeout) + fallback cache
  //   - configs JSON : CacheFirst, expiry 7 jours
  //   - model-viewer + Draco : servis par le site (public/vendor), precache au build
  pwa: {
    registerType: 'autoUpdate',
    // devOptions: desactive en dev pour eviter les bugs vite-plugin-pwa
    // (dev-sw-dist manquant apres nuxt generate). En prod (nuxt generate),
    // le SW precache automatiquement.
    devOptions: { enabled: false },
    manifest: {
      name: 'TEGS-Learning - Parcours CRNS',
      short_name: 'TEGS-CRNS',
      description: 'Simulations educatives CRNS - DDENE Haiti, optimisees pour mode offline.',
      theme_color: '#1e3a5f',
      background_color: '#f8fafc',
      display: 'standalone',
      lang: 'fr',
      icons: [
        { src: '/logo.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      // wasm : decodeur Draco embarque (public/vendor/draco), precache avec model-viewer.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm}'],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
      runtimeCaching: [
        {
          // GLB de simulations CRNS sur GCS public
          urlPattern: /^https:\/\/storage\.googleapis\.com\/crns-simulations-luminous\/simulations\/.+\.glb$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'crns-glb',
            expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Configs JSON par simulation
          urlPattern: /^https:\/\/storage\.googleapis\.com\/crns-simulations-luminous\/simulations\/configs\/.+\.json$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'crns-configs',
            expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Manifest GCS (avec cache-buster, NetworkFirst pour fraicheur)
          urlPattern: /^https:\/\/storage\.googleapis\.com\/crns-simulations-luminous\/simulations\/manifest\.json/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'crns-manifest',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 5, maxAgeSeconds: 30 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: { installPrompt: false },
  },

  // Web components (e.g. <model-viewer> sur la page admin/simulations)
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag === 'model-viewer',
    },
  },

  app: {
    head: {
      title: 'TEGS-Learning | LCMS',
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#1e3a5f' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:3000/api',
      pixabayKey: process.env.NUXT_PUBLIC_PIXABAY_KEY || '',
      // CRNS - URL absolue d'un manifest hebergee (typiquement GCS public).
      // Si vide, on fallback sur /simulations/manifest.json (bundle frontend).
      crnsManifestUrl: process.env.NUXT_PUBLIC_CRNS_MANIFEST_URL || '',
    },
  },

  compatibilityDate: '2025-01-01',
});
