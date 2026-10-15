import type { LoginObject, LoginResponse } from '#shared/siga'
import { Result } from '#shared/siga'
import { cleanMessage, md5, sigaRequest, succeeded } from '../../utils/siga'
import { assertSessionPassword, openSession, setRemember } from '../../utils/session'
import { bindSchool, schoolSnapshot } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  // Fail before calling SIGA when the Worker/host has no session key.
  assertSessionPassword(event)

  const body = await readBody<{ username?: string, password?: string, recaptcha?: string, syncToken?: string, remember?: boolean }>(event)
  const username = body.username?.trim() ?? ''
  const password = body.password ?? ''
  if (!username || password.length < 4) {
    throw createError({ statusCode: 400, statusMessage: serverT('api.credentials', event) })
  }

  const envelope = await sigaRequest<LoginObject>('Login', {
    query: { token: body.syncToken },
    body: {
      username,
      password: md5(password),
      recaptchaResponse: body.recaptcha || null
    }
  })

  const result = envelope.resultObject
  if (result?.firstLogin || envelope.resultOperation === Result.FirstLogin) {
    return {
      ok: false,
      firstLogin: true,
      idUserCentral: result?.idUserCentral == null ? null : String(result.idUserCentral),
      email: result?.email ?? null,
      message: serverT('api.firstAccess', event)
    }
  }

  if (succeeded(envelope) && result?.redirect) {
    const redirect = result.redirect
    const portalHost = safeHost(redirect)
    setRemember(event, body.remember === true)
    const session = await openSession(event)

    // Give AutoLogin a short head start so /app often skips another school bind.
    const bindPromise = bindSchool(session.id, { redirect, username, password })
    const portal = await Promise.race([
      bindPromise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 1200))
    ])
    const snap = portal ? schoolSnapshot(portal) : null

    if (!snap) {
      void bindPromise
        .then((ready) => {
          const next = schoolSnapshot(ready)
          if (!next) return
          return session.update({
            redirect,
            email: result.email ?? null,
            idUserCentral: result.idUserCentral ?? null,
            portalHost,
            schoolAuthToken: next.authToken,
            schoolUser: next.user
          })
        })
        .catch(() => undefined)
    }

    await session.update({
      redirect,
      email: result.email ?? null,
      idUserCentral: result.idUserCentral ?? null,
      portalHost,
      schoolAuthToken: snap?.authToken ?? null,
      schoolUser: snap?.user ?? null
    })
    return { ok: true, to: '/app', email: result.email ?? null }
  }

  return {
    ok: false,
    captcha: Boolean(result?.requiresAndIsMissingCaptcha),
    message: cleanMessage(envelope.message)
  }
})

function safeHost(value: string) {
  try {
    return new URL(value).host
  }
  catch {
    return null
  }
}
