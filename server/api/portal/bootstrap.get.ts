import type { BootstrapPayload, SigaSession, Student } from '#shared/siga'
import { cleanMessage } from '../../utils/siga'
import { openSession } from '../../utils/session'
import { dropPortal, ensurePortal, persistPortalHandoff } from '../../utils/portal'
import { schoolGetUserData, schoolOk, SchoolResult } from '../../utils/school'
import { normalizeStudents } from '../../utils/views'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event): Promise<BootstrapPayload> => {
  const session = await openSession(event)
  const redirect = session.data?.redirect
  if (!redirect) {
    throw createError({ statusCode: 401, statusMessage: serverT('api.signIn', event) })
  }

  try {
    const portal = await ensurePortal(session.id, redirect, {
      authToken: session.data.schoolAuthToken,
      user: session.data.schoolUser
    })
    await persistPortalHandoff(session, portal)

    if (!portal.ready || !portal.authToken) {
      return {
        ok: false,
        needRelogin: true,
        message: portal.message || serverT('api.portalHidden', event),
        portalHost: session.data.portalHost ?? null,
        email: session.data.email ?? null,
        students: profileStudent(session.data.schoolUser)
      }
    }

    // Lightweight: students only — home module loads its own panel separately.
    const userData = await schoolGetUserData(portal)
    if (userData.ResponseCode === SchoolResult.AccessDenied) {
      dropPortal(session.id)
      await session.update({ schoolAuthToken: null })
      return {
        ok: false,
        needRelogin: true,
        message: cleanMessage(userData.ResponseMessage) || serverT('api.signIn', event),
        portalHost: session.data.portalHost ?? null,
        email: session.data.email ?? null,
        students: profileStudent(session.data.schoolUser || portal.user)
      }
    }

    const fromPayload = schoolOk(userData)
      ? normalizeStudents(userData.ResponseObject)
      : []
    const fromProfile = profileStudent(session.data.schoolUser || portal.user)

    return {
      ok: true,
      needRelogin: false,
      portalHost: session.data.portalHost ?? null,
      email: session.data.email ?? session.data.schoolUser?.UserExtra?.Email ?? portal.user.UserExtra?.Email ?? null,
      students: fromPayload.length ? fromPayload : fromProfile
    }
  }
  catch (error) {
    const message = error && typeof error === 'object' && 'statusMessage' in error
      ? String(error.statusMessage)
      : serverT('api.portalOpen', event)
    return {
      ok: false,
      needRelogin: true,
      message,
      portalHost: session.data.portalHost ?? null,
      email: session.data.email ?? null,
      students: profileStudent(session.data.schoolUser)
    }
  }
})

function profileStudent(user: SigaSession['schoolUser'] | { IdUser?: number, SchoolYearDescription?: string, UserExtra?: { DisplayName?: string, UserName?: string } | null } | null | undefined): Student[] {
  if (!user?.IdUser) return []
  const name = user.UserExtra?.DisplayName || user.UserExtra?.UserName
  if (!name) return []
  return [{
    id: String(user.IdUser),
    name,
    year: user.SchoolYearDescription ?? null,
    balance: null,
    nif: null
  }]
}
