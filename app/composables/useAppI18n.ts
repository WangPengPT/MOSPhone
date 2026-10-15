import { catalogs, htmlLang, localeChoices, normalizeLocale, type Locale } from '~/locales'

const LOCALE_STORAGE_KEY = 'siga_locale'

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

function readStoredLocale(): Locale | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    return raw ? normalizeLocale(raw) : null
  }
  catch {
    return null
  }
}

function writeStoredLocale(next: Locale) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
  }
  catch {
    // ignore quota / private mode
  }
}

export function useAppI18n() {
  const cookie = useCookie<string | null>('siga_locale', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/'
  })
  const hydrated = useState('siga-locale-hydrated', () => false)
  const locale = useState<Locale>('siga-locale', () => normalizeLocale(cookie.value))

  if (import.meta.server) {
    locale.value = normalizeLocale(cookie.value)
  }
  else if (!hydrated.value) {
    const stored = readStoredLocale()
    const next = stored || normalizeLocale(cookie.value)
    locale.value = next
    cookie.value = next
    if (!stored) writeStoredLocale(next)
    hydrated.value = true
  }

  const messages = computed(() => catalogs[locale.value] ?? catalogs.en)

  function setLocale(next: Locale) {
    const value = normalizeLocale(next)
    locale.value = value
    cookie.value = value
    writeStoredLocale(value)
  }

  function t(path: string, params?: Record<string, string | number>) {
    const value = readPath(messages.value, path)
    const text = typeof value === 'string' ? value : path
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''))
  }

  return { locale, setLocale, t, messages, choices: localeChoices, htmlLang: computed(() => htmlLang(locale.value)) }
}

export function useNotice() {
  const { t } = useAppI18n()
  const key = ref('')
  const text = ref('')
  const message = computed(() => text.value || (key.value ? t(key.value) : ''))

  function showKey(value: string) {
    text.value = ''
    key.value = value
  }

  function showText(value: string) {
    key.value = ''
    text.value = value
  }

  function clear() {
    key.value = ''
    text.value = ''
  }

  return { message, showKey, showText, clear }
}
