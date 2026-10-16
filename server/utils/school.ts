import { cleanMessage, md5 } from './siga'

export const SchoolResult = {
  Success: 1,
  Error: 2,
  AccessDenied: 3,
  NoData: 4
} as const

export interface SchoolEnvelope<T = unknown> {
  ResponseCode: number
  ResponseMessage?: string | null
  ResponseObject: T
}

export interface SchoolUserInfo {
  IdUser?: number
  IdUserType?: number
  IdSchool?: number
  IdSchoolYear?: number
  IdProject?: number
  Token?: string
  AuthToken?: string
  SchoolYearDescription?: string
  MasterMenu?: Array<{ Path?: string, Id?: number, Description?: string, SubMenus?: unknown[] }>
  UserExtra?: {
    DisplayName?: string
    UserName?: string
    Email?: string
    UserType?: string
    Photo?: string
    SchoolYears?: unknown[]
  } | null
  Targets?: number[]
}

export interface SchoolSession {
  origin: string
  serviceUrl: string
  authToken: string
  user: SchoolUserInfo
}

function assertSchoolHost(hostname: string) {
  const host = hostname.toLowerCase()
  if (!(host.endsWith('.siga.edubox.pt') || host === 'siga.edubox.pt')) {
    throw new Error('Unsupported school host')
  }
  if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    throw new Error('Blocked school host')
  }
}

export function schoolOriginFromRedirect(redirect: string) {
  const url = new URL(redirect.replace(/^http:\/\//, 'https://'))
  assertSchoolHost(url.hostname)
  return url.origin
}

export function serviceUrlForOrigin(origin: string) {
  return `${origin.replace(/\/$/, '')}/Services/WSSiga2020/SIGAService2020.svc`
}

export async function schoolCall<T = unknown>(
  serviceUrl: string,
  method: string,
  parameters: unknown = {},
  authToken = '',
  timeoutMs = 20000
): Promise<SchoolEnvelope<T>> {
  const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/${method}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      Token: authToken || '',
      Parameters: JSON.stringify(parameters ?? {})
    }),
    signal: AbortSignal.timeout(timeoutMs)
  })

  const text = await response.text()
  let data: SchoolEnvelope<T> | null = null
  try {
    data = JSON.parse(text) as SchoolEnvelope<T>
  }
  catch {
    data = null
  }

  if (!data || typeof data !== 'object' || !('ResponseCode' in data)) {
    return {
      ResponseCode: SchoolResult.Error,
      ResponseMessage: response.ok ? 'Invalid school response' : cleanMessage(text) || `HTTP ${response.status}`,
      ResponseObject: null as T
    }
  }

  return data
}

export function schoolOk(envelope: SchoolEnvelope) {
  const code = Number(envelope.ResponseCode)
  return code === SchoolResult.Success || code === SchoolResult.NoData
}

export async function openSchoolSession(input: {
  redirect: string
  username?: string
  password?: string
}): Promise<SchoolSession | null> {
  const origin = schoolOriginFromRedirect(input.redirect)
  const serviceUrl = serviceUrlForOrigin(origin)
  const redirectUrl = new URL(input.redirect.replace(/^http:\/\//, 'https://'))
  const sessionToken = redirectUrl.searchParams.get('SessionToken') || ''

  const tryAttempt = async (
    method: string,
    parameters: Record<string, unknown>,
    timeoutMs: number
  ): Promise<SchoolSession | null> => {
    try {
      const envelope = await schoolCall<SchoolUserInfo>(serviceUrl, method, parameters, '', timeoutMs)
      const user = envelope.ResponseObject
      const authToken = typeof user?.AuthToken === 'string' ? user.AuthToken : ''
      if (envelope.ResponseCode === SchoolResult.Success && authToken) {
        return { origin, serviceUrl, authToken, user }
      }
    }
    catch {
      // try next path
    }
    return null
  }

  // Fast path: SessionToken AutoLogin is what SIGA uses after central login.
  if (sessionToken) {
    const auto = await tryAttempt('AutoLogin', { Login: '', AccessCode: '', GUID: sessionToken }, 4000)
    if (auto) return auto
    const external = await tryAttempt('CheckAutoLoginExternal', {
      Login: '',
      AccessCode: '',
      Encryption: sessionToken,
      IdPageExternalLogin: 0
    }, 4000)
    if (external) return external
  }

  // Fallback only when token handoff failed.
  if (input.username && input.password) {
    const plain = tryAttempt('SIGA2020_Login', { Login: input.username, AccessCode: input.password }, 5000)
    const hashed = tryAttempt('SIGA2020_Login', { Login: input.username, AccessCode: md5(input.password) }, 5000)
    const raced = await Promise.any([
      plain.then(value => value || Promise.reject(new Error('miss'))),
      hashed.then(value => value || Promise.reject(new Error('miss')))
    ]).catch(() => null)
    if (raced) return raced
  }

  return null
}

export async function schoolGetUserData(session: SchoolSession) {
  const idUser = session.user.IdUser
  if (!idUser) {
    return schoolCall(session.serviceUrl, 'GET_SessionUserData', {}, session.authToken)
  }
  return schoolCall(session.serviceUrl, 'GET_UserData', { IdUser: idUser }, session.authToken)
}

export async function schoolApiGet<T = unknown>(origin: string, path: string, authToken: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path.startsWith('http') ? path : `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`)
  assertSchoolHost(url.hostname)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: `Basic ${authToken}`,
      'X-Requested-With': 'XMLHttpRequest'
    },
    signal: AbortSignal.timeout(20000)
  })
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  }
  catch {
    return { ok: response.ok, text: text.slice(0, 500) } as T
  }
}

export async function schoolApiPost<T = unknown>(
  origin: string,
  path: string,
  authToken: string,
  body: unknown,
  timeoutMs = 20000
) {
  const url = new URL(path.startsWith('http') ? path : `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`)
  assertSchoolHost(url.hostname)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(timeoutMs)
  })
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  }
  catch {
    return {
      ResponseCode: response.ok ? SchoolResult.Success : SchoolResult.Error,
      ResponseMessage: text.slice(0, 500),
      ResponseObject: null
    } as T
  }
}
