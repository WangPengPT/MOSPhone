<script setup lang="ts">
import type { ModulePayload } from '#shared/siga'

type WalletSection = 'cards' | 'units' | 'movements'

const props = defineProps<{ module: string }>()
const studentId = useStudentId()
const toast = useToast()
const { t } = useAppI18n()
const saving = ref(false)
const topupOpen = ref(false)
const createWalletOpen = ref(false)
const noteKey = ref('')
const noteText = ref('')
const note = computed(() => noteText.value || (noteKey.value ? t(noteKey.value) : ''))
const loadingSections = reactive<Partial<Record<WalletSection, boolean>>>({})
const walletExtra = ref<{
  cards?: any[]
  units?: any[]
  movements?: any[]
  loaded: Partial<Record<WalletSection, boolean>>
}>({ loaded: {} })

const bookingMonth = ref(currentMonth())
const bookingSubUnitId = ref<string | null>(null)

const { data: boot } = usePortalBootstrap()

// Pick student before the first module fetch to avoid a wasted round-trip.
watch(boot, (value) => {
  const students = value?.students ?? []
  if (!students.length) return
  if (!studentId.value || !students.some(student => student.id === studentId.value)) {
    studentId.value = students[0].id
  }
}, { immediate: true })

const moduleQuery = computed(() => {
  const query: Record<string, string | undefined> = {
    module: props.module,
    studentId: studentId.value || undefined,
    part: props.module === 'cartao' ? 'summary' : undefined
  }
  if (props.module === 'marcacoes') {
    query.month = bookingMonth.value
    query.subUnitId = bookingSubUnitId.value || undefined
  }
  return query
})

const asyncKey = computed(() => moduleCacheKey(props.module, studentId.value, {
  month: bookingMonth.value,
  subUnitId: bookingSubUnitId.value
}))

// lazy + cache: tab switches paint immediately from payload / warm data.
const { data, pending, error, refresh } = useAsyncData(
  asyncKey,
  async () => {
    const key = asyncKey.value
    const warm = takeWarmPortalModule(key)
    if (warm) return warm
    return $fetch<ModulePayload>('/api/portal/module', {
      query: moduleQuery.value
    }).catch(() => ({ ok: false, message: '', payload: null, canTopUp: false, canSaveDays: false, needRelogin: true }))
  },
  {
    server: false,
    lazy: true,
    watch: [asyncKey],
    getCachedData(key, nuxtApp) {
      const cached = nuxtApp.payload.data[key] as ModulePayload | undefined
      if (cached) return cached
      return peekWarmPortalModule(key) || undefined
    }
  }
)

watch(() => props.module, () => {
  walletExtra.value = { loaded: {} }
  noteKey.value = ''
  noteText.value = ''
})

const portalRefresh = usePortalRefresh()
portalRefresh.register(() => refresh())

watch(studentId, () => {
  walletExtra.value = { loaded: {} }
  bookingSubUnitId.value = null
  bookingMonth.value = currentMonth()
})

watch(data, (value) => {
  if (props.module === 'cartao') walletExtra.value = { loaded: {} }
  const payload = value?.payload as any
  if (payload?.kind === 'bookings' && payload.selectedSubUnitId && !bookingSubUnitId.value) {
    bookingSubUnitId.value = payload.selectedSubUnitId
  }
})

const currentStudent = computed(() => {
  const students = boot.value?.students ?? []
  return students.find(item => item.id === studentId.value) || students[0] || null
})

const panel = computed(() => {
  const payload = data.value?.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !('kind' in payload)) return null

  if ((payload as { kind: string }).kind === 'home') {
    const home = payload as any
    const students = boot.value?.students?.length ? boot.value.students : (home.students || [])
    const focus = students.find((item: { id: string }) => item.id === (studentId.value || home.focusStudent?.id))
      || students[0]
      || home.focusStudent
      || null
    return {
      ...home,
      students,
      focusStudent: focus
        ? {
            ...focus,
            balance: home.balance ?? focus.balance ?? null
          }
        : null
    }
  }

  if ((payload as { kind: string }).kind !== 'wallet') return payload as any

  const wallet = payload as any
  return {
    ...wallet,
    studentName: wallet.studentName || currentStudent.value?.name || null,
    studentYear: wallet.studentYear || currentStudent.value?.year || null,
    cards: walletExtra.value.loaded.cards ? (walletExtra.value.cards || []) : (wallet.cards || []),
    units: walletExtra.value.loaded.units ? (walletExtra.value.units || []) : (wallet.units || []),
    movements: walletExtra.value.loaded.movements ? (walletExtra.value.movements || []) : (wallet.movements || []),
    loaded: {
      summary: true,
      cards: Boolean(walletExtra.value.loaded.cards || wallet.loaded?.cards),
      units: Boolean(walletExtra.value.loaded.units || wallet.loaded?.units),
      movements: Boolean(walletExtra.value.loaded.movements || wallet.loaded?.movements)
    }
  }
})

