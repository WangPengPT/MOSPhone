import { cleanMessage, md5, sigaRequest, succeeded } from '../../utils/siga'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string, password?: string }>(event)
  const token = body.token?.trim() ?? ''
  const password = body.password ?? ''
  if (token.length < 8) throw createError({ statusCode: 400, statusMessage: serverT('api.badCode', event) })
  assertPassword(event, password)

  const envelope = await sigaRequest('ResetPasswordByToken', {
    body: { token, password: md5(password) }
  })

  return {
    ok: succeeded(envelope),
    message: succeeded(envelope)
      ? serverT('api.passwordChanged', event)
      : cleanMessage(envelope.message)
  }
})

function assertPassword(event: Parameters<typeof serverT>[1], password: string) {
  const strong = password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
  if (!strong) {
    throw createError({
      statusCode: 400,
      statusMessage: serverT('api.weak', event)
    })
  }
}
