export const APP_ORIGIN = 'https://ms.bbksoftai.workers.dev'
export const OFFICIAL_SIGA_ORIGIN = 'https://siga.edubox.pt'

type SigaNative = {
  flushCookies?: () => void
  openAppHome?: () => void
  openOfficialLogin?: (username: string, password: string) => void
}

type CapacitorBridge = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

declare global {
  interface Window {
    SigaNative?: SigaNative
    Capacitor?: CapacitorBridge
  }
}

export function isSigaApp() {
  if (!import.meta.client) return false
  if (window.Capacitor?.isNativePlatform?.()) return true
  return /SigaApp/i.test(navigator.userAgent || '')
}

/** Persist Set-Cookie from the last XHR before a hard navigation in Android WebView. */
export function flushNativeCookies() {
  if (!import.meta.client) return
  try {
    window.SigaNative?.flushCookies?.()
  }
  catch {
    // Optional native bridge.
  }
}

/** Full document load so WebView attaches session cookies reliably. */
export function enterAppHard(path = '/app') {
  flushNativeCookies()
  const target = path.startsWith('/') ? path : `/${path}`
  window.location.assign(target)
}

/** Leave our login for the official SIGA site (reCAPTCHA works there). */
export function openOfficialSiga(creds?: { username?: string, password?: string }) {
  if (!import.meta.client) return
  flushNativeCookies()
  const username = (creds?.username || '').trim()
  const password = creds?.password || ''
  try {
    if (window.SigaNative?.openOfficialLogin) {
      window.SigaNative.openOfficialLogin(username, password)
      return
    }
  }
  catch {
    // Fall through to location assign.
  }
  const next = `${OFFICIAL_SIGA_ORIGIN.replace(/\/$/, '')}/auth`
  window.location.assign(next)
}

/** Return from official SIGA to our app shell. */
export function openAppHome(path = '/') {
  if (!import.meta.client) return
  flushNativeCookies()
  try {
    if (window.SigaNative?.openAppHome) {
      window.SigaNative.openAppHome()
      return
    }
  }
  catch {
    // Fall through to location assign.
  }
  const base = APP_ORIGIN.replace(/\/$/, '')
  const next = `${base}${path.startsWith('/') ? path : `/${path}`}`
  window.location.assign(next)
}
