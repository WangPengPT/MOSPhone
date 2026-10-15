import { cleanMessage, md5, sigaRequest, succeeded } from '../../utils/siga'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ idUserCentral?: string, password?: string }>(event)
  const idUserCentral = body.idUserCentral?.trim() ?? ''
  const password = body.password ?? ''
  if (!idUserCentral) throw createError({ statusCode: 400, statusMessage: serverT('api.account', event) })
  const strong = password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
  if (!strong) {
    throw createError({
      statusCode: 400,
      statusMessage: serverT('api.weak', event)
    })
  }

  const envelope = await sigaRequest('SetPasswordFirstAccess', {
    body: { idUserCentral, password: md5(password) }
  })

  return {
    ok: succeeded(envelope),
    message: succeeded(envelope)
      ? serverT('api.passwordSet', event)
      : cleanMessage(envelope.message)
  }
})
