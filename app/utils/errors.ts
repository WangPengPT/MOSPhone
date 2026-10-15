import { catalogs, normalizeLocale, type Locale } from '~/locales'

export function errorText(error: unknown) {
  const locale = normalizeLocale(useState<Locale>('siga-locale').value)
  const fallback = catalogs[locale].errors.request
  if (error && typeof error === 'object') {
    const record = error as {
      data?: { statusMessage?: string, message?: string }
      statusMessage?: string
      message?: string
    }
    return record.data?.statusMessage || record.data?.message || record.statusMessage || record.message || fallback
  }
  return fallback
}
