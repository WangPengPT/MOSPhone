import { catalogs, intlLocale, normalizeLocale, type Locale } from '~/locales'

function activeLocale(): Locale {
  return normalizeLocale(useState<Locale>('siga-locale').value)
}

function foldLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function labelOf(key: string) {
  const plain = key.replace(/[_-]/g, '').toLowerCase()
  const fields = catalogs[activeLocale()].fields as Record<string, string>
  if (fields[plain]) return fields[plain]
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, char => char.toUpperCase())
}

export function formatMoney(value: unknown) {
  const number = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(number)) return String(value ?? '')
  return new Intl.NumberFormat(intlLocale(activeLocale()), { style: 'currency', currency: 'EUR' }).format(number)
}

export function hasMeaningfulMoney(value: unknown) {
  if (value == null || value === '') return false
  const number = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(number) && number !== 0
}

export function textOf(key: string, value: unknown) {
  const pack = catalogs[activeLocale()]
  if (typeof value === 'boolean') return value ? pack.data.yes : pack.data.no
  if (value == null || value === '') return '—'
  if (typeof value === 'number' && /saldo|valor|montante|preco|preço|total/i.test(key)) return formatMoney(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(intlLocale(activeLocale()), { dateStyle: value.length > 10 ? 'short' : 'medium', timeStyle: value.length > 10 ? 'short' : undefined }).format(date)
    }
  }
  return String(value)
}

export function toneOf(value: unknown) {
  if (typeof value !== 'string') return null
  if (/autoriz|pago|ativ|sucesso|confirm|dispon|allowed|paid|success/i.test(value)) return 'success'
  if (/negad|anulad|falh|erro|fech|esgot|denied|failed|error/i.test(value)) return 'error'
  if (/pendent|aguard|pending|waiting/i.test(value)) return 'warning'
  return null
}

export function isHiddenKey(key: string) {
  return /password|token|secret|apikey|recaptcha|serverip|redirect/i.test(key)
}

function translateMealPiece(piece: string, meals: (typeof catalogs)['en']['meals']) {
  const folded = foldLabel(piece)
  if (!folded) return piece
  if ((folded.includes('pequeno') && folded.includes('almoco')) || folded === 'breakfast') return meals.breakfast
  if (folded === 'almoco' || folded === 'lunch') return meals.lunch
  if (folded === 'lanche' || folded === 'snack') return meals.snack
  if (folded === 'jantar' || folded === 'dinner') return meals.dinner
  if (folded.startsWith('refeico') || folded === 'meals') return meals.meals
  if (folded.includes('escolares') || folded.includes('schoolmeals')) return meals.schoolMeals
  if (folded === 'bar') return meals.bar
  if (folded.startsWith('transporte')) return meals.transport
  if (folded === 'multa' || folded === 'fine') return meals.fine
  // Loose match for slightly longer labels ("Almoço escolar")
  if (folded.includes('pequeno') && folded.includes('almoco')) return meals.breakfast
  if (folded.includes('almoco') && !folded.includes('pequeno')) return meals.lunch
  if (folded.includes('lanche')) return meals.snack
  return piece
}

/** Translate common SIGA meal/wallet unit labels for parents. */
export function formatWalletUnit(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const meals = catalogs[activeLocale()].meals
  const parts = raw.split(/\s*[/|]\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length > 1) {
    return parts.map(part => translateMealPiece(part, meals)).join(' · ')
  }
  return translateMealPiece(raw, meals)
}

/** True when the subunit is lunch (Almoço), not breakfast. */
export function isLunchSubUnitName(value: unknown) {
  const folded = foldLabel(String(value ?? ''))
  return folded.includes('almoco') && !folded.includes('pequeno')
}
