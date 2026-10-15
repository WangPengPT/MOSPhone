import type { BootstrapPayload, SigaSession, Student } from '#shared/siga'
import { openSession } from '../../utils/session'
import { ensurePortal, schoolSnapshot } from '../../utils/portal'
import { schoolGetUserData, schoolOk } from '../../utils/school'
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

    // Persist school handoff once ready (login no longer waits for it).
    if (portal.ready && portal.authToken && !session.data.schoolAuthToken) {
      const snap = schoolSnapshot(portal)
      if (snap) {
        await session.update({
          schoolAuthToken: snap.authToken,
          schoolUser: snap.user
        })
      }
    }

    if (!portal.ready || !portal.authToken) {
      return {
        ok: false,
        message: portal.message || serverT('api.portalHidden'),
        portalHost: session.data.portalHost ?? null,
        email: session.data.email ?? null,
        students: profileStudent(session.data.schoolUser)
      }
    }

    // Lightweight: students only — home module loads its own panel separately.
    const userData = await schoolGetUserData(portal)
    const fromPayload = schoolOk(userData)
      ? normalizeStudents(userData.ResponseObject)
      : []
    const fromProfile = profileStudent(session.data.schoolUser || portal.user)

    return {
      ok: true,
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
