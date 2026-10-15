import { cleanMessage, sigaRequest, succeeded } from '../../utils/siga'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, recaptcha?: string }>(event)
  const email = body.email?.trim() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: serverT('api.email', event) })
  }
  if (!body.recaptcha) {
    throw createError({ statusCode: 400, statusMessage: serverT('api.robot', event) })
  }

  const envelope = await sigaRequest('RecoverPassword', {
    body: { email, token: body.recaptcha }
  })

  return {
    ok: succeeded(envelope),
    message: succeeded(envelope)
      ? serverT('api.recoverSent', event)
      : cleanMessage(envelope.message)
  }
})
