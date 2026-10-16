import type { Student } from '#shared/siga'

export type PanelKind = 'home' | 'wallet' | 'profile' | 'list' | 'bookings' | 'menus' | 'raw'

export interface PanelItem {
  id: string
  title: string
  subtitle?: string
  meta?: string
  amount?: number | string | null
  tone?: 'success' | 'warning' | 'error' | null
}

export interface HomeBookingSummary {
  studentId: string
  studentName: string | null
  month: string
  subUnitName: string | null
  bookedCount: number
  openCount: number
  canEdit: boolean
}

export interface HomeAlert {
  id: string
  title: string
  meta?: string | null
}

export interface HomePanel {
  kind: 'home'
  greeting: string | null
  email: string | null
  schoolYear: string | null
  balance: number | string | null
  students: Student[]
  focusStudent: Student | null
  booking: HomeBookingSummary | null
  alerts: HomeAlert[]
  shortcuts?: Array<{ key: string, to: string }>
}

export interface WalletCard {
  id: string
  name?: string | null
  number?: string | null
  nif?: string | null
  balance?: number | string | null
  meta?: string | null
}

export interface WalletOption {
  value: number | string
  label: string
}

export interface WalletCreateDraft {
  id?: number | null
  idUser?: number | null
  idUserSiga?: number | null
  userSigaName?: string | null
  idWalletCorporateInstitution?: number | null
  idWalletInstitution?: number | null
  idEnumAccountState?: number | null
  idEnumAccountType?: number | null
  documentTypeList?: WalletOption[]
  studentName?: string | null
  studentBirthDate?: string | null
  studentNif?: string | null
  studentEchelon?: number | null
  eeName?: string | null
  eeDocumentType?: number | null
  eeDocNumber?: string | null
  eeNif?: string | null
  eeAddress?: string | null
  eePostalCode?: string | null
  eePostalExt?: string | null
  eeCity?: string | null
  eeExpiryDate?: string | null
  eeEmail?: string | null
  raw?: Record<string, unknown> | null
}

export interface WalletPanel {
  kind: 'wallet'
  studentName?: string | null
  studentYear?: string | null
  balance: number | string | null
  available?: number | string | null
  reserved?: number | string | null
  credit?: number | string | null
  hasWallet?: boolean | null
  canCreateWallet?: boolean | null
  accountState?: number | null
  accountBlocked?: boolean | null
  createDraft?: WalletCreateDraft | null
  echelonOptions?: WalletOption[]
  cards: WalletCard[]
  units: PanelItem[]
  movements: PanelItem[]
  loaded?: {
    summary?: boolean
    cards?: boolean
    units?: boolean
    movements?: boolean
  }
}

export interface ProfilePanel {
  kind: 'profile'
  fields: Array<{ key: string, label: string, value: string }>
}

export interface ListPanel {
  kind: 'list'
  titleKey?: string
  items: PanelItem[]
  extras?: Record<string, unknown>
}

export interface BookingPick {
  idPeriod: number
  description: string
  selected: boolean
  locked: boolean
  price: number | string | null
  idRequisition: number | null
  /** SIGA day-pick state: 0 free, 4/6 booked, 5 cancel existing */
  requisition?: number
  initialRequisition?: number
  raw?: Record<string, unknown>
}

export interface BookingDay {
  id: string
  date: string
  weekday: number
  locked: boolean
  picks: BookingPick[]
}

export interface BookingSubUnit {
  id: string
  name: string
  unitName: string
  unitId: string
  calendarType?: number
}

export interface BookingPlate {
  id: number
  name: string
  kind: 'normal' | 'vegetarian' | 'other'
}

export interface BookingsPanel {
  kind: 'bookings'
  mode: 'days' | 'periods'
  studentId: string
  month: string
  subUnits: BookingSubUnit[]
  selectedSubUnitId: string | null
  periodLabels: Array<{ id: number, description: string }>
  days: BookingDay[]
  canEdit: boolean
  bookedCount: number
  openCount: number
  /** Available meal plates (normal / vegetarian / …) from SIGA */
  plates?: BookingPlate[]
  /** Original UserPick wrapper needed by CalendarGeneric POST */
  userPick?: Record<string, unknown> | null
}

export interface MenuItem {
  id: string
  title: string
  school: string | null
  firm: string | null
  startDate: string | null
  endDate: string | null
  fileUrl: string | null
  isActual: boolean
  periodLabel: string | null
  idSchool: number | null
  idSubUnit: number | null
}

export interface MenusPanel {
  kind: 'menus'
  studentId: string
  schools: Array<{ id: string, name: string }>
  subUnits: Array<{ id: string, name: string }>
  menus: MenuItem[]
}

export type ModuleView = HomePanel | WalletPanel | ProfilePanel | ListPanel | BookingsPanel | MenusPanel | { kind: 'raw', data: unknown }

const MONEY_KEYS = /saldo|balance|available|valor|amount|montante|total|price|preco|preço/i
const NAME_KEYS = /nome|name|displayname|title|descricao|description|assunto|subject/i
const DATE_KEYS = /data|date|dia|day|created|movimento|when/i
const STATUS_KEYS = /estado|status|situacao|situação|result/i

