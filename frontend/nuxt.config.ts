export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

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
    },
  },

  compatibilityDate: '2025-01-01',
});
