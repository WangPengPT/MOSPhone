import type { Student } from '#shared/siga'
import { cleanMessage } from './siga'
import {
  openSchoolSession,
  schoolApiGet,
  schoolApiPost,
  schoolCall,
  schoolGetUserData,
  schoolOk,
  schoolOriginFromRedirect,
  serviceUrlForOrigin,
  SchoolResult,
  type SchoolEnvelope,
  type SchoolUserInfo
} from './school'
import { serverT } from './text'
import {
  asBookings,
  asHome,
  asList,
  asMenus,
  asProfile,
  asWallet,
  asWalletCreateDraft,
  asWalletEchelons,
  accountCollectionBlocked,
  extractPlatesFromUnknown,
  formatPortalDay,
  normalizeStudents,
  walletAllowsTopUp,
  type BookingPlate
} from './views'

interface PortalState {
  origin: string
  serviceUrl: string
  authToken: string
  user: SchoolUserInfo
  discovered: boolean
  inflight: Promise<void> | null
  ready: boolean
  message?: string
  /** Last successful AuthToken probe (ms). */
  checkedAt?: number
}

const PORTAL_FRESH_MS = 2 * 60 * 1000

interface ModuleResult {
  ok: boolean
  payload: unknown
  message?: string
  source: string | null
  canTopUp: boolean
  canSaveDays: boolean
  needRelogin?: boolean
}

const store = ((globalThis as { __sigaPortals?: Map<string, PortalState> }).__sigaPortals ??= new Map<string, PortalState>())
const bindInflight = ((globalThis as { __sigaBindInflight?: Map<string, Promise<PortalState>> }).__sigaBindInflight ??= new Map<string, Promise<PortalState>>())

export function dropPortal(sessionId: string) {
  store.delete(sessionId)
  bindInflight.delete(sessionId)
}

export async function bindSchool(
  sessionId: string,
  input: { redirect: string, username?: string, password?: string, authToken?: string | null, user?: SchoolUserInfo | null }
) {
  const existing = store.get(sessionId)
  if (existing?.ready && existing.authToken && !input.username && !input.password) return existing

  const pending = bindInflight.get(sessionId)
  if (pending) return pending

  const work = (async () => {
    if (input.authToken && input.user) {
      const origin = schoolOriginFromRedirect(input.redirect)
      const state: PortalState = {
        origin,
        serviceUrl: serviceUrlForOrigin(origin),
        authToken: input.authToken,
        user: input.user,
        discovered: true,
        inflight: null,
        ready: true,
        checkedAt: 0
      }
      store.set(sessionId, state)
      return state
    }

    const school = await openSchoolSession({
      redirect: input.redirect,
      username: input.username,
      password: input.password
    })
    if (!school) {
      const origin = schoolOriginFromRedirect(input.redirect)
      const state: PortalState = {
        origin,
        serviceUrl: serviceUrlForOrigin(origin),
        authToken: '',
        user: {},
        discovered: true,
        inflight: null,
        ready: false,
        message: serverT('api.portalHidden'),
        checkedAt: Date.now()
      }
      store.set(sessionId, state)
      return state
    }

    const state: PortalState = {
      origin: school.origin,
      serviceUrl: school.serviceUrl,
      authToken: school.authToken,
      user: school.user,
      discovered: true,
      inflight: null,
      ready: true,
      checkedAt: Date.now()
    }
    store.set(sessionId, state)
    return state
  })()

  bindInflight.set(sessionId, work)
  try {
    return await work
  }
  finally {
    if (bindInflight.get(sessionId) === work) bindInflight.delete(sessionId)
  }
}

/** Probe whether a restored school AuthToken is still accepted. */
async function schoolTokenAlive(serviceUrl: string, authToken: string) {
  try {
    const envelope = await schoolCall(serviceUrl, 'GET_SessionUserData', {}, authToken, 8000)
    return envelope.ResponseCode !== SchoolResult.AccessDenied
  }
  catch {
    // Network blip — keep the token; the next real call will decide.
    return true
  }
}

export async function ensurePortal(
  sessionId: string,
  redirect: string,
  saved?: { authToken?: string | null, user?: SchoolUserInfo | null }
) {
  const ready = store.get(sessionId)
  if (ready?.ready && ready.authToken) {
    const fresh = Date.now() - (ready.checkedAt || 0) < PORTAL_FRESH_MS
    if (fresh) return ready
    if (await schoolTokenAlive(ready.serviceUrl, ready.authToken)) {
      ready.checkedAt = Date.now()
      return ready
    }
    dropPortal(sessionId)
  }

  if (saved?.authToken) {
    const restored = await bindSchool(sessionId, {
      redirect,
      authToken: saved.authToken,
      user: saved.user ?? { AuthToken: saved.authToken }
    })
    if (restored.ready && restored.authToken && await schoolTokenAlive(restored.serviceUrl, restored.authToken)) {
      restored.checkedAt = Date.now()
      return restored
    }
    // Dead handoff — drop and try SessionToken AutoLogin from the redirect URL.
    dropPortal(sessionId)
  }

  return bindSchool(sessionId, { redirect })
}

/** Keep the encrypted cookie handoff in sync with the in-memory school portal. */
export async function persistPortalHandoff(
  session: { data: { schoolAuthToken?: string | null, schoolUser?: SchoolUserInfo | null }, update: (data: Record<string, unknown>) => Promise<unknown> },
  portal: PortalState
) {
  if (portal.ready && portal.authToken) {
    const snap = schoolSnapshot(portal)
    if (!snap) return
    if (
      session.data.schoolAuthToken === snap.authToken
      && session.data.schoolUser?.IdUser === snap.user.IdUser
      && session.data.schoolUser?.IdSchoolYear === snap.user.IdSchoolYear
    ) {
      return
    }
    await session.update({
      schoolAuthToken: snap.authToken,
      schoolUser: snap.user
    })
    return
  }

  if (session.data.schoolAuthToken) {
    await session.update({ schoolAuthToken: null })
  }
}

export async function readModule(
  sessionId: string,
  redirect: string,
  moduleKey: string,
  studentId?: string | null,
  saved?: { authToken?: string | null, user?: SchoolUserInfo | null },
  part?: string | null,
  options?: { month?: string | null, subUnitId?: string | null }
) {
  const state = await ensurePortal(sessionId, redirect, saved)
  if (!state.ready || !state.authToken) {
    return emptyModule(state.message || serverT('api.portalHidden'))
  }

  try {
    switch (moduleKey) {
      case 'inicio':
        return await readHome(state, studentId)
      case 'pessoal':
        return await readProfile(state)
      case 'cartao':
        return await readWallet(state, studentId, part)
      case 'marcacoes':
        return await readBookings(state, studentId, options?.month, options?.subUnitId)
      case 'pagamentos':
        return await readPayments(state, studentId)
      case 'notificacoes':
        return await readNotifications(state)
      case 'candidaturas':
        return await readApplications(state)
      case 'ementas':
        return await readMenus(state, studentId)
      case 'portaria':
        return await readGate(state, studentId)
      default:
        return emptyModule(serverT('api.unknownModule'))
    }
  }
  catch (error) {
    return emptyModule(error instanceof Error ? error.message : serverT('api.portalOpen'))
  }
}

export async function postModule(
  sessionId: string,
  redirect: string,
  moduleKey: string,
  body: unknown,
  saved?: { authToken?: string | null, user?: SchoolUserInfo | null }
) {
  const state = await ensurePortal(sessionId, redirect, saved)
  if (!state.ready || !state.authToken) {
    return { ok: false, message: serverT('api.portalHidden'), payload: null }
  }

  if (moduleKey === 'cartao') {
    const payload = body && typeof body === 'object' ? body as { action?: string } : {}
    if (payload.action === 'createWallet') return createDigitalWallet(state, body)
    return topUpWallet(state, body)
  }

  if (moduleKey === 'marcacoes') {
    return saveBookings(state, body)
  }

  return { ok: false, message: serverT('api.portalHidden'), payload: null }
}

