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
}

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
  if (existing?.ready && existing.authToken && !input.username) return existing

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
        ready: true
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
        message: serverT('api.portalHidden')
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
      ready: true
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

export async function ensurePortal(
  sessionId: string,
  redirect: string,
  saved?: { authToken?: string | null, user?: SchoolUserInfo | null }
) {
  const ready = store.get(sessionId)
  if (ready?.ready && ready.authToken) return ready

  if (saved?.authToken) {
    return bindSchool(sessionId, {
      redirect,
      authToken: saved.authToken,
      user: saved.user ?? { AuthToken: saved.authToken }
    })
  }
  return bindSchool(sessionId, { redirect })
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
      ? { ...payload.userPick }
      : {}
    delete shell.UserPickDays
    delete shell.UserPickerDaysCollection

    const idSchool = Number(shell.IdSchool || state.user.IdSchool || 0)
    const userPickDays = picks.map((pick) => {
      const date = String(pick.date || '')
      const portalDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatPortalDay(date) : date
      const raw = pick.raw || {}
      const initial = Number(pick.initialRequisition ?? raw.InitialRequisition ?? raw.Requisition ?? 0)
      const wasBooked = initial === 4 || initial === 6
      // Match official calendar toggle: free→4/6, booked→5 cancel, newly booked→0 undo.
      let requisition = 0
      let withFine = Boolean(raw.RequisitionWithFine)
      if (pick.selected) {
        withFine = withFine || Number(raw.FineValue) > 0
        requisition = withFine ? 6 : 4
      }
      else if (wasBooked) {
        requisition = 5
      }
      return {
        IdSubUnit: Number(raw.IdSubUnit ?? idSubUnit),
        IdSchoolAttendance: raw.IdSchoolAttendance ?? 0,
        SchoolAttendance: raw.SchoolAttendance ?? '',
        IdSchoolRequisition: raw.IdSchoolRequisition ?? idSchool,
        SchoolRequisition: raw.SchoolRequisition ?? '',
        IdUserSchool: raw.IdUserSchool ?? 0,
        Date: portalDate,
        IdRequisition: raw.InitialIdRequisition ?? raw.IdRequisition ?? 0,
        Requisition: requisition,
        IsRequisitionLocked: Boolean(shell.IsRequisitionLockedByInvoice || raw.IsRequisitionLocked),
        IdAttendance: raw.InitialIdAttendance ?? raw.IdAttendance ?? 0,
        Attendance: raw.Attendance ?? raw.InitialAttendance ?? 0,
        IsAttendanceLocked: Boolean(shell.IsRequisitionLockedByInvoice || raw.IsAttendanceLocked),
        IdPlate: raw.IdPlate ?? raw.InitialIdPlate ?? 0,
        IdUserEchelon: raw.InitialIdUserEchelon ?? raw.IdUserEchelon ?? 0,
        Echelon: raw.InitialEchelon ?? raw.Echelon ?? '',
        FamilyValue: raw.InitialFamilyValue ?? raw.FamilyValue ?? 0,
        FineValue: raw.FineValue ?? 0,
        PlateValue: raw.PlateValue ?? 0,
        LimitPickTime: raw.LimitPickTime ?? '',
        FineStartDate: raw.FineStartDate ?? '',
        FineLimitReached: Boolean(raw.FineLimitReached),
        IsAttendanceLockedByInvoice: Boolean(raw.IsAttendanceLockedByInvoice),
        IsRequisitionLockedByInvoice: Boolean(raw.IsRequisitionLockedByInvoice),
        RequisitionWithFine: withFine || requisition === 6,
        SetAttendance: false,
        SetRequisition: true,
        IdUser: Number(raw.IdUser ?? idUser)
      }
    }).filter(item => item.Date)

    if (!userPickDays.length) {
      return { ok: false, message: serverT('api.incomplete'), payload: null }
    }

    const wrapper = {
      ...shell,
      IdSubUnit: idSubUnit,
      IdUser: idUser,
      IdSchool: idSchool,
      UserToken: '',
      UserPickDays: userPickDays
    }

    const envelope = await schoolApiPost<SchoolEnvelope>(
      state.origin,
      '/apis/requisitions/CalendarGeneric',
      state.authToken,
      [wrapper]
    )

    const limited = Boolean(
      envelope.ResponseObject
      && typeof envelope.ResponseObject === 'object'
      && (envelope.ResponseObject as { hasReachTheSchoolScheLimit?: boolean }).hasReachTheSchoolScheLimit
    )

    return {
      ok: envelope.ResponseCode === SchoolResult.Success && !limited,
      message: cleanMessage(envelope.ResponseMessage)
        || (limited ? serverT('api.incomplete') : ''),
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
  const studentName = String(payload.studentName || draft?.studentName || '').trim()
  const eeName = String(payload.eeName || draft?.eeName || '').trim()
  const eeNif = String(payload.eeNif || draft?.eeNif || '').replace(/\s/g, '')
  const eeDocNumber = String(payload.eeDocNumber || draft?.eeDocNumber || '').trim()
  const email = String(payload.eeEmail || draft?.eeEmail || state.user.UserExtra?.Email || '').trim()
  if (!studentName || !eeName || !eeNif || !eeDocNumber || !email) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  const walletUser = {
    ...base,
    Id: draft?.id ?? base.Id ?? 0,
    IdUser: draft?.idUser ?? idUser,
    IdUserSIGA: draft?.idUserSiga ?? base.IdUserSIGA ?? 0,
    UserSIGAName: draft?.userSigaName || studentName,
    IdWalletCorporateInstitution: draft?.idWalletCorporateInstitution ?? base.IdWalletCorporateInstitution ?? 0,
    IdWalletInstitution: draft?.idWalletInstitution ?? base.IdWalletInstitution ?? 0,
    IdEnumAccountState: draft?.idEnumAccountState ?? base.IdEnumAccountState ?? 0,
    IdEnumAccountType: draft?.idEnumAccountType ?? base.IdEnumAccountType ?? 0,
    DocumentTypeList: base.DocumentTypeList || [],
    CanRequestClose: false,
    DateCreate: '',
    HasCloseRequest: false,
    User: {
      Name: studentName,
      BirthDate: String(payload.studentBirthDate || draft?.studentBirthDate || ''),
      VatNumber: String(payload.studentNif || draft?.studentNif || '999999990').replace(/\s/g, '') || '999999990',
      IdEnumEchelon: Number(payload.studentEchelon ?? draft?.studentEchelon ?? 0) || 0,
      SchoolGrade: '',
      SchoolClass: ''
    },
    EducationCharge: {
      IdUserSIGA: draft?.idUserSiga ?? 0,
      Name: eeName,
      IdEnumDocumentType: Number(payload.eeDocumentType ?? draft?.eeDocumentType ?? 2) || 2,
      DocNumber: eeDocNumber,
      VatNumber: eeNif,
      Address: String(payload.eeAddress || draft?.eeAddress || ''),
      PostalCode: String(payload.eePostalCode || draft?.eePostalCode || ''),
      PostalCodeExtension: String(payload.eePostalExt || draft?.eePostalExt || ''),
      City: String(payload.eeCity || draft?.eeCity || ''),
      ExpiryDate: String(payload.eeExpiryDate || draft?.eeExpiryDate || ''),
      Email: email
    }
  }

  const envelope = await schoolCall(state.serviceUrl, 'SET_WalletUser', walletUser, state.authToken)
  return {
    ok: envelope.ResponseCode === 1,
    message: cleanMessage(envelope.ResponseMessage),
    payload: envelope.ResponseObject
  }
}

async function topUpWallet(state: PortalState, body: unknown) {
  const payload = (body && typeof body === 'object' ? body : {}) as {
    metodo?: string
    valor?: number
    email?: string
    telemovel?: string
    studentId?: string | null
  }
  const amount = Number(payload.valor)
  if (!amount || amount <= 0) {
    return { ok: false, message: serverT('api.incomplete'), payload: null }
  }

  const idUser = payload.studentId ? Number(payload.studentId) || state.user.IdUser : state.user.IdUser
  const balance = await schoolCall(state.serviceUrl, 'GET_WalletBalanceByUser', {
    IdUser: idUser,
    IdProject: state.user.IdProject,
    IdSchoolYear: state.user.IdSchoolYear,
    IdUserType: state.user.IdUserType
  }, state.authToken).catch(() => null)
  const balancePayload = balance && schoolOk(balance) ? balance.ResponseObject : null
  const hasWallet = (() => {
    if (!balancePayload || typeof balancePayload !== 'object') return null
    const record = balancePayload as Record<string, unknown>
    const nested = record.Balance && typeof record.Balance === 'object' && !Array.isArray(record.Balance)
      ? record.Balance as Record<string, unknown>
      : record
    return typeof nested.HasWallet === 'boolean' ? nested.HasWallet : typeof record.HasWallet === 'boolean' ? record.HasWallet : null
  })()
  if (hasWallet === false) {
    return { ok: false, message: serverT('api.needWallet'), payload: null }
  }

  const method = String(payload.metodo || 'mbway').toLowerCase()
  if (method === 'mbway') {
    const envelope = await schoolCall(state.serviceUrl, 'SET_WalletLoadMBWay', {
      IdUser: idUser,
      IdProject: state.user.IdProject,
      IdSchoolYear: state.user.IdSchoolYear,
      Value: amount,
      PhoneNumber: payload.telemovel || '',
      Amount: amount
    }, state.authToken)
    return {
      ok: envelope.ResponseCode === 1,
      message: cleanMessage(envelope.ResponseMessage),
      payload: envelope.ResponseObject
    }
  }

  const envelope = await schoolCall(state.serviceUrl, 'SET_SendEmailReference', {
    IdUser: idUser,
    IdProject: state.user.IdProject,
    IdSchoolYear: state.user.IdSchoolYear,
    Value: amount,
    Email: payload.email || state.user.UserExtra?.Email || '',
    PaymentMethod: method === 'payshop' ? 'Payshop' : 'Multibanco'
  }, state.authToken)
  return {
    ok: envelope.ResponseCode === 1,
    message: cleanMessage(envelope.ResponseMessage),
    payload: envelope.ResponseObject
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

function firstMessage(...envelopes: Array<{ ResponseCode: number, ResponseMessage?: string | null }>) {
  for (const envelope of envelopes) {
    if (!schoolOk(envelope) && envelope.ResponseMessage) return cleanMessage(envelope.ResponseMessage)
  }
  return undefined
}

