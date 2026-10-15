import { createHash } from 'node:crypto'
import { Result, type SigaEnvelope } from '#shared/siga'
import { serverT } from './text'

export function md5(value: string) {
  return createHash('md5').update(value, 'utf8').digest('hex')
}

export function cleanMessage(message?: string | null) {
  if (!message) return 'Não foi possível concluir o pedido.'
  return message
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim()
}

export function apiUrl(path: string, query?: Record<string, string | undefined>) {
  const config = useRuntimeConfig()
  const base = String(config.sigaApi).replace(/\/$/, '') + '/'
  const url = new URL(path.replace(/^\//, ''), base)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value)
    }
  }
  return url
}

export async function sigaRequest<T = SigaEnvelope>(path: string, init: {
  method?: string
  body?: unknown
  query?: Record<string, string | undefined>
} = {}) {
  const config = useRuntimeConfig()
  const response = await fetch(apiUrl(path, init.query), {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': String(config.sigaKey),
      Origin: 'https://siga.edubox.pt',
      Referer: 'https://siga.edubox.pt/auth'
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(path === 'Login' || path.endsWith('/Login') ? 12000 : 20000)
  })

  const text = await response.text()
  let data: SigaEnvelope<T> | { message?: string, title?: string } | null = null
  try {
    data = text ? JSON.parse(text) : null
  }
  catch {
    data = { message: text.slice(0, 400) }
  }

  if (!response.ok) {
    const record = data as { message?: string, title?: string } | null
    throw createError({
      statusCode: response.status === 401 ? 401 : 502,
      statusMessage: cleanMessage(record?.message || record?.title || serverT('api.sigaDown'))
    })
  }

  return data as SigaEnvelope<T>
}

export function succeeded(body: { resultOperation?: number, isSuccessful?: boolean } | null | undefined) {
  return body?.resultOperation === Result.Success || body?.isSuccessful === true
}