export function extractStudents(payload: unknown): Student[] {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && (payload as { kind?: string }).kind === 'home') {
    return normalizeStudents((payload as { students?: unknown }).students)
  }
  return normalizeStudents(payload)
}

export function schoolSnapshot(state: PortalState | undefined) {
  if (!state?.ready) return null
  return {
    authToken: state.authToken,
    user: {
      IdUser: state.user.IdUser,
      IdUserType: state.user.IdUserType,
      IdSchool: state.user.IdSchool,
      IdSchoolYear: state.user.IdSchoolYear,
      IdProject: state.user.IdProject,
      AuthToken: state.authToken,
      SchoolYearDescription: state.user.SchoolYearDescription,
      UserExtra: state.user.UserExtra
        ? {
            DisplayName: state.user.UserExtra.DisplayName,
            UserName: state.user.UserExtra.UserName,
            Email: state.user.UserExtra.Email,
            UserType: state.user.UserExtra.UserType
          }
        : null,
      MasterMenu: Array.isArray(state.user.MasterMenu)
        ? state.user.MasterMenu.map(item => ({
            Id: item.Id,
            Path: item.Path,
            Description: item.Description
          }))
        : []
    } satisfies SchoolUserInfo
  }
}

async function readHome(state: PortalState, studentId?: string | null): Promise<ModuleResult> {
  // Home stays light: greeting + selected student balance.
  // Wallets / cards / menus / bookings / notifications load on their own pages.
  const focusId = studentId ? String(studentId) : String(state.user.IdUser || '')
  const focusUserId = Number(focusId) || state.user.IdUser || 0
  const forChild = Boolean(focusUserId && focusUserId !== state.user.IdUser)

  const focusBalance = focusUserId
    ? await (forChild
        ? schoolCall(state.serviceUrl, 'GET_WalletBalanceByUser', {
            IdUser: focusUserId,
            IdProject: state.user.IdProject,
            IdSchoolYear: state.user.IdSchoolYear,
            IdUserType: state.user.IdUserType
          }, state.authToken)
        : schoolCall(state.serviceUrl, 'GET_WalletBalance', {
            IdUser: focusUserId,
            IdProject: state.user.IdProject,
            IdUserType: state.user.IdUserType,
            IdSchoolYear: state.user.IdSchoolYear
          }, state.authToken)
      ).catch(() => null)
    : null

  const profile = {
    idUser: state.user.IdUser ?? null,
    displayName: state.user.UserExtra?.DisplayName || state.user.UserExtra?.UserName || null,
    email: state.user.UserExtra?.Email || null,
    userType: state.user.UserExtra?.UserType || null,
    schoolYear: state.user.SchoolYearDescription || null
  }

  const focusPayload = focusBalance && schoolOk(focusBalance) ? focusBalance.ResponseObject : null
  const homeHasWallet = (() => {
    if (!focusPayload || typeof focusPayload !== 'object') return null
    const record = focusPayload as Record<string, unknown>
    const nested = record.Balance && typeof record.Balance === 'object' && !Array.isArray(record.Balance)
      ? record.Balance as Record<string, unknown>
      : record
    return typeof nested.HasWallet === 'boolean'
      ? nested.HasWallet
      : typeof record.HasWallet === 'boolean'
        ? record.HasWallet
        : null
  })()

  return {
    ok: true,
    payload: asHome({
      profile,
      focusStudentId: focusId,
      focusBalance: focusPayload,
      booking: null,
      alerts: []
    }),
    source: forChild ? 'SIGAService2020/GET_WalletBalanceByUser' : 'SIGAService2020/GET_WalletBalance',
    canTopUp: walletAllowsTopUp({ hasWallet: homeHasWallet }),
    canSaveDays: true
  }
}

async function readProfile(state: PortalState): Promise<ModuleResult> {
  const userData = await schoolGetUserData(state)
  const user = {
    idUser: state.user.IdUser ?? null,
    displayName: state.user.UserExtra?.DisplayName || null,
    userName: state.user.UserExtra?.UserName || null,
    email: state.user.UserExtra?.Email || null,
    userType: state.user.UserExtra?.UserType || null,
    schoolYear: state.user.SchoolYearDescription || null,
    idSchool: state.user.IdSchool ?? null,
    idProject: state.user.IdProject ?? null
  }
  return {
    ok: true,
    payload: asProfile(user, schoolOk(userData) ? userData.ResponseObject : null),
    message: !schoolOk(userData) ? cleanMessage(userData.ResponseMessage) : undefined,
    source: 'SIGAService2020/GET_UserData',
    canTopUp: false,
    canSaveDays: false
  }
}

async function readWallet(
  state: PortalState,
  studentId?: string | null,
  part?: string | null
): Promise<ModuleResult> {
  const idUser = studentId ? Number(studentId) || state.user.IdUser : state.user.IdUser
  const forChild = Boolean(studentId && Number(studentId) && Number(studentId) !== state.user.IdUser)
  const section = String(part || 'summary').toLowerCase()

  if (section === 'movements') {
    const movements = await schoolCall(state.serviceUrl, 'GET_WalletMovementsCollectionSIGA', {
      IdUser: idUser,
      IdProject: state.user.IdProject,
      IdSchoolYear: state.user.IdSchoolYear
    }, state.authToken)
    const fallback = !schoolOk(movements)
      ? await schoolCall(state.serviceUrl, 'GET_WalletMovements', {
          IdUser: idUser,
          IdProject: state.user.IdProject,
          IdSchoolYear: state.user.IdSchoolYear
        }, state.authToken)
      : movements
    return {
      ok: true,
      payload: asWallet({
        movements: schoolOk(fallback) ? fallback.ResponseObject : null
      }),
      message: firstMessage(fallback),
      source: 'SIGAService2020/GET_WalletMovementsCollectionSIGA',
      canTopUp: false,
      canSaveDays: false
    }
  }

  if (section === 'cards') {
    // Official SIGA wallet screen loads account + wallet user, not only GET_UserWallets.
    const walletUser = await schoolCall(state.serviceUrl, 'GET_UserWalletCreate', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken)
    const accounts = await schoolCall(state.serviceUrl, 'GET_WalletAccountCollection', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken)
    const wallets = await schoolCall(state.serviceUrl, 'GET_UserWallets', {
      IdUser: idUser
    }, state.authToken)

    return {
      ok: true,
      payload: asWallet({
        wallets: [
          schoolOk(walletUser) ? walletUser.ResponseObject : null,
          schoolOk(accounts) ? accounts.ResponseObject : null,
          schoolOk(wallets) ? wallets.ResponseObject : null
        ]
      }),
      message: firstMessage(walletUser, accounts, wallets),
      source: 'SIGAService2020/GET_UserWalletCreate',
      canTopUp: false,
      canSaveDays: false
    }
  }

  if (section === 'units') {
    const units = await schoolCall(state.serviceUrl, 'GET_WalletUnits_ByUser', {
      IdUser: idUser,
      idProject: state.user.IdProject,
      IdProject: state.user.IdProject
    }, state.authToken)
    return {
      ok: true,
      payload: asWallet({
        units: schoolOk(units) ? units.ResponseObject : null
      }),
      message: firstMessage(units),
      source: 'SIGAService2020/GET_WalletUnits_ByUser',
      canTopUp: false,
      canSaveDays: false
    }
  }

  const balanceByUser = forChild
    ? await schoolCall(state.serviceUrl, 'GET_WalletBalanceByUser', {
        IdUser: idUser,
        IdProject: state.user.IdProject,
        IdSchoolYear: state.user.IdSchoolYear,
        IdUserType: state.user.IdUserType
      }, state.authToken)
    : null

  const balance = schoolOk(balanceByUser)
    ? balanceByUser
    : await schoolCall(state.serviceUrl, 'GET_WalletBalance', {
        IdUser: idUser,
        IdProject: state.user.IdProject,
        IdUserType: state.user.IdUserType,
        IdSchoolYear: state.user.IdSchoolYear
      }, state.authToken)

  const balancePayload = schoolOk(balance) ? balance.ResponseObject : null
  const walletMeta = await loadWalletMeta(state, idUser, balancePayload)

  return {
    ok: true,
    payload: asWallet({
      balance: balancePayload,
      student: null,
      hasWallet: walletMeta.hasWallet,
      canCreateWallet: walletMeta.canCreateWallet,
      createDraft: walletMeta.createDraft,
      echelonOptions: walletMeta.echelonOptions,
      accountState: walletMeta.accountState,
      accountBlocked: walletMeta.accountBlocked
    }),
    message: firstMessage(balance) || walletMeta.message,
    source: forChild ? 'SIGAService2020/GET_WalletBalanceByUser' : 'SIGAService2020/GET_WalletBalance',
    canTopUp: walletMeta.canTopUp,
    canSaveDays: false
  }
}

