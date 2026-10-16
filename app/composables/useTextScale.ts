export type TextScale = 'normal' | 'large'

const STORAGE_KEY = 'siga_text_scale'

function normalizeScale(value: unknown): TextScale {
  return value === 'large' ? 'large' : 'normal'
}

function readStoredScale(): TextScale | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeScale(raw) : null
  }
  catch {
    return null
  }
}

function writeStoredScale(next: TextScale) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, next)
  }
  catch {
    // ignore quota / private mode
  }
}

function applyHtmlClass(next: TextScale) {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('siga-text-large', next === 'large')
}

export function useTextScale() {
  const cookie = useCookie<string | null>('siga_text_scale', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/'
  })
  const hydrated = useState('siga-text-scale-hydrated', () => false)
  const scale = useState<TextScale>('siga-text-scale', () => normalizeScale(cookie.value))

  if (import.meta.server) {
    scale.value = normalizeScale(cookie.value)
  }
  else if (!hydrated.value) {
    const stored = readStoredScale()
    const next = stored || normalizeScale(cookie.value)
    scale.value = next
    cookie.value = next
    if (!stored) writeStoredScale(next)
    applyHtmlClass(next)
    hydrated.value = true
  }

  const isLarge = computed(() => scale.value === 'large')

  function setScale(next: TextScale) {
    const value = normalizeScale(next)
    scale.value = value
    cookie.value = value
    writeStoredScale(value)
    applyHtmlClass(value)
  }

  function toggle() {
    setScale(scale.value === 'large' ? 'normal' : 'large')
  }

  return { scale, isLarge, setScale, toggle }
}
