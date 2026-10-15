import type { H3Event } from 'h3'
import { readSessionPassword, sessionReady } from '../utils/session'

function cloudflareEnv(event: H3Event) {
  const ctx = event.context as { cloudflare?: { env?: Record<string, unknown> } }
  return ctx.cloudflare?.env || {}
}

export default defineEventHandler((event) => {
  const ready = sessionReady(event)
  const cf = cloudflareEnv(event)
  const config = useRuntimeConfig(event)
  const keys = Object.keys(cf).filter(key => /nuxt|session|password|secret/i.test(key)).sort()

  return {
    ok: ready,
    session: ready,
    // lengths only — never the secret value
    diag: {
      hasCfEnv: Object.keys(cf).length > 0,
      matchingKeys: keys,
      lengths: {
        runtimeConfig: String(config.sessionPassword || '').length,
        processEnv: String(process.env.NUXT_SESSION_PASSWORD || '').length,
        cfBinding: String(cf.NUXT_SESSION_PASSWORD || '').length,
        resolved: readSessionPassword(event).length
      }
    }
  }
})