export function asHome(input: {
  profile?: Record<string, unknown> | null
  userData?: unknown
  wallets?: unknown
  students?: unknown
  focusStudentId?: string | null
  focusBalance?: unknown
  booking?: HomeBookingSummary | null
  alerts?: HomeAlert[]
}): HomePanel {
  const profile = input.profile || {}
  // Prefer UserData.ChildUsers (has ShortUserName) over raw wallet id lists.
  const students = normalizeStudents(input.userData, input.wallets, input.students)
  const focusStudent = students.find(item => item.id === String(input.focusStudentId || '')) || students[0] || null
  const focusBalance = firstMoney(input.focusBalance)
  const balance = focusBalance
    ?? (focusStudent?.balance ?? null)
    ?? firstMoney(input.wallets)
    ?? firstMoney(input.userData)
    ?? null
  return {
    kind: 'home',
    greeting: stringOf(profile.displayName) || stringOf(profile.userName) || null,
    email: stringOf(profile.email),
    schoolYear: stringOf(profile.schoolYear),
    balance,
    students,
    focusStudent: focusStudent
      ? { ...focusStudent, balance: focusBalance ?? focusStudent.balance ?? null }
      : null,
    booking: input.booking || null,
    alerts: Array.isArray(input.alerts) ? input.alerts.slice(0, 5) : []
  }
}

export function asHomeAlerts(payload: unknown): HomeAlert[] {
  const items = asItems(payload)
  return items.slice(0, 5).map(item => ({
    id: item.id,
    title: item.title,
    meta: item.meta || item.subtitle || null
  }))
}

export function asWallet(input: {
  balance?: unknown
  movements?: unknown
  wallets?: unknown
  units?: unknown
  student?: Student | null
  hasWallet?: boolean | null
  canCreateWallet?: boolean | null
  createDraft?: WalletCreateDraft | null
  echelonOptions?: WalletOption[]
  accountState?: number | null
  accountBlocked?: boolean | null
}): WalletPanel {
  const fromBalance = moneyFromBalance(input.balance)
  const fromWallets = moneyFromBalance(input.wallets)
  const available = fromBalance.available ?? fromWallets.available ?? firstMoney(input.balance) ?? firstMoney(input.wallets) ?? input.student?.balance ?? null
  const reserved = fromBalance.reserved ?? fromWallets.reserved
  const credit = fromBalance.credit ?? fromWallets.credit
  const cards = input.wallets === undefined ? [] : asCards(input.wallets, input.balance)
  const units = input.units === undefined ? [] : asItems(input.units).slice(0, 24)
  const movements = input.movements === undefined ? [] : asItems(input.movements).slice(0, 40)
  const hasWallet = input.hasWallet ?? fromBalance.hasWallet ?? fromWallets.hasWallet
  return {
    kind: 'wallet',
    studentName: input.student?.name || input.createDraft?.studentName || null,
    studentYear: input.student?.year || null,
    balance: available,
    available,
    reserved,
    credit,
    hasWallet,
    canCreateWallet: input.canCreateWallet ?? null,
    accountState: input.accountState ?? input.createDraft?.idEnumAccountState ?? null,
    accountBlocked: input.accountBlocked ?? null,
    createDraft: input.createDraft || null,
    echelonOptions: input.echelonOptions || [],
    cards,
    units,
    movements,
    loaded: {
      summary: true,
      cards: input.wallets !== undefined,
      units: input.units !== undefined,
      movements: input.movements !== undefined
    }
  }
}

/** Active = 1, Suspended = 2, Closed = 3 */
export function walletAllowsTopUp(input: {
  hasWallet?: boolean | null
  accountState?: number | null
  accountBlocked?: boolean | null
}) {
  if (input.accountBlocked) return false
  // Only hide top-up when SIGA explicitly says there is no wallet.
  // Home balance payloads often omit HasWallet even when a card exists.
  if (input.hasWallet === false) return false
  if (input.accountState == null) return true
  return Number(input.accountState) === 1
}

export function asWalletCreateDraft(payload: unknown): WalletCreateDraft | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>
  const user = record.User && typeof record.User === 'object' && !Array.isArray(record.User)
    ? record.User as Record<string, unknown>
    : {}
  const charge = record.EducationCharge && typeof record.EducationCharge === 'object' && !Array.isArray(record.EducationCharge)
    ? record.EducationCharge as Record<string, unknown>
    : {}
  const documentTypes = Array.isArray(record.DocumentTypeList)
    ? record.DocumentTypeList
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const value = row.Id ?? row.id ?? row.Value ?? row.value
        const label = row.Description ?? row.description ?? row.Name ?? row.name ?? value
        if (value == null || label == null) return null
        return { value: value as number | string, label: String(label) }
      })
      .filter((item): item is WalletOption => Boolean(item))
    : []

  return {
    id: numberOrNull(record.Id),
    idUser: numberOrNull(record.IdUser),
    idUserSiga: numberOrNull(record.IdUserSIGA) ?? numberOrNull(charge.IdUserSIGA),
    userSigaName: stringOf(record.UserSIGAName),
    idWalletCorporateInstitution: numberOrNull(record.IdWalletCorporateInstitution),
    idWalletInstitution: numberOrNull(record.IdWalletInstitution),
    idEnumAccountState: numberOrNull(record.IdEnumAccountState),
    idEnumAccountType: numberOrNull(record.IdEnumAccountType),
    documentTypeList: documentTypes,
    studentName: stringOf(user.Name) || stringOf(record.UserSIGAName),
    studentBirthDate: formatWalletDate(user.BirthDate),
    studentNif: stringOf(user.VatNumber) || '999999990',
    studentEchelon: numberOrNull(user.IdEnumEchelon),
    eeName: stringOf(charge.Name),
    eeDocumentType: numberOrNull(charge.IdEnumDocumentType) ?? (documentTypes[0] ? Number(documentTypes[0].value) : 2),
    eeDocNumber: stringOf(charge.DocNumber),
    eeNif: stringOf(charge.VatNumber),
    eeAddress: stringOf(charge.Address),
    eePostalCode: stringOf(charge.PostalCode),
    eePostalExt: stringOf(charge.PostalCodeExtension),
    eeCity: stringOf(charge.City),
    eeExpiryDate: formatWalletDate(charge.ExpiryDate),
    eeEmail: stringOf(charge.Email),
    raw: record
  }
}

