import type { SigaSession } from '#shared/siga'
import { cleanMessage, sigaRequest, succeeded } from '../../utils/siga'
import { openSession } from '../../utils/session'
import { bindSchool, schoolSnapshot } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string }>(event)
  const token = body.token?.trim() ?? ''
  if (!token) throw createError({ statusCode: 400, statusMessage: serverT('api.incomplete', event) })

  const envelope = await sigaRequest<string | { redirect?: string }>('CheckAutoLoginExternal', {
    body: { token }
  })

  const redirect = typeof envelope.resultObject === 'string'
    ? envelope.resultObject
    : envelope.resultObject?.redirect

  if (succeeded(envelope) && redirect) {
    const session = await openSession(event)
    let schoolAuthToken: string | null = null
    let schoolUser: SigaSession['schoolUser'] = null
    try {
      const portal = await Promise.race([
        bindSchool(session.id, { redirect }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 12000))
      ])
      const snap = portal ? schoolSnapshot(portal) : null
      schoolAuthToken = snap?.authToken ?? null
      schoolUser = snap?.user ?? null
    }
    catch {
      schoolAuthToken = null
      schoolUser = null
    }

    await session.update({
      redirect,
      portalHost: safeHost(redirect),
      schoolAuthToken,
      schoolUser
    })
    return { ok: true, to: '/app' }
  }

  return { ok: false, message: cleanMessage(envelope.message) }
})

function safeHost(value: string) {
  try {
    return new URL(value).host
  }
  catch {
    return null
  }
}
