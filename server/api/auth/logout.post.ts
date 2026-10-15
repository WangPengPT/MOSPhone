import { dropPortal } from '../../utils/portal'
import { openSession, setRemember } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await openSession(event)
  dropPortal(session.id)
  await session.clear()
  setRemember(event, false)
  return { ok: true }
})
