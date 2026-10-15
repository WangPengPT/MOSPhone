import { sessionReady } from '../utils/session'

export default defineEventHandler(() => {
  const ready = sessionReady()
  return {
    ok: ready,
    session: ready
  }
})