export function asWalletEchelons(payload: unknown): WalletOption[] {
  const list = firstArray(payload)
  return list
    .map((item) => {
      if (item == null) return null
      if (typeof item === 'number' || typeof item === 'string') {
        return { value: item, label: String(item) }
      }
      if (typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const value = row.Id ?? row.id ?? row.Value ?? row.value ?? row.IdEnumEchelon
      const label = row.Description ?? row.description ?? row.Name ?? row.name ?? value
      if (value == null) return null
      return { value: value as number | string, label: String(label) }
    })
    .filter((item): item is WalletOption => Boolean(item))
}

export function accountCollectionBlocked(payload: unknown): boolean {
  const rows = firstArray(payload)
  const list = rows.length ? rows : (payload && typeof payload === 'object' ? [payload] : [])
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.IsClosed === true || row.HasCloseRequest === true) return true
    if (Number(row.IdEnumAccountState) === 2 || Number(row.IdEnumAccountState) === 3) return true
  }
  return false
}

function numberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return null
}

function formatWalletDate(value: unknown) {
  if (value == null || value === '') return null
  const raw = String(value)
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw
  const iso = Date.parse(raw)
  if (!Number.isNaN(iso)) {
    const date = new Date(iso)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }
  return raw
}

export function asProfile(user: Record<string, unknown> | null, details: unknown): ProfilePanel {
  const fields: ProfilePanel['fields'] = []
  const source = {
    ...(details && typeof details === 'object' && !Array.isArray(details) ? details as Record<string, unknown> : {}),
    ...(user || {})
  }
  const order = [
    ['displayName', 'name'],
    ['userName', 'username'],
    ['email', 'email'],
    ['userType', 'tipo'],
    ['schoolYear', 'anoescolaridade'],
    ['idSchool', 'escola'],
    ['idProject', 'projeto'],
    ['idUser', 'id']
  ]
  for (const [key, label] of order) {
    const value = source[key]
    if (value == null || value === '') continue
    fields.push({ key, label, value: String(value) })
  }
  return { kind: 'profile', fields }
}

export function asList(titleKey: string | undefined, payload: unknown, extras?: Record<string, unknown>): ListPanel {
  return {
    kind: 'list',
    titleKey,
    items: asItems(payload).slice(0, 60),
    extras
  }
}

export function classifyPlateKind(name: string): BookingPlate['kind'] {
  const folded = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
  if (!folded) return 'normal'
  if (
    folded.includes('vegetar')
    || folded.includes('vegan')
    || folded.includes('全素')
    || folded.includes('素食')
  ) return 'vegetarian'
  if (
    folded.includes('normal')
    || folded.includes('padrao')
    || folded.includes('standard')
    || folded.includes('常规')
    || folded.includes('正常')
  ) return 'normal'
  return 'other'
}

export function mergeBookingPlates(...groups: Array<BookingPlate[] | undefined | null>): BookingPlate[] {
  const byId = new Map<number, BookingPlate>()
  for (const group of groups) {
    if (!group) continue
    for (const plate of group) {
      if (!Number.isFinite(plate.id) || plate.id < 0) continue
      const existing = byId.get(plate.id)
      if (!existing || (existing.kind === 'other' && plate.kind !== 'other')) {
        byId.set(plate.id, plate)
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const rank = (kind: BookingPlate['kind']) => (kind === 'normal' ? 0 : kind === 'vegetarian' ? 1 : 2)
    return rank(a.kind) - rank(b.kind) || a.id - b.id
  })
}

export function extractPlatesFromUnknown(source: unknown, depth = 0): BookingPlate[] {
  if (!source || depth > 6) return []
  if (Array.isArray(source)) {
    const direct = source
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null
        const row = item as Record<string, unknown>
        if (!('IdPlate' in row || 'idPlate' in row)) return null
        const id = Number(row.IdPlate ?? row.idPlate)
        if (!Number.isFinite(id) || id < 0) return null
        const name = String(row.Plate || row.Description || row.Name || row.PlateDescription || row.name || '').trim()
        if (!name && id === 0) return null
        return {
          id,
          name: name || `Plate ${id}`,
          kind: classifyPlateKind(name || (id === 0 ? 'normal' : ''))
        } satisfies BookingPlate
      })
      .filter((item): item is BookingPlate => Boolean(item))
    if (direct.length) return mergeBookingPlates(direct)
    return mergeBookingPlates(...source.map(item => extractPlatesFromUnknown(item, depth + 1)))
  }
  if (typeof source !== 'object') return []
  const record = source as Record<string, unknown>
  const preferredKeys = [
    'UserPlates',
    'PlateCollection',
    'ProjectPlates',
    'Plates',
    'UserPlateCollection',
    'SchoolPlates',
    'SchoolCollection'
  ]
  const groups: BookingPlate[][] = []
  for (const key of preferredKeys) {
    if (key in record) groups.push(extractPlatesFromUnknown(record[key], depth + 1))
  }
  return mergeBookingPlates(...groups)
}