async function loadWalletMeta(
  state: PortalState,
  idUser: number,
  balancePayload: unknown
) {
  const hasWalletFromBalance = (() => {
    if (!balancePayload || typeof balancePayload !== 'object') return null
    const record = balancePayload as Record<string, unknown>
    const nested = record.Balance && typeof record.Balance === 'object' && !Array.isArray(record.Balance)
      ? record.Balance as Record<string, unknown>
      : record
    return typeof nested.HasWallet === 'boolean'
      ? nested.HasWallet
      : typeof record.HasWallet === 'boolean'
        ? record.HasWallet
        : null
  })()

  const [walletUser, accounts, canCreate, echelons] = await Promise.all([
    schoolCall(state.serviceUrl, 'GET_UserWalletCreate', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken).catch(() => null),
    schoolCall(state.serviceUrl, 'GET_WalletAccountCollection', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken).catch(() => null),
    // SIGA may accept bare IdUser or { IdUser }.
    schoolCall(state.serviceUrl, 'GET_CanCreateWallet', idUser, state.authToken)
      .catch(() => schoolCall(state.serviceUrl, 'GET_CanCreateWallet', { IdUser: idUser }, state.authToken))
      .catch(() => null),
    schoolCall(state.serviceUrl, 'GET_WalletEchelonEnum', {}, state.authToken).catch(() => null)
  ])

  const draft = walletUser && schoolOk(walletUser) ? asWalletCreateDraft(walletUser.ResponseObject) : null
  const blocked = accounts && schoolOk(accounts) ? accountCollectionBlocked(accounts.ResponseObject) : false
  const canCreateWallet = (() => {
    if (blocked) return false
    if (canCreate && schoolOk(canCreate) && typeof canCreate.ResponseObject === 'boolean') {
      return canCreate.ResponseObject
    }
    if (hasWalletFromBalance === true || (draft?.id != null && draft.id > 0)) return false
    return hasWalletFromBalance === false
  })()

  const hasWallet = hasWalletFromBalance === true || (draft?.id != null && Number(draft.id) > 0)
  const accountState = draft?.idEnumAccountState ?? null
  const canTopUp = walletAllowsTopUp({
    hasWallet,
    accountState,
    accountBlocked: blocked
  })

  return {
    hasWallet,
    canCreateWallet,
    createDraft: draft,
    echelonOptions: echelons && schoolOk(echelons) ? asWalletEchelons(echelons.ResponseObject) : [],
    accountState,
    accountBlocked: blocked,
    canTopUp,
    message: firstMessage(
      ...(walletUser ? [walletUser] : []),
      ...(accounts ? [accounts] : []),
      ...(canCreate ? [canCreate] : [])
    )
  }
}

async function readBookings(
  state: PortalState,
  studentId?: string | null,
  month?: string | null,
  subUnitId?: string | null
): Promise<ModuleResult> {
  const idUser = studentId ? Number(studentId) || state.user.IdUser || 0 : state.user.IdUser || 0
  const monthKey = normalizeMonth(month)
  const monthDate = formatPortalDay(`${monthKey}-01`)

  const unitsEnvelope = await schoolCall(state.serviceUrl, 'GET_UserUnits', {
    IdUser: idUser,
    UserToken: '',
    IdUserKey: null
  }, state.authToken)

  const subUnits = extractBookingSubUnits(schoolOk(unitsEnvelope) ? unitsEnvelope.ResponseObject : null)
  if (!subUnits.length) {
    return {
      ok: true,
      payload: asBookings({
        studentId: String(idUser),
        month: monthKey,
        subUnits: [],
        selectedSubUnitId: null,
        calendar: null,
        mode: 'days',
        canEdit: false
      }),
      message: !schoolOk(unitsEnvelope) ? cleanMessage(unitsEnvelope.ResponseMessage) : undefined,
      source: 'SIGAService2020/GET_UserUnits',
      canTopUp: false,
      canSaveDays: false
    }
  }

  const selected = pickBookingSubUnit(subUnits, subUnitId)
  // Official maps type 7 → 2 (generic day calendar).
  let calendarType = Number(selected.calendarType || 2)
  if (calendarType === 7) calendarType = 2

  if (calendarType === 4 || calendarType === 5) {
    const calendar = await schoolCall(state.serviceUrl, 'GET_CAF_UserPickPeriods', {
      IdUsers: [idUser],
      IdSubUnit: Number(selected.id),
      IdSchoolGrade: -1,
      IdSchool: -1,
      IdPeriod: -1,
      Date: monthDate
    }, state.authToken)

    return {
      ok: true,
      payload: asBookings({
        studentId: String(idUser),
        month: monthKey,
        subUnits,
        selectedSubUnitId: selected.id,
        calendar: schoolOk(calendar) ? calendar.ResponseObject : null,
        mode: 'periods',
        canEdit: true
      }),
      message: !schoolOk(calendar) ? cleanMessage(calendar.ResponseMessage) : undefined,
      source: 'SIGAService2020/GET_CAF_UserPickPeriods',
      canTopUp: false,
      canSaveDays: schoolOk(calendar)
    }
  }

  if (calendarType === 6) {
    const yearCalendar = await schoolCall(state.serviceUrl, 'GET_Year_UserPickPeriods', {
      IdUser: idUser,
      IdSubUnit: Number(selected.id)
    }, state.authToken)
    const payload = schoolOk(yearCalendar) ? yearCalendar.ResponseObject : null
    const canEdit = payload && typeof payload === 'object'
      ? (payload as { HasPermission?: boolean }).HasPermission !== false
      : false
    return {
      ok: true,
      payload: asBookings({
        studentId: String(idUser),
        month: monthKey,
        subUnits,
        selectedSubUnitId: selected.id,
        calendar: payload,
        mode: 'periods',
        canEdit
      }),
      message: !schoolOk(yearCalendar) ? cleanMessage(yearCalendar.ResponseMessage) : undefined,
      source: 'SIGAService2020/GET_Year_UserPickPeriods',
      canTopUp: false,
      canSaveDays: canEdit
    }
  }

  // Type 2 (default meal day picks): resolve school then CalendarGeneric.
  const schoolMeta = await resolveBookingSchoolMeta(state, idUser, Number(selected.id), monthDate)
  const idSchool = schoolMeta.idSchool
  const dayCalendar = await schoolApiGet<SchoolEnvelope>(state.origin, '/apis/requisitions/CalendarGeneric', state.authToken, {
    IdUser: idUser,
    IdSubUnit: Number(selected.id),
    Date: monthDate,
    UserToken: '',
    IdSchool: idSchool
  })

  if (schoolOk(dayCalendar) && dayCalendar.ResponseObject) {
    const collection = dayCalendar.ResponseObject as Record<string, unknown>
    const buckets = Array.isArray(collection.UserPickerDaysCollection)
      ? collection.UserPickerDaysCollection as Array<Record<string, unknown>>
      : []
    const userPick = buckets.find(item => Number(item.IdSubUnit) === Number(selected.id)) || buckets[0] || null
    const locked = Boolean(collection.IsLocked)
    return {
      ok: true,
      payload: asBookings({
        studentId: String(idUser),
        month: monthKey,
        subUnits,
        selectedSubUnitId: selected.id,
        calendar: collection,
        mode: 'days',
        canEdit: !locked,
        plates: schoolMeta.plates,
        userPick: userPick
          ? { ...userPick, IdSchool: Number((userPick as { IdSchool?: number }).IdSchool) || idSchool }
          : { IdSubUnit: Number(selected.id), IdUser: idUser, IdSchool: idSchool }
      }),
      message: cleanMessage(dayCalendar.ResponseMessage) || undefined,
      source: '/apis/requisitions/CalendarGeneric',
      canTopUp: false,
      canSaveDays: !locked
    }
  }

  return {
    ok: true,
    payload: asBookings({
      studentId: String(idUser),
      month: monthKey,
      subUnits,
      selectedSubUnitId: selected.id,
      calendar: null,
      mode: 'days',
      canEdit: false,
      plates: schoolMeta.plates,
      userPick: null
    }),
    message: cleanMessage(
      (dayCalendar as SchoolEnvelope)?.ResponseMessage
      || (typeof dayCalendar === 'object' && dayCalendar && 'text' in dayCalendar
        ? String((dayCalendar as { text?: string }).text || '')
        : '')
    ) || serverT('api.incomplete'),
    source: '/apis/requisitions/CalendarGeneric',
    canTopUp: false,
    canSaveDays: false
  }
}

