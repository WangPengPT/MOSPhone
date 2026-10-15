import type { H3Event } from 'h3'
import type { SigaSession } from '#shared/siga'
import { serverT } from './text'

const REMEMBER_COOKIE = 'siga_remember'
const SESSION_MAX_AGE = 60 * 60 * 12
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  }
}

export function setRemember(event: H3Event, remember: boolean) {
  if (remember) {
    setCookie(event, REMEMBER_COOKIE, '1', { ...cookieBase(), maxAge: REMEMBER_MAX_AGE })
    return
  }
  deleteCookie(event, REMEMBER_COOKIE, { path: '/' })
}

export function openSession(event: H3Event) {
  const password = String(useRuntimeConfig().sessionPassword || '')
  if (password.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: serverT('api.session', event)
    })
  }

  const maxAge = getCookie(event, REMEMBER_COOKIE) === '1' ? REMEMBER_MAX_AGE : SESSION_MAX_AGE
  return useSession<SigaSession>(event, {
    password,
    name: 'siga_session',
    maxAge,
    cookie: {
      ...cookieBase(),
      maxAge
    }
  })
}
