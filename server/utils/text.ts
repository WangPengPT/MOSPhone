import type { H3Event } from 'h3'
import { catalogs, normalizeLocale, type Locale } from '../../app/locales'

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

export function requestLocale(event?: H3Event): Locale {
  try {
    const current = event ?? useEvent()
    return normalizeLocale(getCookie(current, 'siga_locale'))
  }
  catch {
    return 'en'
  }
}

export function serverT(path: string, event?: H3Event) {
  const value = readPath(catalogs[requestLocale(event)], path)
  return typeof value === 'string' ? value : path
}
