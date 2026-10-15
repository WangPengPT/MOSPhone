/**
 * Cloudflare puts Worker secrets on event.context.cloudflare.env, not always on
 * process.env. Copy string bindings early so Nuxt runtimeConfig (NUXT_*) works.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const env = (event.context as { cloudflare?: { env?: Record<string, unknown> } })
      .cloudflare
      ?.env
    if (!env) return

    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== 'string' || !value) continue
      if (process.env[key] == null || process.env[key] === '') {
        process.env[key] = value
      }
    }

    // Invalidate per-request runtimeConfig cache so applyEnv sees the new env.
    const nitro = (event.context as { nitro?: { runtimeConfig?: unknown } }).nitro
    if (nitro && 'runtimeConfig' in nitro) {
      delete nitro.runtimeConfig
    }
  })
})
