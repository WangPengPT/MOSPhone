import { cleanMessage, sigaRequest, succeeded } from '../../utils/siga'
import { serverT } from '../../utils/text'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string }>(event)
  const token = body.token?.trim() ?? ''
  if (token.length < 8) {
    throw createError({ statusCode: 400, statusMessage: serverT('api.badCode', event) })
  }

  const envelope = await sigaRequest('ValidateRecoveryToken', { body: { token } })
  return {
    ok: succeeded(envelope),
    email: typeof envelope.resultObject === 'object' && envelope.resultObject && 'email' in envelope.resultObject
      ? String((envelope.resultObject as { email?: string }).email ?? '')
      : '',
    message: succeeded(envelope) ? serverT('api.codeOk', event) : cleanMessage(envelope.message)
  }
})
