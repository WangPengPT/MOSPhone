import { portalModules } from '#shared/siga'
import { openSession } from '../../utils/session'
import { ensurePortal, persistPortalHandoff, postModule } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const session = await openSession(event)
  const redirect = session.data?.redirect
  if (!redirect) throw createError({ statusCode: 401, statusMessage: serverT('api.signIn', event) })

  const body = await readBody<{ module?: string, payload?: unknown }>(event)
  if (!body.module || !portalModules.some(item => item.key === body.module)) {
    throw createError({ statusCode: 404, statusMessage: serverT('api.unknownModule', event) })
  }

  const portal = await ensurePortal(session.id, redirect, {
    authToken: session.data.schoolAuthToken,
    user: session.data.schoolUser
  })
  await persistPortalHandoff(session, portal)

  if (!portal.ready || !portal.authToken) {
    return {
      ok: false,
      message: portal.message || serverT('api.signIn', event),
      payload: null,
      needRelogin: true
    }
  }

  return postModule(session.id, redirect, body.module, body.payload ?? {}, {
    authToken: session.data.schoolAuthToken,
    user: session.data.schoolUser
  })
})
