import type { SigaSession } from '#shared/siga'
import { cleanMessage, sigaRequest, succeeded } from '../../utils/siga'
import { openSession } from '../../utils/session'
import { bindSchool, schoolSnapshot } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ flow?: string, token?: string }>(event)
  const token = body.token?.trim() ?? ''
  if (!token) throw createError({ statusCode: 400, statusMessage: serverT('api.incomplete', event) })

  if (body.flow === 'sync') {
    const envelope = await sigaRequest('EduConnect/CheckSync/', {
      method: 'GET',
      query: { flow: 'sync', token }
    })
    return {
      ok: succeeded(envelope),
      project: envelope.resultObject ?? null,
      message: succeeded(envelope) ? '' : cleanMessage(envelope.message)
    }
  }

  if (body.flow === 'auto-login') {
    const envelope = await sigaRequest<{ redirect?: string, email?: string | null }>('EduConnect/AutoLogin', {
      body: { flow: 'auto-login', token }
    })
    const redirect = envelope.resultObject?.redirect
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
        email: envelope.resultObject?.email ?? null,
        portalHost: safeHost(redirect),
        schoolAuthToken,
        schoolUser
      })
      return { ok: true, to: '/app' }
    }
    return { ok: false, message: cleanMessage(envelope.message) }
  }

  throw createError({ statusCode: 400, statusMessage: serverT('api.unknownFlow', event) })
})

function safeHost(value: string) {
  try {
    return new URL(value).host
  }
  catch {
    return null
  }
}
