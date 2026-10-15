import type { AuthMe } from '#shared/siga'
import { openSession } from '../../utils/session'

export default defineEventHandler(async (event): Promise<AuthMe> => {
  try {
    const session = await openSession(event)
    return {
      authenticated: Boolean(session.data?.redirect),
      email: session.data?.email ?? null,
      portalHost: session.data?.portalHost ?? null
    }
  }
  catch {
    return { authenticated: false, email: null, portalHost: null }
  }
})
