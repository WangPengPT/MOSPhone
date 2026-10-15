import { en, type Messages } from './en'
import { pt } from './pt'
import { zh } from './zh'

export const locales = ['en', 'zh', 'pt'] as const
export type Locale = (typeof locales)[number]

export const catalogs: Record<Locale, Messages> = { en, zh, pt }

export const localeChoices = [
  { code: 'en' as const, short: 'EN' },
  { code: 'zh' as const, short: '中文' },
  { code: 'pt' as const, short: 'PT' }
]

export function normalizeLocale(value: unknown): Locale {
  return value === 'zh' || value === 'pt' || value === 'en' ? value : 'en'
}

export function intlLocale(locale: Locale) {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'pt') return 'pt-PT'
  return 'en-GB'
}

export function htmlLang(locale: Locale) {
  return locale === 'zh' ? 'zh-Hans' : locale
}
