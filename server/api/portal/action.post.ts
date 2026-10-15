import { portalModules } from '#shared/siga'
import { openSession } from '../../utils/session'
import { postModule } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const session = await openSession(event)
  const redirect = session.data?.redirect
  if (!redirect) throw createError({ statusCode: 401, statusMessage: serverT('api.signIn', event) })

  const body = await readBody<{ module?: string, payload?: unknown }>(event)
  if (!body.module || !portalModules.some(item => item.key === body.module)) {
    throw createError({ statusCode: 404, statusMessage: serverT('api.unknownModule', event) })
  }

  return postModule(session.id, redirect, body.module, body.payload ?? {}, {
    authToken: session.data.schoolAuthToken,
    user: session.data.schoolUser
  })
})
