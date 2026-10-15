import type { H3Event } from 'h3'
import type { SigaSession } from '#shared/siga'
import { serverT } from './text'

const REMEMBER_COOKIE = 'siga_remember'
const SESSION_MAX_AGE = 60 * 60 * 12
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30

function cookieBase(event?: H3Event) {
  // Always mark Secure on the Workers host (HTTPS). SameSite=Lax is enough for
  // same-origin App WebView + browser XHR; avoid SameSite=None quirks.
  const host = event ? String(getRequestHeader(event, 'host') || '') : ''
  const forwarded = event ? String(getRequestHeader(event, 'x-forwarded-proto') || '') : ''
  const secure = process.env.NODE_ENV === 'production'
    || forwarded.includes('https')
    || host.includes('workers.dev')
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/'
  }
}

function cloudflareEnv(event?: H3Event): Record<string, unknown> {
  const ctx = event?.context as { cloudflare?: { env?: Record<string, unknown> } } | undefined
  return ctx?.cloudflare?.env || {}
}

/** Prefer Cloudflare bindings / runtime env over build-time empty defaults. */
export function readSessionPassword(event?: H3Event) {
  const config = useRuntimeConfig(event)
  const cf = cloudflareEnv(event)
  const candidates = [
    config.sessionPassword,
    cf.NUXT_SESSION_PASSWORD,
    cf.SESSION_PASSWORD,
    process.env.NUXT_SESSION_PASSWORD,
    process.env.SESSION_PASSWORD
  ]
  for (const value of candidates) {
    const text = String(value || '').trim()
    if (text.length >= 32) return text
  }
  return String(config.sessionPassword || process.env.NUXT_SESSION_PASSWORD || '').trim()
}

export function sessionReady(event?: H3Event) {
  return readSessionPassword(event).length >= 32
}

export function assertSessionPassword(event?: H3Event) {
  if (sessionReady(event)) return
  throw createError({
    statusCode: 500,
    statusMessage: serverT('api.session', event)
  })
}

export function setRemember(event: H3Event, remember: boolean) {
  if (remember) {
    setCookie(event, REMEMBER_COOKIE, '1', { ...cookieBase(event), maxAge: REMEMBER_MAX_AGE })
    return
  }
  deleteCookie(event, REMEMBER_COOKIE, { path: '/' })
}

export function openSession(event: H3Event) {
  assertSessionPassword(event)
  const password = readSessionPassword(event)
  const maxAge = getCookie(event, REMEMBER_COOKIE) === '1' ? REMEMBER_MAX_AGE : SESSION_MAX_AGE
  return useSession<SigaSession>(event, {
    password,
    name: 'siga_session',
    maxAge,
    cookie: {
      ...cookieBase(event),
      maxAge
    }
  })
}
