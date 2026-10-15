export default defineNuxtConfig({
  compatibilityDate: '2026-10-15',
  modules: ['@nuxt/ui', "nitro-cloudflare-dev"],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },
  fonts: {
    families: [
      { name: 'Outfit', provider: 'google', weights: [400, 500, 600] },
      { name: 'Noto Sans SC', provider: 'google', weights: [400, 500, 600] }
    ]
  },
  // Cloudflare Workers: each `wrangler deploy` regenerates config and can wipe
  // dashboard Variables/Secrets unless keep_vars is true.
  nitro: {
    cloudflare: {
      deployConfig: true,

      wrangler: {
        keep_vars: true
      },

      nodeCompat: true
    },

    preset: "cloudflare_module"
  },
  runtimeConfig: {
    sigaApi: 'https://siga.edubox.pt/api',
    sigaKey: '8bb8a6fa-2653-4099-a2cc-0805feb7b4a9',
    sessionPassword: '',
    public: {
      recaptchaSiteKey: '6LexRXIiAAAAAKR7_jjZ3A-n4FE42ILCqoJhbier'
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Siga',
      meta: [
        { name: 'description', content: 'Parent area connected to SIGA, designed for your phone.' },
        { name: 'theme-color', content: '#f7f4ed' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  }
})