export function extractPlatesFromDayCollection(dayCollection: Array<Record<string, unknown>>): BookingPlate[] {
  const plates: BookingPlate[] = []
  for (const bucket of dayCollection) {
    const rows = Array.isArray(bucket.UserPickDays)
      ? bucket.UserPickDays as Array<Record<string, unknown>>
      : []
    for (const row of rows) {
      const id = Number(row.IdPlate ?? 0)
      if (!Number.isFinite(id) || id < 0) continue
      const name = String(row.Plate || '').trim()
      if (!name && id === 0) continue
      plates.push({
        id,
        name: name || `Plate ${id}`,
        kind: classifyPlateKind(name || (id === 0 ? 'normal' : ''))
      })
    }
  }
  return mergeBookingPlates(plates)
}

export function asBookings(input: {
  studentId: string
  month: string
  subUnits: BookingSubUnit[]
  selectedSubUnitId: string | null
  calendar: unknown
  mode?: 'days' | 'periods'
  canEdit?: boolean
  userPick?: Record<string, unknown> | null
  plates?: BookingPlate[]
}): BookingsPanel {
  const calendar = input.calendar && typeof input.calendar === 'object' && !Array.isArray(input.calendar)
    ? input.calendar as Record<string, unknown>
    : {}

  const dayCollection = Array.isArray(calendar.UserPickerDaysCollection)
    ? calendar.UserPickerDaysCollection as Array<Record<string, unknown>>
    : []
  const mode = input.mode || (dayCollection.length ? 'days' : 'periods')

  if (mode === 'days') {
    return asDayBookings(input, calendar, dayCollection)
  }
  return asPeriodBookings(input, calendar)
}

function asDayBookings(
  input: {
    studentId: string
    month: string
    subUnits: BookingSubUnit[]
    selectedSubUnitId: string | null
    canEdit?: boolean
    userPick?: Record<string, unknown> | null
    plates?: BookingPlate[]
  },
  calendar: Record<string, unknown>,
  dayCollection: Array<Record<string, unknown>>
): BookingsPanel {
  const selectedId = Number(input.selectedSubUnitId)
  const bucket = dayCollection.find(item => Number(item.IdSubUnit) === selectedId) || dayCollection[0]
  const userPick = input.userPick || (bucket ? { ...bucket } : null)
  const rows = bucket && Array.isArray(bucket.UserPickDays)
    ? bucket.UserPickDays as Array<Record<string, unknown>>
    : []
  const rootLocked = Boolean(calendar.IsLocked || bucket?.IsRequisitionLockedByInvoice)

  const days: BookingDay[] = rows.map((row) => {
    const date = normalizeDay(row.Date) || String(row.Date || '')
    // Free / unset days arrive as -1 from CalendarGeneric.
    const requisitionRaw = Number(row.Requisition ?? 0)
    const requisition = requisitionRaw > 0 ? requisitionRaw : 0
    const selected = requisition === 4 || requisition === 6
    const idRequisition = Number(row.IdRequisition)
    const idAttendance = Number(row.IdAttendance)
    const idPlate = Number(row.IdPlate)
    const idSchoolRequisition = Number(row.IdSchoolRequisition)
    const idSchoolAttendance = Number(row.IdSchoolAttendance)
    // Only invoice / explicit requisition locks block booking. Past days stay visible
    // so parents can still cancel when the portal allows it.
    // Ignore IsRequisitionLocked on free (-1) days — SIGA marks those locked=true even when open.
    const locked = rootLocked
      || Boolean(row.IsRequisitionLockedByInvoice)
      || (selected && Boolean(row.IsRequisitionLocked))
    return {
      id: date,
      date,
      weekday: weekdayOf(date),
      locked,
      picks: [{
        idPeriod: 0,
        description: String(row.Plate || row.SchoolRequisition || 'Meal'),
        selected,
        locked,
        price: (row.FamilyValue ?? row.InitialFamilyValue ?? null) as number | string | null,
        idRequisition: idRequisition > 0 ? idRequisition : null,
        requisition,
        initialRequisition: requisition,
        raw: {
          ...row,
          Requisition: requisition,
          IdRequisition: idRequisition > 0 ? idRequisition : 0,
          IdAttendance: idAttendance > 0 ? idAttendance : 0,
          IdPlate: idPlate > 0 ? idPlate : 0,
          IdSchoolRequisition: idSchoolRequisition > 0 ? idSchoolRequisition : 0,
          IdSchoolAttendance: idSchoolAttendance > 0 ? idSchoolAttendance : 0,
          Attendance: Number(row.Attendance) > 0 ? Number(row.Attendance) : 0,
          InitialRequisition: requisition,
          InitialIdRequisition: idRequisition > 0 ? idRequisition : 0,
          InitialIdAttendance: idAttendance > 0 ? idAttendance : 0,
          InitialFamilyValue: typeof row.FamilyValue === 'string' ? row.FamilyValue.trim() : (row.FamilyValue ?? 0),
          InitialIdUserEchelon: Number(row.IdUserEchelon) > 0 ? Number(row.IdUserEchelon) : 0,
          InitialEchelon: row.Echelon ?? '',
          InitialIdPlate: idPlate > 0 ? idPlate : 0
        }
      }]
    }
  }).filter(day => day.date).sort((a, b) => a.date.localeCompare(b.date))

  const canEdit = input.canEdit !== false && !rootLocked
  const plates = mergeBookingPlates(input.plates, extractPlatesFromDayCollection(dayCollection))
  return {
    kind: 'bookings',
    mode: 'days',
    studentId: input.studentId,
    month: input.month,
    subUnits: input.subUnits,
    selectedSubUnitId: input.selectedSubUnitId,
    periodLabels: [{ id: 0, description: 'Meal' }],
    days,
    canEdit,
    bookedCount: days.reduce((sum, day) => sum + day.picks.filter(pick => pick.selected).length, 0),
    openCount: days.reduce((sum, day) => sum + day.picks.filter(pick => !pick.selected && !pick.locked).length, 0),
    plates,
    userPick
  }
}

