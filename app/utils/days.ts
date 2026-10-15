export interface DayItem {
  id: string
  date: string
  marked: boolean
  title: string
  raw: Record<string, unknown>
  flag: string
}

const DATE_KEYS = ['data', 'date', 'dia', 'day']
const FLAG_KEYS = ['marcado', 'requisitado', 'selected', 'ativo', 'active']

export function extractDays(payload: unknown): DayItem[] | null {
  const list = findList(payload)
  if (!list?.length) return null
  const days: DayItem[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const record = item as Record<string, unknown>
    const dateKey = Object.keys(record).find(key => DATE_KEYS.includes(key.toLowerCase()) && record[key])
    const flagKey = Object.keys(record).find(key => FLAG_KEYS.includes(key.toLowerCase()) && typeof record[key] === 'boolean')
    if (!dateKey || !flagKey) return null
    const date = String(record[dateKey])
    const title = record.ementa || record.prato || record.descricao || record.description || record.tipo || ''
    days.push({
      id: date,
      date,
      marked: Boolean(record[flagKey]),
      title: typeof title === 'string' ? title : '',
      raw: { ...record },
      flag: flagKey
    })
  }
  return days
}

function findList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return null
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length) return value
  }
  return null
}
