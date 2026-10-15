import { portalModules } from '#shared/siga'
import { openSession } from '../../utils/session'
import { readModule } from '../../utils/portal'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const session = await openSession(event)
  const redirect = session.data?.redirect
  if (!redirect) throw createError({ statusCode: 401, statusMessage: serverT('api.signIn', event) })

  const query = getQuery(event)
  const moduleKey = String(query.module || '')
  const studentId = typeof query.studentId === 'string' ? query.studentId : null
  const part = typeof query.part === 'string' ? query.part : null
  const month = typeof query.month === 'string' ? query.month : null
  const subUnitId = typeof query.subUnitId === 'string' ? query.subUnitId : null
  if (!portalModules.some(item => item.key === moduleKey)) {
    throw createError({ statusCode: 404, statusMessage: serverT('api.unknownModule', event) })
  }

  try {
    return await readModule(session.id, redirect, moduleKey, studentId, {
      authToken: session.data.schoolAuthToken,
      user: session.data.schoolUser
    }, part, { month, subUnitId })
  }
  catch {
    return {
      ok: false,
      message: serverT('api.portalOpen', event),
      payload: null,
      canTopUp: false,
      canSaveDays: false
    }
  }
})