function asPeriodBookings(
  input: {
    studentId: string
    month: string
    subUnits: BookingSubUnit[]
    selectedSubUnitId: string | null
    canEdit?: boolean
  },
  calendar: Record<string, unknown>
): BookingsPanel {
  const periods = Array.isArray(calendar.Periods) ? calendar.Periods as Array<Record<string, unknown>> : []
  const userPicks = Array.isArray(calendar.PeriodUsersPicks) ? calendar.PeriodUsersPicks as Array<Record<string, unknown>> : []
  const picksSource = userPicks[0] && Array.isArray(userPicks[0].PeriodPicks)
    ? userPicks[0].PeriodPicks as Array<Record<string, unknown>>
    : periods.flatMap(period => Array.isArray(period.PeriodPicks) ? period.PeriodPicks as Array<Record<string, unknown>> : [])

  const periodLabels = periods.map((period, index) => ({
    id: Number(period.IdPeriod ?? index),
    description: String(period.PeriodDescription || period.Description || `Period ${index + 1}`)
  })).filter(item => item.id || item.description)

  const byDate = new Map<string, BookingDay>()
  for (const pick of picksSource) {
    const dateRaw = pick.RequisitionDay ?? pick.Date ?? pick.PeriodDate
    const date = normalizeDay(dateRaw)
    if (!date) continue
    const idPeriod = Number(pick.IdPeriod ?? 0)
    const description = periodLabels.find(item => item.id === idPeriod)?.description
      || String(pick.PeriodDescription || pick.Text || '')
    const locked = Boolean(pick.IsPeriodLocked ?? pick.IsLock ?? pick.IsRequisitionLocked)
    const selected = Boolean(pick.IsSelected ?? pick.IsPeriodSelected)
    const day = byDate.get(date) || {
      id: date,
      date,
      weekday: weekdayOf(date),
      locked: false,
      picks: []
    }
    day.picks.push({
      idPeriod,
      description,
      selected,
      locked,
      price: (pick.FamilyValue ?? pick.InitialFamilyValue ?? null) as number | string | null,
      idRequisition: pick.IdPeriodRequisition != null || pick.IdRequisition != null
        ? Number(pick.IdPeriodRequisition ?? pick.IdRequisition)
        : null,
      raw: { ...pick }
    })
    if (day.picks.every(item => item.locked)) day.locked = true
    byDate.set(date, day)
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  const permission = calendar.HasPermission
  const canEdit = input.canEdit !== false && permission !== false

  return {
    kind: 'bookings',
    mode: 'periods',
    studentId: input.studentId,
    month: input.month,
    subUnits: input.subUnits,
    selectedSubUnitId: input.selectedSubUnitId,
    periodLabels: periodLabels.length ? periodLabels : uniquePeriodLabels(days),
    days,
    canEdit,
    bookedCount: days.reduce((sum, day) => sum + day.picks.filter(pick => pick.selected).length, 0),
    openCount: days.reduce((sum, day) => sum + day.picks.filter(pick => !pick.selected && !pick.locked).length, 0),
    userPick: null
  }
}

export function asMenus(input: {
  studentId: string
  payload: unknown
}): MenusPanel {
  const root = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? input.payload as Record<string, unknown>
    : {}
  const menuList = Array.isArray(root.MenuList) ? root.MenuList as Array<Record<string, unknown>> : firstArray(input.payload)
  const schoolList = Array.isArray(root.SchoolList) ? root.SchoolList as Array<Record<string, unknown>> : []
  const subUnitList = Array.isArray(root.SubUnitList) ? root.SubUnitList as Array<Record<string, unknown>> : []

  const schools = schoolList.map((row, index) => ({
    id: String(row.IdSchool ?? row.Id ?? index),
    name: String(row.School ?? row.Description ?? row.Name ?? row.IdSchool ?? index)
  })).filter(item => item.id && item.name)

  const subUnits = subUnitList.map((row, index) => ({
    id: String(row.IdSubUnit ?? row.Id ?? index),
    name: String(row.SubUnit ?? row.Description ?? row.Name ?? row.IdSubUnit ?? index)
  })).filter(item => item.id && item.name)

  const menus: MenuItem[] = menuList.map((row, index) => {
    const periodType = Number(row.IdPeriodType ?? 0)
    const number = row.Number != null ? String(row.Number) : ''
    const periodLabel = periodType === 2
      ? (number ? `W${number}` : 'Week')
      : periodType === 5 || periodType === 1
        ? (number ? `M${number}` : 'Month')
        : number || null
    return {
      id: String(row.IdMenu ?? row.Guid ?? index),
      title: String(row.FileName || row.Description || row.Name || periodLabel || `Menu ${index + 1}`),
      school: stringOf(row.School),
      firm: stringOf(row.Firm),
      startDate: stringOf(row.StartDate),
      endDate: stringOf(row.EndDate),
      fileUrl: stringOf(row.FileUrl),
      isActual: Boolean(row.IsActual),
      periodLabel,
      idSchool: row.IdSchool != null ? Number(row.IdSchool) : null,
      idSubUnit: row.IdSubUnit != null ? Number(row.IdSubUnit) : null
    }
  }).filter(item => item.fileUrl || item.title)

  if (!schools.length) {
    const ids = new Set(menus.map(item => item.idSchool).filter((id): id is number => id != null))
    for (const id of ids) {
      const sample = menus.find(item => item.idSchool === id)
      schools.push({ id: String(id), name: sample?.school || String(id) })
    }
  }
  if (!subUnits.length) {
    const ids = new Set(menus.map(item => item.idSubUnit).filter((id): id is number => id != null))
    for (const id of ids) {
      const sample = menus.find(item => item.idSubUnit === id)
      subUnits.push({ id: String(id), name: sample?.title || String(id) })
    }
  }

  return {
    kind: 'menus',
    studentId: input.studentId,
    schools,
    subUnits,
    menus
  }
}

function uniquePeriodLabels(days: BookingDay[]) {
  const map = new Map<number, string>()
  for (const day of days) {
    for (const pick of day.picks) {
      if (!map.has(pick.idPeriod)) map.set(pick.idPeriod, pick.description || String(pick.idPeriod))
    }
  }
  return [...map.entries()].map(([id, description]) => ({ id, description }))
}

function normalizeDay(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const text = String(value).trim()
  const dmY = text.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/)
  if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`
  const yMd = text.match(/^(\d{4})[./-](\d{2})[./-](\d{2})/)
  if (yMd) return `${yMd[1]}-${yMd[2]}-${yMd[3]}`
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return null
}

function weekdayOf(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 0 : date.getDay()
}

export function formatPortalDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}-${m}-${y}`
}