async function resolveBookingSchoolMeta(
  state: PortalState,
  idUser: number,
  idSubUnit: number,
  monthDate: string
): Promise<{ idSchool: number, plates: BookingPlate[] }> {
  const plates = await schoolCall(
    state.serviceUrl,
    'GET_ProjectAndUserPlates',
    {
      IdUser: idUser,
      Date: monthDate,
      ReturnUserPlates: true,
      UserToken: '',
      IdSubUnit: idSubUnit,
      IdUserKey: null
    },
    state.authToken
  )
  let idSchool = Number(state.user.IdSchool) || 0
  let plateOptions: BookingPlate[] = []
  if (schoolOk(plates)) {
    const payload = plates.ResponseObject
    plateOptions = extractPlatesFromUnknown(payload)
    const schools = payload && typeof payload === 'object' && !Array.isArray(payload)
      && Array.isArray((payload as { SchoolCollection?: unknown[] }).SchoolCollection)
      ? (payload as { SchoolCollection: Array<{ IdSchool?: number }> }).SchoolCollection
      : []
    const first = schools.find(item => Number(item.IdSchool) > 0) || schools[0]
    if (first?.IdSchool != null && Number(first.IdSchool) > 0) {
      idSchool = Number(first.IdSchool)
    }
  }
  return { idSchool, plates: plateOptions }
}

async function readPayments(state: PortalState, studentId?: string | null): Promise<ModuleResult> {
  const idUser = studentId ? Number(studentId) || state.user.IdUser : state.user.IdUser
  const invoices = await schoolCall(state.serviceUrl, 'GET_TC_Faturas', {
    IdUser: idUser,
    IdProject: state.user.IdProject,
    IdSchoolYear: state.user.IdSchoolYear
  }, state.authToken)
  const payments = await schoolCall(state.serviceUrl, 'GET_TC_Pagamentos', {
    IdUser: idUser,
    IdProject: state.user.IdProject,
    IdSchoolYear: state.user.IdSchoolYear
  }, state.authToken)
  const balances = await schoolCall(state.serviceUrl, 'GET_TC_Saldos', {
    IdUser: idUser,
    IdProject: state.user.IdProject,
    IdSchoolYear: state.user.IdSchoolYear
  }, state.authToken)

  const merged = [
    ...(Array.isArray(schoolOk(payments) ? payments.ResponseObject : null) ? payments.ResponseObject as unknown[] : []),
    ...(Array.isArray(schoolOk(invoices) ? invoices.ResponseObject : null) ? invoices.ResponseObject as unknown[] : [])
  ]

  return {
    ok: true,
    payload: asList('modules.pagamentos.label', merged.length ? merged : {
      payments: schoolOk(payments) ? payments.ResponseObject : null,
      invoices: schoolOk(invoices) ? invoices.ResponseObject : null,
      balances: schoolOk(balances) ? balances.ResponseObject : null
    }),
    message: firstMessage(invoices, payments, balances),
    source: 'SIGAService2020/GET_TC_Faturas',
    canTopUp: false,
    canSaveDays: false
  }
}

async function readNotifications(state: PortalState): Promise<ModuleResult> {
  const data = await schoolApiGet(state.origin, '/apis/communications/UserNotifications/GetUserNotifications', state.authToken, {
    idUser: state.user.IdUser
  })
  return {
    ok: true,
    payload: asList('modules.notificacoes.label', data),
    source: '/apis/communications',
    canTopUp: false,
    canSaveDays: false
  }
}

async function readApplications(state: PortalState): Promise<ModuleResult> {
  const idProject = Number(state.user.IdProject) || 0
  if (!idProject) {
    return {
      ok: true,
      payload: asList('modules.candidaturas.label', []),
      message: serverT('api.portalHidden'),
      source: '/apis/candidaturas',
      canTopUp: false,
      canSaveDays: false
    }
  }

  // SIGA expects ListaCandidaturas/{IdProject} — "0" is rejected as invalid.
  const data = await schoolApiGet(state.origin, `/apis/candidaturas/ListaCandidaturas/${idProject}`, state.authToken)
  const errorMessage = applicationErrorMessage(data)
  return {
    ok: true,
    payload: asList('modules.candidaturas.label', errorMessage ? [] : data),
    message: errorMessage || undefined,
    source: `/apis/candidaturas/ListaCandidaturas/${idProject}`,
    canTopUp: false,
    canSaveDays: false
  }
}

function applicationErrorMessage(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === 'string') {
    const text = data.trim()
    return text && /not valid|error|erro|invalid/i.test(text) ? cleanMessage(text) : null
  }
  if (typeof data !== 'object' || Array.isArray(data)) return null
  const record = data as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return cleanMessage(record.message)
  if (typeof record.title === 'string' && /not valid|error|erro|invalid/i.test(record.title)) {
    return cleanMessage(record.title)
  }
  if (typeof record.text === 'string' && record.text.trim()) return cleanMessage(record.text)
  if (record.errors && typeof record.errors === 'object') {
    for (const value of Object.values(record.errors as Record<string, unknown>)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string' && first.trim()) return cleanMessage(first)
    }
  }
  return null
}

async function readMenus(state: PortalState, studentId?: string | null): Promise<ModuleResult> {
  const idUser = studentId ? Number(studentId) || state.user.IdUser || 0 : state.user.IdUser || 0
  const envelope = await schoolCall(state.serviceUrl, 'GET_Year_UserFirmsMenus', {
    IdUser: idUser,
    IdSubUnit: -1
  }, state.authToken)
  return {
    ok: true,
    payload: asMenus({
      studentId: String(idUser),
      payload: schoolOk(envelope) ? envelope.ResponseObject : null
    }),
    message: !schoolOk(envelope) ? cleanMessage(envelope.ResponseMessage) : undefined,
    source: 'SIGAService2020/GET_Year_UserFirmsMenus',
    canTopUp: false,
    canSaveDays: false
  }
}