const bookings = computed(() => panel.value?.kind === 'bookings' ? panel.value : null)
const menus = computed(() => panel.value?.kind === 'menus' ? panel.value : null)
const failure = computed(() => error.value ? errorText(error.value) : (!data.value?.ok ? data.value?.message : ''))
const empty = computed(() => {
  if (pending.value || failure.value) return false
  if (bookings.value || menus.value) return false
  if (!panel.value) return true
  // Home / wallet always render their own layout — never show the generic empty card.
  if (panel.value.kind === 'home' || panel.value.kind === 'wallet') return false
  if (panel.value.kind === 'profile') return !panel.value.fields?.length
  if (panel.value.kind === 'list') return !panel.value.items?.length
  return false
})

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function loadSection(section: WalletSection) {
  if (loadingSections[section] || walletExtra.value.loaded[section]) return
  loadingSections[section] = true
  try {
    const result = await $fetch<ModulePayload>('/api/portal/module', {
      query: {
        module: 'cartao',
        studentId: studentId.value || undefined,
        part: section
      }
    })
    const payload = result.payload as any
    if (section === 'cards') walletExtra.value.cards = payload?.cards || []
    if (section === 'units') walletExtra.value.units = payload?.units || []
    if (section === 'movements') walletExtra.value.movements = payload?.movements || []
    walletExtra.value.loaded[section] = true
    if (result.message) noteText.value = result.message
  }
  catch (reason) {
    noteText.value = errorText(reason)
  }
  finally {
    loadingSections[section] = false
  }
}

async function saveBookings(payload: {
  mode: 'days' | 'periods'
  picks: Array<{
    idPeriod: number
    date: string
    selected: boolean
    initialRequisition?: number
    raw?: Record<string, unknown>
  }>
}) {
  saving.value = true
  noteKey.value = ''
  noteText.value = ''
  try {
    const result = await $fetch<{ ok: boolean, message?: string, needRelogin?: boolean }>('/api/portal/action', {
      method: 'POST',
      body: {
        module: 'marcacoes',
        payload: {
          mode: payload.mode,
          studentId: studentId.value || bookings.value?.studentId,
          subUnitId: bookingSubUnitId.value || bookings.value?.selectedSubUnitId,
          userPick: bookings.value?.userPick || null,
          plates: bookings.value?.plates || [],
          picks: payload.picks
        }
      }
    })
    if (result.needRelogin) {
      noteText.value = result.message || t('panel.reloginBody')
      toast.add({ title: t('panel.reloginTitle'), description: note.value, color: 'error' })
      return
    }
    if (result.message) noteText.value = result.message
    else noteKey.value = result.ok ? 'module.sent' : 'module.bookingUnconfirmed'
    if (result.ok) {
      toast.add({ title: t('module.toastSent'), description: note.value })
      await refresh()
    }
    else {
      toast.add({
        title: result.message || t('module.bookingUnconfirmed'),
        description: note.value && note.value !== result.message ? note.value : t('module.hint'),
        color: 'error'
      })
    }
  }
  catch (reason) {
    noteText.value = errorText(reason)
  }
  finally {
    saving.value = false
  }
}

async function topUp(payload: { metodo: string, valor: number, email?: string, telemovel?: string }) {
  saving.value = true
  noteKey.value = ''
  noteText.value = ''
  try {
    const result = await $fetch<{ ok: boolean, message?: string, needRelogin?: boolean }>('/api/portal/action', {
      method: 'POST',
      body: { module: 'cartao', payload: { ...payload, studentId: studentId.value || undefined } }
    })
    if (result.needRelogin) {
      noteText.value = result.message || t('panel.reloginBody')
      toast.add({ title: t('panel.reloginTitle'), description: note.value, color: 'error' })
      return
    }
    if (result.message) noteText.value = result.message
    else noteKey.value = result.ok ? 'module.topUpSent' : 'module.topUpRejected'
    if (result.ok) {
      toast.add({ title: t('module.toastSent'), description: note.value })
      topupOpen.value = false
      await refresh()
    }
  }
  catch (reason) {
    noteText.value = errorText(reason)
  }
  finally {
    saving.value = false
  }
}