export function normalizeStudents(...sources: unknown[]): Student[] {
  const byId = new Map<string, Student>()
  for (const source of sources) {
    for (const student of collectStudents(source)) {
      const existing = byId.get(student.id)
      if (!existing) {
        byId.set(student.id, student)
        continue
      }
      byId.set(student.id, mergeStudent(existing, student))
    }
  }
  return [...byId.values()].slice(0, 12)
}

function mergeStudent(base: Student, next: Student): Student {
  const baseNameIsId = !base.name || base.name === base.id || /^\d+$/.test(base.name)
  const nextNameIsId = !next.name || next.name === next.id || /^\d+$/.test(next.name)
  return {
    id: base.id,
    name: !nextNameIsId ? next.name : !baseNameIsId ? base.name : next.name || base.name,
    year: next.year || base.year || null,
    description: next.description || base.description || null,
    balance: next.balance ?? base.balance ?? null,
    nif: next.nif || base.nif || null,
    cardNumber: next.cardNumber || base.cardNumber || null,
    unread: next.unread ?? base.unread ?? null
  }
}

function collectStudents(value: unknown): Student[] {
  const out: Student[] = []
  const preferred = preferredStudentLists(value)
  for (const list of preferred) {
    for (const item of list) {
      const student = toStudent(item)
      if (student && looksLikePerson(student)) out.push(student)
    }
  }
  if (out.length) return out

  const arrays: unknown[][] = []
  walkArrays(value, arrays, 0)
  for (const list of arrays) {
    for (const item of list) {
      const student = toStudent(item)
      if (student && looksLikePerson(student)) out.push(student)
    }
  }
  if (!out.length) {
    const single = toStudent(value)
    if (single && looksLikePerson(single)) out.push(single)
  }
  return out
}

function preferredStudentLists(value: unknown): unknown[][] {
  if (!value || typeof value !== 'object') return []
  const lists: unknown[][] = []
  const visit = (node: unknown, depth: number) => {
    if (depth > 5 || node == null || typeof node !== 'object') return
    if (Array.isArray(node)) return
    const record = node as Record<string, unknown>
    for (const [key, nested] of Object.entries(record)) {
      if (/childusers|educandos|alunos|students|filhos|children/i.test(key) && Array.isArray(nested) && nested.length) {
        lists.push(nested)
      }
      else if (nested && typeof nested === 'object') visit(nested, depth + 1)
    }
  }
  visit(value, 0)
  return lists
}

function looksLikePerson(student: Student) {
  // Reject pure id stubs and menu/target noise when a real display name is missing.
  if (!student.id || student.id === '0') return false
  if (student.name && student.name !== student.id && !/^\d+$/.test(student.name)) return true
  // Keep numeric-only entries only when they came as explicit student ids (still useful as fallback).
  return /^\d+$/.test(student.id)
}