async function saveBookings(state: PortalState, body: unknown) {
  const payload = (body && typeof body === 'object' ? body : {}) as {
    mode?: 'days' | 'periods'
    studentId?: string | number | null
    subUnitId?: string | number | null
    userPick?: Record<string, unknown> | null
    plates?: Array<Record<string, unknown>> | null
    picks?: Array<{
      idPeriod?: number
      date?: string
      selected?: boolean
      initialRequisition?: number
      raw?: Record<string, unknown>
    }>
  }
  const idUser = payload.studentId ? Number(payload.studentId) || state.user.IdUser || 0 : state.user.IdUser || 0
  const idSubUnit = Number(payload.subUnitId)
  const picks = Array.isArray(payload.picks) ? payload.picks : []
  if (!idUser || !idSubUnit || !picks.length) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  if (payload.mode !== 'periods') {
    const shell = (payload.userPick && typeof payload.userPick === 'object')
      ? payload.userPick as Record<string, unknown>
      : {}
    const plateOptions = Array.isArray(shell.UserPlates) && shell.UserPlates.length
      ? shell.UserPlates as Array<Record<string, unknown>>
      : Array.isArray(payload.plates)
        ? payload.plates as Array<Record<string, unknown>>
        : []

    const idSchool = Number(shell.IdSchool || state.user.IdSchool || 0)
    if (!(idSchool > 0)) {
      return { ok: false, message: serverT('api.incomplete'), payload: null }
    }

    const invoiceLocked = Boolean(shell.IsRequisitionLockedByInvoice)
    const defaultPlate = plateOptions.find(plate => plate.Disabled !== true && Number(plate.IdPlate ?? plate.id) > 0)
      || plateOptions.find(plate => Number(plate.IdPlate ?? plate.id) > 0)
      || null
    // Free days come back as -1 from CalendarGeneric; treat negatives as "unset".
    const schoolLabel = (() => {
      const days = Array.isArray(shell.UserPickDays) ? shell.UserPickDays as Array<Record<string, unknown>> : []
      for (const day of days) {
        const name = String(day.SchoolRequisition || day.SchoolAttendance || '').trim()
        if (name) return name
      }
      return ''
    })()

    const userPickDays = picks.map((pick) => {
      const date = String(pick.date || '')
      // Official formats with dayjs `DD-MM-YYYY`.
      const portalDate = toPortalBookingDate(date) || toPortalBookingDate(String(pick.raw?.Date || ''))
      const raw = pick.raw || {}
      const initial = Number(pick.initialRequisition ?? raw.InitialRequisition ?? raw.Requisition ?? 0)
      const wasBooked = initial === 4 || initial === 6
      // Official calendar states: free→4/6, booked→5 cancel, newly booked→0 undo.
      let requisition = 0
      let withFine = Boolean(raw.RequisitionWithFine)
      if (pick.selected) {
        withFine = withFine || fineWindowStarted(raw.FineStartDate, raw.FineValue)
        requisition = withFine ? 6 : 4
      }
      else if (wasBooked) {
        requisition = 5
      }

      let idPlate = positiveId(raw.IdPlate, positiveId(raw.InitialIdPlate, 0))
      // Official always stamps SelectedPlate.IdPlate when confirming a meal day.
      if ((pick.selected || requisition === 4 || requisition === 6) && !(idPlate > 0) && defaultPlate) {
        idPlate = positiveId(defaultPlate.IdPlate ?? defaultPlate.id, 0)
      }

      const familyValue = raw.InitialFamilyValue ?? raw.FamilyValue
      // Match official SetUserPickDays day shape (no PlateValue / extra period fields).
      return {
        IdSubUnit: positiveId(raw.IdSubUnit, idSubUnit),
        IdSchoolAttendance: positiveId(raw.IdSchoolAttendance, idSchool),
        SchoolAttendance: String(raw.SchoolAttendance || schoolLabel || ''),
        // Official sets IdSchoolRequisition = selected school when booking.
        IdSchoolRequisition: positiveId(raw.IdSchoolRequisition, idSchool),
        SchoolRequisition: String(raw.SchoolRequisition || schoolLabel || ''),
        IdUserSchool: nonNegId(raw.IdUserSchool, 0),
        Date: portalDate,
        IdRequisition: nonNegId(raw.InitialIdRequisition ?? raw.IdRequisition, 0),
        Requisition: requisition,
        IsRequisitionLocked: invoiceLocked,
        IdAttendance: nonNegId(raw.InitialIdAttendance ?? raw.IdAttendance, 0),
        Attendance: nonNegId(raw.Attendance ?? raw.InitialAttendance, 0),
        IsAttendanceLocked: invoiceLocked,
        IdPlate: idPlate,
        IdUserEchelon: nonNegId(raw.InitialIdUserEchelon ?? raw.IdUserEchelon, 0),
        Echelon: raw.InitialEchelon != null || raw.Echelon != null
          ? String(raw.InitialEchelon ?? raw.Echelon ?? '').trim()
          : '',
        FamilyValue: familyValue == null || familyValue === '' ? null : String(familyValue).trim(),
        FineValue: Number(raw.FineValue ?? 0) || 0,
        LimitPickTime: raw.LimitPickTime != null ? String(raw.LimitPickTime) : '',
        FineStartDate: raw.FineStartDate != null ? String(raw.FineStartDate) : '',
        FineLimitReached: Boolean(raw.FineLimitReached),
        RequisitionWithFine: withFine || requisition === 6,
        IsRequisitionLockedByInvoice: Boolean(raw.IsRequisitionLockedByInvoice),
        IsAttendanceLockedByInvoice: Boolean(raw.IsAttendanceLockedByInvoice),
        SetRequisition: true,
        SetAttendance: false,
        IdUser: positiveId(raw.IdUser, idUser)
      }
    }).filter(item => item.Date)

    if (!userPickDays.length) {
      return { ok: false, message: serverT('api.incomplete'), payload: null }
    }

    const hasRealPlates = plateOptions.some(plate => Number(plate.IdPlate ?? plate.id) > 0)
    const bookingWithoutPlate = hasRealPlates && userPickDays.some(day =>
      (day.Requisition === 4 || day.Requisition === 6) && !(Number(day.IdPlate) > 0)
    )
    if (bookingWithoutPlate) {
      return { ok: false, message: serverT('bookings.needPlate'), payload: null }
    }

    // Calendar_UserPick schema is additionalProperties:false — never spread the GET shell.
    const wrapper: Record<string, unknown> = {
      IdUser: idUser,
      IdSubUnit: idSubUnit,
      IdSchool: idSchool,
      UserToken: typeof shell.UserToken === 'string' ? shell.UserToken : '',
      UserPickDays: userPickDays
    }
    if (shell.Name != null) wrapper.Name = String(shell.Name)
    if (shell.StartDate != null) wrapper.StartDate = String(shell.StartDate)
    if (shell.EndDate != null) wrapper.EndDate = String(shell.EndDate)
    if (shell.BalanceAccount != null) wrapper.BalanceAccount = String(shell.BalanceAccount)
    if (shell.DebitAccount != null) wrapper.DebitAccount = String(shell.DebitAccount)
    if (shell.DateLastPenalty != null) wrapper.DateLastPenalty = String(shell.DateLastPenalty)
    if (plateOptions.length) {
      wrapper.UserPlates = plateOptions.map(plate => ({
        IdPlate: Number(plate.IdPlate ?? plate.id ?? 0) || 0,
        Plate: plate.Plate != null || plate.name != null ? String(plate.Plate ?? plate.name) : null,
        ShortPlate: plate.ShortPlate != null || plate.shortName != null
          ? String(plate.ShortPlate ?? plate.shortName)
          : null,
        StartPeriod: plate.StartPeriod != null ? String(plate.StartPeriod) : null,
        EndPeriod: plate.EndPeriod != null ? String(plate.EndPeriod) : null
      })).filter(plate => plate.IdPlate > 0)
    }
    if (shell.Balance && typeof shell.Balance === 'object' && !Array.isArray(shell.Balance)) {
      const balance = shell.Balance as Record<string, unknown>
      wrapper.Balance = {
        HasWallet: Boolean(balance.HasWallet),
        LimitValue: Number(balance.LimitValue ?? 0) || 0,
        LimitNumber: Number(balance.LimitNumber ?? 0) || 0,
        Balance: Number(balance.Balance ?? 0) || 0,
        ReservedBalance: Number(balance.ReservedBalance ?? 0) || 0,
        AvailableBalance: Number(balance.AvailableBalance ?? 0) || 0,
        CreditBalance: Number(balance.CreditBalance ?? 0) || 0
      }
    }

    const envelope = await schoolApiPost<SchoolEnvelope>(
      state.origin,
      '/apis/requisitions/CalendarGeneric',
      state.authToken,
      [wrapper]
    )

    if (!envelope || typeof envelope !== 'object' || !('ResponseCode' in envelope)) {
      return {
        ok: false,
        message: calendarPostError(envelope) || serverT('api.refused'),
        payload: envelope
      }
    }

    const code = Number((envelope as SchoolEnvelope).ResponseCode)
    const limited = Boolean(
      envelope.ResponseObject
      && typeof envelope.ResponseObject === 'object'
      && (envelope.ResponseObject as { hasReachTheSchoolScheLimit?: boolean }).hasReachTheSchoolScheLimit
    )

    if (code === SchoolResult.AccessDenied) {
      return {
        ok: false,
        needRelogin: true,
        message: cleanMessage(envelope.ResponseMessage) || serverT('api.signIn'),
        payload: envelope.ResponseObject
      }
    }

    return {
      ok: code === SchoolResult.Success && !limited,
      message: cleanMessage(envelope.ResponseMessage)
        || (limited ? serverT('bookings.limitReached') : '')
        || (code === SchoolResult.Success ? '' : serverT('module.bookingUnconfirmed')),
      payload: envelope.ResponseObject
    }
  }

  const periods = picks
    .map((pick) => {
      const date = String(pick.date || '')
      const portalDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatPortalDay(date) : date
      if (!portalDate || pick.idPeriod == null) return null
      return {
        IdPeriod: Number(pick.idPeriod),
        PeriodDate: portalDate,
        IsSelected: Boolean(pick.selected)
      }
    })
    .filter((item): item is { IdPeriod: number, PeriodDate: string, IsSelected: boolean } => Boolean(item))

  if (!periods.length) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  const envelope = await schoolCall(state.serviceUrl, 'SET_PH_UsersPeriodsPicks', [{
    IdUser: idUser,
    IdSubUnit: idSubUnit,
    Periods: periods
  }], state.authToken)

  return {
    ok: schoolOk(envelope) && envelope.ResponseCode === SchoolResult.Success,
    message: cleanMessage(envelope.ResponseMessage),
    payload: envelope.ResponseObject
  }
}

