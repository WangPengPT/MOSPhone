type SigaNative = {
  flushCookies?: () => void
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