function toStudent(value: unknown): Student | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') {
    const id = String(value)
    if (!id || id === '0') return null
    return { id, name: id, year: null, description: null, balance: null, nif: null, cardNumber: null, unread: null }
  }
  if (typeof value !== 'object' || Array.isArray(value)) return null
  const record = lower(value as Record<string, unknown>)
  // Nested user payloads sometimes wrap the child under User / UserExtra.
  const nested = record.userextra && typeof record.userextra === 'object' && !Array.isArray(record.userextra)
    ? lower(record.userextra as Record<string, unknown>)
    : null
  const name = pick(record, [
    'nomeeducando', 'nomealuno', 'nomecompleto', 'displayname', 'shortusername',
    'usersiganame', 'nome', 'name', 'username'
  ]) ?? (nested
    ? pick(nested, ['displayname', 'shortusername', 'nome', 'name', 'username'])
    : undefined)
  const id = pick(record, ['ideducando', 'idaluno', 'iduser', 'studentid', 'id', 'codigo'])
  if (name == null && id == null) return null
  const label = String(name ?? id)
  if (label.length < 1 || label.length > 120) return null
  const year = labelOfNested(pick(record, [
    'anoescolaridade', 'schoolyeardescription', 'classdescription', 'turma', 'ano', 'year'
  ]))
  const description = stringOf(pick(record, ['userdescription', 'descricao', 'description', 'tipoutilizador', 'usertype']))
  const unreadRaw = pick(record, ['numberofnotificationsunread', 'unreadnotifications', 'unread'])
  const unread = typeof unreadRaw === 'number' && unreadRaw > 0
    ? unreadRaw
    : typeof unreadRaw === 'string' && Number(unreadRaw) > 0
      ? Number(unreadRaw)
      : null
  const cardNumber = stringOf(pick(record, [
    'documentnumber', 'numerodocumento', 'numerocartao', 'cardnumber', 'serial', 'docnumber'
  ]))
  return {
    id: String(id ?? label),
    name: label,
    year,
    description: description && description !== label && description !== year ? description : null,
    balance: scalarMoney(pick(record, ['saldo', 'balance', 'availablebalance', 'schoolbalance'])),
    nif: stringOf(pick(record, ['nif'])),
    cardNumber,
    unread
  }
}

function asItems(payload: unknown): PanelItem[] {
  const list = firstArray(payload)
  if (!list.length) return []
  return list.map((row, index) => itemFrom(row, index)).filter((item): item is PanelItem => Boolean(item))
}

function itemFrom(row: unknown, index: number): PanelItem | null {
  if (row == null) return null
  if (typeof row !== 'object' || Array.isArray(row)) {
    return { id: String(index), title: String(row) }
  }
  const record = row as Record<string, unknown>
  const entries = Object.entries(record).filter(([key, value]) => !isHidden(key) && value != null && typeof value !== 'object')
  if (!entries.length) return null
  const title = String(
    pickBy(entries, /descricao|description|movimento|movement|tipo|type|title|assunto|subject|nome|name/i)
    ?? pickBy(entries, NAME_KEYS)
    ?? entries[0]?.[1]
    ?? index
  )
  const date = pickBy(entries, DATE_KEYS)
  const status = pickBy(entries, STATUS_KEYS)
  const amount = pickBy(entries, MONEY_KEYS)
  const place = pickBy(entries, /local|place|organica|organic|unidade|unit|escola|school/i)
  return {
    id: String(record.Id ?? record.id ?? index),
    title,
    subtitle: [date, place].filter(value => value != null && String(value)).map(String).join(' · ') || undefined,
    meta: status != null ? String(status) : undefined,
    amount: amount as number | string | null,
    tone: toneOf(status)
  }
}

function asCards(...sources: unknown[]): WalletCard[] {
  const out: WalletCard[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    for (const row of cardRows(source)) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue
      const record = lower(row as Record<string, unknown>)
      const nestedBalance = record.balance && typeof record.balance === 'object' && !Array.isArray(record.balance)
        ? lower(record.balance as Record<string, unknown>)
        : null
      const name = stringOf(pick(record, [
        'usersiganame', 'shortusername', 'nomeeducando', 'nomealuno', 'displayname', 'nome', 'name',
        'descricao', 'description', 'titular', 'holder', 'username'
      ]))
      const number = stringOf(pick(record, [
        'documentnumber', 'numerodocumento', 'numerocartao', 'cardnumber', 'numero', 'number',
        'serial', 'codigo', 'code', 'cartao', 'idwallet', 'id'
      ]))
      const nif = stringOf(pick(record, ['nif', 'usernif', 'userholdernif']))
      const balance = (
        pick(record, ['availablebalance', 'schoolbalance', 'saldo', 'valor'])
        ?? (nestedBalance ? pick(nestedBalance, ['availablebalance', 'schoolbalance', 'saldo', 'balance', 'valor']) : null)
        ?? (typeof record.balance === 'number' || typeof record.balance === 'string' ? record.balance : null)
      ) as number | string | null
      const state = stringOf(pick(record, [
        'accountstatedescription', 'statedescription', 'estado', 'status',
        'idenumaccountstate', 'tipoutilizador', 'usertype', 'idenumaccounttype'
      ]))
      const closed = record.isclosed === true || record.hascloserequest === true
      const meta = [state, closed ? 'closed' : null].filter(Boolean).join(' · ') || null
      if (name == null && number == null && nif == null && balance == null && state == null) continue
      const id = String(pick(record, ['idwallet', 'idwalletinstitution', 'idcartao', 'id', 'iduser', 'codigo']) ?? number ?? name ?? out.length)
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, name, number: number && number !== id ? number : stringOf(pick(record, ['documentnumber', 'numerodocumento', 'numerocartao', 'cardnumber', 'numero', 'number'])), nif, balance, meta })
    }
  }
  return out.slice(0, 12)
}