function extractBookingSubUnits(payload: unknown) {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
  const units = Array.isArray(root?.Units) ? root.Units as Array<Record<string, unknown>> : []
  const out: Array<{ id: string, name: string, unitName: string, unitId: string, calendarType?: number }> = []
  for (const unit of units) {
    const unitName = String(unit.Description || unit.Name || unit.Unit || unit.IdUnit || '')
    const unitId = String(unit.IdUnit ?? unit.Id ?? '')
    const subs = Array.isArray(unit.SubUnits) ? unit.SubUnits as Array<Record<string, unknown>> : []
    for (const sub of subs) {
      const id = String(sub.IdSubUnit ?? sub.Id ?? '')
      if (!id || id === '0') continue
      const calendarType = Number(
        sub.IdCalendarTypeRequisition
        ?? sub.CalendarType
        ?? sub.IdCalendarType
        ?? unit.IdCalendarTypeRequisition
        ?? 2
      )
      out.push({
        id,
        name: String(sub.Description || sub.SubUnit || sub.Name || id),
        unitName,
        unitId,
        calendarType: Number.isFinite(calendarType) ? calendarType : 2
      })
    }
  }
  return out
}

function foldSubUnitName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function isLunchSubUnit(name: string) {
  const folded = foldSubUnitName(name)
  return folded.includes('almoco') && !folded.includes('pequeno')
}

/** Prefer Almoço when the client has not picked a subunit yet. */
function pickBookingSubUnit<T extends { id: string, name: string }>(
  subUnits: T[],
  subUnitId?: string | null
): T {
  if (subUnitId) {
    const explicit = subUnits.find(item => item.id === String(subUnitId))
    if (explicit) return explicit
  }
  return subUnits.find(item => isLunchSubUnit(item.name)) || subUnits[0]
}

function normalizeMonth(value?: string | null) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function readGate(state: PortalState, studentId?: string | null): Promise<ModuleResult> {
  const envelope = await schoolCall(state.serviceUrl, 'GET_RequestManagement_userEE', {
    ParamIdUser: state.user.IdUser,
    ParamIdProject: state.user.IdProject,
    ParamIdSchoolYear: state.user.IdSchoolYear,
    ParamIsActive: true,
    ParamIdEducando: studentId ? Number(studentId) || null : null
  }, state.authToken)
  return {
    ok: true,
    payload: asList('modules.portaria.label', schoolOk(envelope) ? envelope.ResponseObject : null),
    message: !schoolOk(envelope) ? cleanMessage(envelope.ResponseMessage) : undefined,
    source: 'SIGAService2020/GET_RequestManagement_userEE',
    canTopUp: false,
    canSaveDays: false
  }
}

async function createDigitalWallet(state: PortalState, body: unknown) {
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const idUser = payload.studentId ? Number(payload.studentId) || state.user.IdUser || 0 : state.user.IdUser || 0
  if (!idUser) return { ok: false, message: serverT('api.incomplete'), payload: null }

  const accepted = payload.acceptedTerms === true
  if (!accepted) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  const draftEnvelope = await schoolCall(state.serviceUrl, 'GET_UserWalletCreate', {
    IdUser: idUser,
    UserToken: ''
  }, state.authToken)
  if (!schoolOk(draftEnvelope) || !draftEnvelope.ResponseObject) {
    return {
      ok: false,
      message: cleanMessage(draftEnvelope.ResponseMessage) || serverT('api.portalHidden'),
      payload: null
    }
  }

  const draft = asWalletCreateDraft(draftEnvelope.ResponseObject)
  const base = draftEnvelope.ResponseObject as Record<string, unknown>
  const charge = base.EducationCharge && typeof base.EducationCharge === 'object' && !Array.isArray(base.EducationCharge)
    ? base.EducationCharge as Record<string, unknown>
    : {}

  const studentName = String(payload.studentName || draft?.studentName || '').trim()
  const eeName = String(payload.eeName || draft?.eeName || '').trim()
  const eeNif = String(payload.eeNif || draft?.eeNif || '').replace(/\D/g, '')
  const eeDocNumber = String(payload.eeDocNumber || draft?.eeDocNumber || '').trim()
  const email = String(payload.eeEmail || draft?.eeEmail || state.user.UserExtra?.Email || '').trim()
  const postal = String(payload.eePostalCode || draft?.eePostalCode || '').replace(/\D/g, '')
  const postalExt = String(payload.eePostalExt || draft?.eePostalExt || '').replace(/\D/g, '')
  const birthDate = portalWalletDate(payload.studentBirthDate || draft?.studentBirthDate)
  const expiryDate = portalWalletDate(payload.eeExpiryDate || draft?.eeExpiryDate)
  const eeDocumentType = optionNumber(payload.eeDocumentType, draft?.eeDocumentType ?? 2)
  const studentEchelon = optionNumber(payload.studentEchelon, draft?.studentEchelon ?? 0)
  const studentNif = String(payload.studentNif || draft?.studentNif || '999999990').replace(/\D/g, '') || '999999990'

  if (!studentName || !eeName || !eeNif || !eeDocNumber || !email || !birthDate || !expiryDate) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }
  if (postal.length !== 4 || postalExt.length !== 3) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  // Official webapp builds a flat DTO — it does not resubmit the whole GET_UserWalletCreate payload.
  const walletUser = {
    Id: Number(draft?.id ?? base.Id ?? 0) || 0,
    IdUser: Number(draft?.idUser ?? base.IdUser ?? idUser) || idUser,
    IdUserSIGA: Number(draft?.idUserSiga ?? base.IdUserSIGA ?? 0) || 0,
    UserSIGAName: String(draft?.userSigaName ?? base.UserSIGAName ?? studentName),
    IdWalletCorporateInstitution: Number(draft?.idWalletCorporateInstitution ?? base.IdWalletCorporateInstitution ?? 0) || 0,
    IdWalletInstitution: Number(draft?.idWalletInstitution ?? base.IdWalletInstitution ?? 0) || 0,
    IdEnumAccountState: Number(draft?.idEnumAccountState ?? base.IdEnumAccountState ?? 0) || 0,
    IdEnumAccountType: Number(draft?.idEnumAccountType ?? base.IdEnumAccountType ?? 0) || 0,
    DocumentTypeList: Array.isArray(base.DocumentTypeList) ? base.DocumentTypeList : [],
    CanRequestClose: false,
    DateCreate: '',
    HasCloseRequest: false,
    User: {
      Name: studentName,
      BirthDate: birthDate,
      VatNumber: studentNif,
      IdEnumEchelon: studentEchelon,
      SchoolGrade: '',
      SchoolClass: ''
    },
    EducationCharge: {
      IdUserSIGA: Number(draft?.idUserSiga ?? charge.IdUserSIGA ?? base.IdUserSIGA ?? 0) || 0,
      Name: eeName,
      IdEnumDocumentType: eeDocumentType || 2,
      DocNumber: eeDocNumber,
      VatNumber: eeNif,
      Address: String(payload.eeAddress || draft?.eeAddress || '').trim(),
      PostalCode: postal,
      PostalCodeExtension: postalExt,
      City: String(payload.eeCity || draft?.eeCity || '').trim(),
      ExpiryDate: expiryDate,
      Email: email
    }
  }

  const envelope = await schoolCall(state.serviceUrl, 'SET_WalletUser', walletUser, state.authToken)
  return {
    ok: envelope.ResponseCode === SchoolResult.Success,
    message: cleanMessage(envelope.ResponseMessage),
    payload: envelope.ResponseObject
  }
}

