export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:3000/api',
      pixabayKey: process.env.NUXT_PUBLIC_PIXABAY_KEY || '',
    },
  },

  compatibilityDate: '2025-01-01',
});