function cardRows(source: unknown): unknown[] {
  if (source == null) return []
  if (Array.isArray(source)) {
    if (!source.length) return []
    // Flatten accidental nesting like [accountsArray] or mixed response objects.
    if (source.every(item => item && typeof item === 'object' && !Array.isArray(item))) return source
    const nested: unknown[] = []
    for (const item of source) nested.push(...cardRows(item))
    return nested
  }
  if (typeof source !== 'object') return []
  const nested = firstArray(source)
  if (nested.length) return nested
  return [source]
}

function moneyFromBalance(value: unknown): {
  available: number | string | null
  reserved: number | string | null
  credit: number | string | null
  hasWallet: boolean | null
} {
  if (value == null) return { available: null, reserved: null, credit: null, hasWallet: null }
  if (typeof value === 'number' || typeof value === 'string') {
    return { available: value, reserved: null, credit: null, hasWallet: null }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = moneyFromBalance(item)
      if (nested.available != null || nested.reserved != null || nested.credit != null) return nested
    }
    return { available: null, reserved: null, credit: null, hasWallet: null }
  }
  if (typeof value !== 'object') return { available: null, reserved: null, credit: null, hasWallet: null }

  const record = value as Record<string, unknown>
  const nested = record.Balance && typeof record.Balance === 'object' && !Array.isArray(record.Balance)
    ? record.Balance as Record<string, unknown>
    : record

  const available =
    asScalar(nested.AvailableBalance)
    ?? asScalar(nested.SchoolBalance)
    ?? asScalar(nested.Balance)
    ?? asScalar(record.AvailableBalance)
    ?? asScalar(record.SchoolBalance)
    ?? asScalar(record.Saldo)
    ?? asScalar(record.saldo)

  return {
    available,
    reserved: asScalar(nested.ReservedBalance) ?? asScalar(record.ReservedBalance) ?? asScalar(record.saldoReservado),
    credit: asScalar(nested.CreditBalance) ?? asScalar(record.CreditBalance),
    hasWallet: typeof nested.HasWallet === 'boolean'
      ? nested.HasWallet
      : typeof record.HasWallet === 'boolean'
        ? record.HasWallet
        : null
  }
}

function asScalar(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value.replace(',', '.')))) return value
  return null
}

function firstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const arrays: unknown[][] = []
  walkArrays(value, arrays, 0)
  arrays.sort((a, b) => b.length - a.length)
  return arrays[0] || []
}

function walkArrays(value: unknown, out: unknown[][], depth: number) {
  if (depth > 6 || value == null) return
  if (Array.isArray(value)) {
    if (value.length) out.push(value)
    for (const item of value.slice(0, 30)) walkArrays(item, out, depth + 1)
    return
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) walkArrays(nested, out, depth + 1)
  }
}

function firstMoney(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value.replace(',', '.')))) return value
  if (typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const money = firstMoney(item)
      if (money != null) return money
    }
    return null
  }
  const record = value as Record<string, unknown>
  for (const [key, nested] of Object.entries(record)) {
    if (MONEY_KEYS.test(key) && (typeof nested === 'number' || typeof nested === 'string')) return nested
  }
  for (const nested of Object.values(record)) {
    const money = firstMoney(nested)
    if (money != null) return money
  }
  return null
}

function pickBy(entries: Array<[string, unknown]>, pattern: RegExp) {
  for (const [key, value] of entries) {
    if (pattern.test(key)) return value
  }
  return undefined
}

function toneOf(value: unknown) {
  if (typeof value !== 'string') return null
  if (/autoriz|pago|ativ|sucesso|confirm|dispon|allowed|paid|success/i.test(value)) return 'success'
  if (/negad|anulad|falh|erro|fech|esgot|denied|failed|error/i.test(value)) return 'error'
  if (/pendent|aguard|pending|waiting/i.test(value)) return 'warning'
  return null
}

function isHidden(key: string) {
  return /password|token|secret|apikey|guid|encryption/i.test(key)
}

function lower(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]))
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value != null && value !== '') return value
  }
  return undefined
}

function stringOf(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value === 'object') return null
  return String(value)
}

/** School year / class fields often arrive as { Description: "5.º A" }. */
function labelOfNested(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = lower(value as Record<string, unknown>)
    return stringOf(pick(record, ['description', 'descricao', 'name', 'nome', 'shortdescription', 'label', 'value']))
  }
  return null
}

function scalarMoney(value: unknown): number | string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = lower(value as Record<string, unknown>)
    const nested = pick(record, ['availablebalance', 'schoolbalance', 'saldo', 'balance', 'valor', 'value'])
    return scalarMoney(nested)
  }
  return null
}