/** Nuxt UI Select may emit `{ label, value }` instead of the bare value. */
function optionNumber(value: unknown, fallback = 0) {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as object)) {
    return Number((value as { value: unknown }).value ?? fallback) || fallback
  }
  const num = Number(value ?? fallback)
  return Number.isFinite(num) ? num : fallback
}

/** Official wallet forms use DD-MM-YYYY. */
function portalWalletDate(value: unknown) {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`
  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`
  const parsed = Date.parse(raw)
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed)
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
  }
  return ''
}

/** Official SIGA payment-method enum used by wallet load / email-reference calls. */
const WalletPaymentMethod = {
  Multibanco: 1,
  Payshop: 2,
  MBWay: 3
} as const

async function topUpWallet(state: PortalState, body: unknown) {
  const payload = (body && typeof body === 'object' ? body : {}) as {
    metodo?: string
    valor?: number
    email?: string
    telemovel?: string
    studentId?: string | null
  }

  const idUser = payload.studentId ? Number(payload.studentId) || state.user.IdUser : state.user.IdUser
  if (!idUser) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  const method = String(payload.metodo || 'mbway').toLowerCase()
  const context = await walletTopUpContext(state, idUser)
  if (!context) {
    return { ok: false, message: serverT('api.needWallet'), payload: null }
  }

  if (method === 'mbway') {
    const amount = Number.parseFloat(String(payload.valor))
    const phoneDigits = String(payload.telemovel || '').replace(/\D/g, '')
    if (!Number.isFinite(amount) || amount <= 0 || phoneDigits.length < 9) {
      return { ok: false, message: serverT('api.incomplete'), payload: null }
    }
    if (context.minimumMBWayLoad != null && amount < context.minimumMBWayLoad) {
      return {
        ok: false,
        message: `${serverT('api.mbwayBelowMin')} (≥ ${context.minimumMBWayLoad}€)`,
        payload: null
      }
    }

    // Official UI (2024+) uses ThinkPay, not SET_WalletLoadMBWay:
    // POST /apis/payshopctt/Thinkpay/InitiatePayment?Amount&PhoneNumber=351#…&IdUserKey&EnumChargeType=3
    const localPhone = phoneDigits.startsWith('351') && phoneDigits.length >= 12
      ? phoneDigits.slice(3)
      : phoneDigits
    const idUserKey = await resolveIdUserKey(state, idUser)
    if (!idUserKey) {
      return { ok: false, message: serverT('api.incomplete'), payload: null }
    }

    const query = new URLSearchParams({
      Amount: String(amount),
      PhoneNumber: `351#${localPhone}`,
      IdUserKey: idUserKey,
      EnumChargeType: String(WalletPaymentMethod.MBWay)
    })
    const envelope = await schoolApiPost<SchoolEnvelope>(
      state.origin,
      `/apis/payshopctt/Thinkpay/InitiatePayment?${query.toString()}`,
      state.authToken,
      {},
      45000
    )
    const responseCode = Number(envelope.ResponseCode)
    console.info('[topup/mbway/thinkpay]', {
      amount,
      phone: `351#${localPhone}`,
      idUserKey,
      responseCode,
      responseMessage: envelope.ResponseMessage,
      responseObject: envelope.ResponseObject
    })

    if (responseCode !== SchoolResult.Success) {
      const school = cleanMessage(envelope.ResponseMessage)
      // Only fall back when the ThinkPay route itself is missing (older nodes).
      if (/404|not\s*found|cannot\s*get|não\s*encontr/i.test(school)) {
        return topUpWalletLegacyMbway(state, context, amount, localPhone)
      }
      return {
        ok: false,
        message: school && school !== 'Não foi possível concluir o pedido.' && school.toUpperCase() !== 'ERROR'
          ? school
          : serverT('api.mbwayProvider'),
        payload: envelope.ResponseObject
      }
    }

    return {
      ok: true,
      waiting: true,
      message: cleanMessage(envelope.ResponseMessage) || serverT('module.topUpSent'),
      payload: envelope.ResponseObject
    }
  }

  const email = String(payload.email || state.user.UserExtra?.Email || '').trim()
  if (!email) {
    return { ok: false, message: serverT('api.email'), payload: null }
  }

  const payshop = method === 'payshop'
  // Official webapp emails the existing Multibanco/Payshop reference (no amount field).
  const envelope = await schoolCall(state.serviceUrl, 'SET_SendEmailReference', {
    Email: email,
    CONF_CODE: payshop ? 'EMAIL_PAYSHOP_REFERENCE' : 'EMAIL_ATM_REFERENCE',
    Entity: payshop ? '' : (context.mbEntity || ''),
    Reference: payshop ? (context.payshopReference || '') : (context.mbReference || ''),
    IdUser: idUser,
    IdEnumPaymentMethod: payshop ? WalletPaymentMethod.Payshop : WalletPaymentMethod.Multibanco
  }, state.authToken)
  return {
    ok: envelope.ResponseCode === SchoolResult.Success,
    message: cleanMessage(envelope.ResponseMessage),
    payload: envelope.ResponseObject
  }
}

/** Official ThinkPay MB WAY needs the school IdUserKey (parent or child). */
async function resolveIdUserKey(state: PortalState, idUser: number) {
  const envelope = await schoolGetUserData(state)
  if (!schoolOk(envelope) || !envelope.ResponseObject || typeof envelope.ResponseObject !== 'object') {
    return null
  }
  const data = envelope.ResponseObject as Record<string, unknown>
  const selfKey = data.IdUserKey != null ? String(data.IdUserKey) : ''
  if (Number(data.IdUser) === idUser && selfKey) return selfKey

  const children = Array.isArray(data.ChildUsers) ? data.ChildUsers : []
  for (const child of children) {
    if (!child || typeof child !== 'object') continue
    const row = child as Record<string, unknown>
    if (Number(row.IdUser) === idUser && row.IdUserKey != null) return String(row.IdUserKey)
  }
  return selfKey || null
}