async function createWallet(payload: Record<string, unknown>) {
  saving.value = true
  noteKey.value = ''
  noteText.value = ''
  try {
    const result = await $fetch<{ ok: boolean, message?: string, needRelogin?: boolean }>('/api/portal/action', {
      method: 'POST',
      body: {
        module: 'cartao',
        payload: {
          ...payload,
          action: 'createWallet',
          studentId: studentId.value || undefined
        }
      }
    })
    if (result.needRelogin) {
      noteText.value = result.message || t('panel.reloginBody')
      toast.add({ title: t('panel.reloginTitle'), description: note.value, color: 'error' })
      return
    }
    if (result.message) noteText.value = result.message
    else noteKey.value = result.ok ? 'walletCreate.created' : 'walletCreate.rejected'
    if (result.ok) {
      toast.add({ title: t('walletCreate.created'), description: note.value })
      createWalletOpen.value = false
      await refresh()
    }
    else {
      toast.add({
        title: t('walletCreate.rejected'),
        description: note.value || result.message || t('walletCreate.rejected'),
        color: 'error'
      })
    }
  }
  catch (reason) {
    noteText.value = errorText(reason)
  }
  finally {
    saving.value = false
  }
}

const walletPanel = computed(() => panel.value?.kind === 'wallet' ? panel.value : null)
</script>

<template>
  <div class="space-y-5">
    <p v-if="failure" class="text-sm whitespace-pre-line text-red-800">{{ failure }}</p>
    <p v-if="note" class="text-sm whitespace-pre-line ink-soft">{{ note }}</p>

    <div v-if="pending && !bookings && !menus && !panel" class="space-y-4">
      <div class="h-10 w-40 animate-pulse rounded-2xl bg-[rgb(28_28_28_/_0.04)]" />
      <div class="h-16 w-56 animate-pulse rounded-2xl bg-[rgb(28_28_28_/_0.04)]" />
      <div class="h-28 animate-pulse rounded-2xl bg-[rgb(28_28_28_/_0.04)]" />
    </div>

    <template v-else>
      <BookingBoard
        v-if="bookings"
        :mode="bookings.mode === 'periods' ? 'periods' : 'days'"
        :student-id="bookings.studentId"
        :month="bookingMonth"
        :sub-units="bookings.subUnits"
        :selected-sub-unit-id="bookingSubUnitId || bookings.selectedSubUnitId"
        :period-labels="bookings.periodLabels || []"
        :days="bookings.days || []"
        :can-edit="Boolean(bookings.canEdit && data?.canSaveDays !== false)"
        :booked-count="bookings.bookedCount || 0"
        :open-count="bookings.openCount || 0"
        :saving="saving"
        :user-pick="bookings.userPick || null"
        :plates="bookings.plates || []"
        @update:month="bookingMonth = $event"
        @update:sub-unit-id="bookingSubUnitId = $event"
        @save="saveBookings"
      />

      <MenusBoard
        v-else-if="menus"
        :schools="menus.schools"
        :sub-units="menus.subUnits"
        :menus="menus.menus"
      />

      <ModulePanel
        v-else-if="panel"
        :panel="panel"
        :can-top-up="(module === 'cartao' || module === 'inicio') && data?.canTopUp"
        :loading-sections="loadingSections"
        @topup="topupOpen = true"
        @create-wallet="createWalletOpen = true"
        @load-section="loadSection"
      />

      <UModal v-model:open="topupOpen" :title="t('topup.title')">
        <template #body>
          <TopUpForm :saving="saving" @submit="topUp" />
        </template>
      </UModal>

      <UModal v-model:open="createWalletOpen" :title="t('walletCreate.title')">
        <template #body>
          <CreateWalletForm
            :saving="saving"
            :draft="walletPanel?.createDraft || null"
            :echelon-options="walletPanel?.echelonOptions || []"
            @submit="createWallet"
          />
        </template>
      </UModal>

      <div v-if="empty || data?.needRelogin" class="surface space-y-2 rounded-2xl px-5 py-8">
        <p class="font-display text-3xl leading-[1.1] tracking-[-0.03em]">{{ data?.needRelogin ? t('panel.reloginTitle') : t('module.emptyTitle') }}</p>
        <p class="max-w-md text-sm leading-relaxed ink-soft">{{ data?.needRelogin ? t('panel.reloginBody') : (data?.message || t('module.emptyBody')) }}</p>
      </div>
    </template>
  </div>
</template>