/** Older municipalities still expose SET_WalletLoadMBWay (WalletAccount.IdWallet). */
async function topUpWalletLegacyMbway(
  state: PortalState,
  context: {
    idWallet: number
    idInstitution: number
  },
  amount: number,
  phone: string
) {
  const envelope = await schoolCall(state.serviceUrl, 'SET_WalletLoadMBWay', {
    IdWalletUser: context.idWallet,
    IdInstitution: context.idInstitution,
    IdEnumChannel: WalletPaymentMethod.MBWay,
    Amount: amount,
    Phone: phone
  }, state.authToken, 45000)
  const responseCode = Number(envelope.ResponseCode)
  const loadCode = walletLoadCode(envelope.ResponseObject)
  console.info('[topup/mbway/legacy]', {
    responseCode,
    loadCode,
    responseMessage: envelope.ResponseMessage,
    responseObject: envelope.ResponseObject
  })
  if (responseCode !== SchoolResult.Success) {
    const school = cleanMessage(envelope.ResponseMessage)
    return {
      ok: false,
      message: school && school !== 'Não foi possível concluir o pedido.'
        ? school
        : `${serverT('api.refused')} (rc=${responseCode})`,
      payload: envelope.ResponseObject
    }
  }
  const rejected = Number.isFinite(loadCode) && loadCode !== 0
  return {
    ok: !rejected,
    waiting: !rejected,
    message: rejected
      ? mbwayFailureMessage(loadCode, envelope.ResponseMessage)
      : cleanMessage(envelope.ResponseMessage) || serverT('module.topUpSent'),
    payload: envelope.ResponseObject
  }
}

async function walletTopUpContext(state: PortalState, idUser: number) {
  const [accountsEnvelope, walletUserEnvelope] = await Promise.all([
    schoolCall(state.serviceUrl, 'GET_WalletAccountCollection', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken),
    schoolCall(state.serviceUrl, 'GET_UserWalletCreate', {
      IdUser: idUser,
      UserToken: ''
    }, state.authToken)
  ])

  if (!schoolOk(accountsEnvelope) || !schoolOk(walletUserEnvelope)) return null

  const account = firstWalletAccount(accountsEnvelope.ResponseObject)
  const walletUser = walletUserEnvelope.ResponseObject && typeof walletUserEnvelope.ResponseObject === 'object'
    ? walletUserEnvelope.ResponseObject as Record<string, unknown>
    : null

  // Official: IdWalletUser param ← account.IdWallet; IdInstitution ← walletUser.IdWalletInstitution
  const idWallet = Number(account?.IdWallet ?? account?.idWallet) || 0
  const idInstitution = Number(
    walletUser?.IdWalletInstitution
    ?? walletUser?.idWalletInstitution
  ) || 0
  if (!idWallet || !idInstitution) {
    console.warn('[topup/context] missing ids', {
      hasAccount: Boolean(account),
      hasWalletUser: Boolean(walletUser),
      idWallet,
      idInstitution,
      accountKeys: account ? Object.keys(account).slice(0, 20) : [],
      walletUserKeys: walletUser ? Object.keys(walletUser).slice(0, 20) : []
    })
    return null
  }

  const minMBWay = Number(account?.MinimumMBWayLoad ?? account?.minimumMBWayLoad)
  return {
    idWallet,
    idInstitution,
    mbEntity: account?.MBEntity != null ? String(account.MBEntity) : '',
    mbReference: account?.MBReference != null ? String(account.MBReference) : '',
    payshopReference: account?.PayShopReference != null ? String(account.PayShopReference) : '',
    minimumMBWayLoad: Number.isFinite(minMBWay) && minMBWay > 0 ? minMBWay : null
  }
}

function mbwayFailureMessage(code: number, responseMessage?: string | null) {
  const mapped = Number.isFinite(code) ? mbwayLoadMessage(code) : serverT('module.topUpRejected')
  const school = cleanMessage(responseMessage)
  if (school && school !== mapped && school !== 'Não foi possível concluir o pedido.') {
    return Number.isFinite(code) ? `${mapped} (${school}) [${code}]` : `${mapped} (${school})`
  }
  return Number.isFinite(code) ? `${mapped} [${code}]` : mapped
}

function firstWalletAccount(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    const first = payload.find(item => item && typeof item === 'object' && !Array.isArray(item))
    return first ? first as Record<string, unknown> : null
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    // GET_WalletAccountCollection may return DTO_Wallet_MovementsCollection
    // { AccountCollection: [...] } or XML-style { AccountCollection: { DTO_Wallet_Account: [...] } }.
    for (const key of ['AccountCollection', 'Accounts', 'Items', 'List', 'DTO_Wallet_Account']) {
      const nested = firstWalletAccount(record[key])
      if (nested) return nested
    }
    if (record.IdWallet != null) return record
  }
  return null
}

function walletLoadCode(responseObject: unknown): number {
  const visit = (value: unknown, depth = 0): number => {
    if (value == null || depth > 4) return NaN
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^-?\d+$/.test(trimmed)) return Number(trimmed)
      try {
        return visit(JSON.parse(trimmed), depth + 1)
      }
      catch {
        return NaN
      }
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      for (const key of Object.keys(record)) {
        if (key.toLowerCase() === 'walletloadcode') {
          const code = Number(record[key])
          if (Number.isFinite(code)) return code
        }
      }
      for (const nested of Object.values(record)) {
        const code = visit(nested, depth + 1)
        if (Number.isFinite(code)) return code
      }
    }
    return NaN
  }
  return visit(responseObject)
}

function mbwayLoadMessage(code: number) {
  switch (code) {
    case 1: return serverT('api.mbwayMonthLimit')
    case 2: return serverT('api.mbwayInvalidPhone')
    case 3: return serverT('api.mbwayMissing')
    case 4: return serverT('api.mbwayInactive')
    case 5: return serverT('api.mbwayProvider')
    case 6: return serverT('api.mbwayAboveMax')
    case 7: return serverT('api.mbwayBelowMin')
    default: return serverT('module.topUpRejected')
  }
}

function emptyModule(message?: string): ModuleResult {
  return {
    ok: true,
    payload: null,
    message,
    source: null,
    canTopUp: false,
    canSaveDays: false,
    needRelogin: true
  }
}

function calendarPostError(envelope: unknown) {
  if (!envelope || typeof envelope !== 'object') return ''
  const record = envelope as Record<string, unknown>
  if (typeof record.title === 'string' && record.title.trim()) {
    const errors = record.errors && typeof record.errors === 'object'
      ? Object.values(record.errors as Record<string, unknown>)
        .flatMap(value => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      : []
    return cleanMessage([record.title, ...errors].filter(Boolean).join(' — '))
  }
  if (typeof record.message === 'string' && record.message.trim()) return cleanMessage(record.message)
  if (typeof record.text === 'string' && record.text.trim()) return cleanMessage(record.text)
  return ''
}

function fineWindowStarted(fineStartDate: unknown, fineValue: unknown) {
  if (Number(fineValue) > 0 && (fineStartDate == null || fineStartDate === '')) return true
  const raw = String(fineStartDate || '').trim()
  if (!raw) return false
  const normalized = raw
    .replace(/^(\d{2})[-\/](\d{2})[-\/](\d{4})(.*)$/, '$3-$2-$1$4')
    .replace(' ', 'T')
  const stamp = Date.parse(normalized)
  return !Number.isNaN(stamp) && Date.now() > stamp
}

/** CalendarGeneric free days use -1 sentinels; never forward those IDs. */
function positiveId(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : fallback
}

function nonNegId(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? num : fallback
}

/** Official booking POST dates are DD-MM-YYYY. */
function toPortalBookingDate(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return formatPortalDay(raw.slice(0, 10))
  const dashed = raw.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`
  const slashed = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (slashed) return `${slashed[1]}-${slashed[2]}-${slashed[3]}`
  return ''
}

function firstMessage(...envelopes: Array<{ ResponseCode: number, ResponseMessage?: string | null }>) {
  for (const envelope of envelopes) {
    if (!schoolOk(envelope) && envelope.ResponseMessage) return cleanMessage(envelope.ResponseMessage)
  }
  return undefined
}

