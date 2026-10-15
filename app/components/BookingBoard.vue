<script setup lang="ts">
type BookingPick = {
  idPeriod: number
  description: string
  selected: boolean
  locked: boolean
  price: number | string | null
  idRequisition: number | null
  requisition?: number
  initialRequisition?: number
  raw?: Record<string, unknown>
}

type BookingDay = {
  id: string
  date: string
  weekday: number
  locked: boolean
  picks: BookingPick[]
}

type BookingSubUnit = {
  id: string
  name: string
  unitName: string
  unitId: string
}

type BookingPlate = {
  id: number
  name: string
  kind: 'normal' | 'vegetarian' | 'other'
}

type DietKind = 'normal' | 'vegetarian'

const DIET_STORAGE_KEY = 'siga_meal_diet'

const props = withDefaults(defineProps<{
  mode?: 'days' | 'periods'
  studentId: string
  month: string
  subUnits: BookingSubUnit[]
  selectedSubUnitId: string | null
  periodLabels: Array<{ id: number, description: string }>
  days: BookingDay[]
  canEdit: boolean
  bookedCount: number
  openCount: number
  saving: boolean
  userPick?: Record<string, unknown> | null
  plates?: BookingPlate[]
}>(), {
  mode: 'days',
  userPick: null,
  plates: () => []
})

const emit = defineEmits<{
  'update:month': [month: string]
  'update:subUnitId': [id: string]
  save: [payload: {
    mode: 'days' | 'periods'
    picks: Array<{
      idPeriod: number
      date: string
      selected: boolean
      initialRequisition?: number
      raw?: Record<string, unknown>
    }>
  }]
}>()

const { t, locale } = useAppI18n()
const draft = ref(cloneDays(props.days))
const baseline = ref(cloneDays(props.days))
const diet = ref<DietKind>(readStoredDiet())
const isDaysMode = computed(() => (props.mode || 'days') !== 'periods')
const multiPeriod = computed(() => draft.value.some(day => day.picks.length > 1))
const showDiet = computed(() => isDaysMode.value && !multiPeriod.value)

const dietOptions = computed(() => {
  const plates = props.plates || []
  const normal = plates.find(plate => plate.kind === 'normal')
    || plates.find(plate => plate.kind !== 'vegetarian')
  const vegetarian = plates.find(plate => plate.kind === 'vegetarian')
  // SIGA often treats IdPlate 0 as the default/normal plate when only specials are listed.
  const hasPlateCatalog = plates.length > 0
  return [
    {
      kind: 'normal' as const,
      id: normal?.id ?? (hasPlateCatalog ? 0 : null),
      label: t('bookings.dietNormal')
    },
    {
      kind: 'vegetarian' as const,
      id: vegetarian?.id ?? null,
      label: t('bookings.dietVegetarian')
    }
  ]
})

const subUnitItems = computed(() =>
  props.subUnits.map(unit => ({
    label: formatWalletUnit(unit.name),
    value: unit.id
  }))
)

const selectedSubUnit = computed({
  get: () => props.selectedSubUnitId || props.subUnits[0]?.id || '',
  set: (id: string) => {
    if (id) emit('update:subUnitId', id)
  }
})

const dietItems = computed(() =>
  dietOptions.value.map(option => ({
    label: option.label,
    value: option.kind
  }))
)

const selectedDiet = computed({
  get: () => diet.value,
  set: (next: DietKind) => setDiet(next)
})

const showFilterRow = computed(() => props.subUnits.length > 0 || showDiet.value)

const selectUi = {
  base: [
    'min-h-11 px-3 gap-1.5 rounded-lg',
    'border-0 shadow-none outline-none',
    '!ring-0 ring-transparent',
    'bg-[rgb(28_28_28_/_0.04)]',
    'hover:bg-[rgb(28_28_28_/_0.07)]',
    'focus:!bg-[rgb(28_28_28_/_0.04)] focus:!ring-0 focus:outline-none',
    'focus-visible:!bg-[rgb(28_28_28_/_0.04)] focus-visible:!ring-0 focus-visible:outline-none',
    'data-[state=open]:!bg-[rgb(28_28_28_/_0.07)] data-[state=open]:!ring-0'
  ].join(' '),
  value: 'text-sm font-medium',
  trailingIcon: 'size-4 opacity-60',
  content: 'min-w-44 max-w-[min(20rem,90vw)]',
  item: 'text-base py-2.5 data-[state=checked]:bg-transparent data-[state=checked]:text-default',
  itemTrailingIcon: 'hidden'
}

const selectedPlateId = computed(() =>
  dietOptions.value.find(option => option.kind === diet.value)?.id ?? null
)

const canApplyPlate = computed(() => selectedPlateId.value != null)

const plateDirty = computed(() => {
  if (!showDiet.value || !props.canEdit || !canApplyPlate.value) return false
  const plateId = selectedPlateId.value!
  return draft.value.some(day =>
    day.picks.some((pick) => {
      if (!pick.selected || pick.locked || day.locked) return false
      const current = Number(pick.raw?.IdPlate ?? pick.raw?.InitialIdPlate ?? 0)
      return current !== plateId
    })
  )
})

const pendingCount = computed(() => changedPicks().length)
const dirty = computed(() => pendingCount.value > 0 || plateDirty.value)

const liveBooked = computed(() =>
  draft.value.reduce((sum, day) => sum + day.picks.filter(pick => pick.selected).length, 0)
)
const liveOpen = computed(() =>
  draft.value.reduce((sum, day) => sum + day.picks.filter(pick => !pick.selected && !pick.locked && !day.locked).length, 0)
)

watch(() => props.days, (days) => {
  draft.value = cloneDays(days)
  baseline.value = cloneDays(days)
})

function readStoredDiet(): DietKind {
  if (!import.meta.client) return 'normal'
  try {
    const raw = localStorage.getItem(DIET_STORAGE_KEY)
    return raw === 'vegetarian' ? 'vegetarian' : 'normal'
  }
  catch {
    return 'normal'
  }
}

function setDiet(next: DietKind) {
  diet.value = next
  if (!import.meta.client) return
  try {
    localStorage.setItem(DIET_STORAGE_KEY, next)
  }
  catch {
    // ignore quota / private mode
  }
  applyDietToSelectedDays()
}

function classifyDietName(name: string): DietKind | null {
  const folded = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
  if (!folded) return null
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
  return null
}

function plateKindForPick(pick: BookingPick): DietKind | null {
  const id = Number(pick.raw?.IdPlate ?? pick.raw?.InitialIdPlate ?? 0)
  const fromCatalog = (props.plates || []).find(plate => plate.id === id)
  if (fromCatalog?.kind === 'vegetarian' || fromCatalog?.kind === 'normal') {
    return fromCatalog.kind
  }
  const named = classifyDietName(String(pick.raw?.Plate || pick.description || ''))
  if (named) return named
  if (Number.isFinite(id) && id === 0 && pick.selected) return 'normal'
  return null
}

function plateShortLabel(pick: BookingPick) {
  const kind = plateKindForPick(pick)
  if (kind === 'vegetarian') return t('bookings.dietShortVegetarian')
  if (kind === 'normal') return t('bookings.dietShortNormal')
  return ''
}

function cellPlateAria(date: string) {
  const pick = dayByDate.value.get(date)?.picks[0]
  if (!pick) return date
  const plate = plateShortLabel(pick)
  return plate ? `${date} · ${plate}` : date
}

function applyPlateToPick(pick: BookingPick, plateId: number) {
  const option = dietOptions.value.find(item => item.id === plateId)
  const plateName = option?.kind === 'vegetarian'
    ? t('bookings.dietVegetarian')
    : option?.kind === 'normal'
      ? t('bookings.dietNormal')
      : String(pick.raw?.Plate || pick.description || '')
  pick.raw = {
    ...(pick.raw || {}),
    IdPlate: plateId,
    Plate: plateName
  }
  pick.description = plateName || pick.description
}

function applyDietToSelectedDays() {
  const plateId = selectedPlateId.value
  if (!showDiet.value || plateId == null || !props.canEdit) return
  let changed = false
  for (const day of draft.value) {
    for (const pick of day.picks) {
      if (!pick.selected || pick.locked || day.locked) continue
      const current = Number(pick.raw?.IdPlate ?? pick.raw?.InitialIdPlate ?? 0)
      if (current === plateId) continue
      applyPlateToPick(pick, plateId)
      changed = true
    }
  }
  if (changed) draft.value = cloneDays(draft.value)
}

const dayByDate = computed(() => {
  const map = new Map<string, BookingDay>()
  for (const day of draft.value) map.set(day.date, day)
  return map
})

const weekdayLabels = computed(() => {
  const tag = locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt-PT' : 'en-GB'
  // School meals: Mon–Fri only (2024-01-01 was a Monday).
  return Array.from({ length: 5 }, (_, index) =>
    new Intl.DateTimeFormat(tag, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + index))
  )
})

const calendarCells = computed(() => {
  const [y, m] = props.month.split('-').map(Number)
  if (!y || !m) return [] as Array<{ key: string, date: string | null, dayNum: number | null }>
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  // JS: 0=Sun … 6=Sat → Mon-first weekday index 0–4 (skip Sat/Sun).
  const startPad = (first.getDay() + 6) % 7
  const cells: Array<{ key: string, date: string | null, dayNum: number | null }> = []
  if (startPad < 5) {
    for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, date: null, dayNum: null })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(y, m - 1, day).getDay()
    if (weekday === 0 || weekday === 6) continue
    const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ key: date, date, dayNum: day })
  }
  while (cells.length % 5 !== 0) {
    cells.push({ key: `tail-${cells.length}`, date: null, dayNum: null })
  }
  return cells
})

function cloneDays(days: BookingDay[]) {
  return days.map(day => ({
    ...day,
    picks: day.picks.map(pick => ({ ...pick }))
  }))
}

function changedPicks() {
  const original = new Map(
    baseline.value.flatMap(day => day.picks.map(pick => [`${day.date}:${pick.idPeriod}`, pick.selected]))
  )
  return draft.value.flatMap(day => day.picks
    .filter(pick => original.get(`${day.date}:${pick.idPeriod}`) !== pick.selected)
    .map(pick => ({
      idPeriod: pick.idPeriod,
      date: day.date,
      selected: pick.selected,
      initialRequisition: pick.initialRequisition ?? pick.requisition,
      raw: pick.raw
    })))
}

function picksForSave() {
  const plateId = selectedPlateId.value
  const applyPlate = showDiet.value && plateId != null
  const byKey = new Map(
    changedPicks().map(pick => [`${pick.date}:${pick.idPeriod}`, pick])
  )

  if (applyPlate && plateDirty.value) {
    for (const day of draft.value) {
      for (const pick of day.picks) {
        if (!pick.selected || pick.locked || day.locked) continue
        const key = `${day.date}:${pick.idPeriod}`
        if (byKey.has(key)) continue
        const current = Number(pick.raw?.IdPlate ?? pick.raw?.InitialIdPlate ?? 0)
        if (current === plateId) continue
        byKey.set(key, {
          idPeriod: pick.idPeriod,
          date: day.date,
          selected: pick.selected,
          initialRequisition: pick.initialRequisition ?? pick.requisition,
          raw: pick.raw
        })
      }
    }
  }

  return Array.from(byKey.values()).map(pick => ({
    ...pick,
    raw: {
      ...(pick.raw || {}),
      ...(applyPlate ? { IdPlate: plateId } : {})
    }
  }))
}

function shiftMonth(delta: number) {
  const [y, m] = props.month.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1 + delta, 1)
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  emit('update:month', next)
}

function monthLabel(value: string) {
  const [y, m] = value.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, 1)
  const tag = locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt-PT' : 'en-GB'
  return new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(date)
}

function dayNum(iso: string) {
  return Number(iso.slice(8, 10)) || iso
}

function toggle(day: BookingDay, pick: BookingPick) {
  if (!props.canEdit || pick.locked || day.locked) return
  const next = !pick.selected
  if (next && showDiet.value && selectedPlateId.value != null) {
    applyPlateToPick(pick, selectedPlateId.value)
  }
  pick.selected = next
  draft.value = cloneDays(draft.value)
}

function toggleDay(day: BookingDay) {
  const pick = day.picks[0]
  if (!pick) return
  toggle(day, pick)
}

function cellClass(day: BookingDay | undefined) {
  if (!day) return 'bg-transparent opacity-30'
  const pick = day.picks[0]
  if (!pick) return 'bg-[rgb(28_28_28_/_0.03)] opacity-40'
  if (day.locked || pick.locked) {
    return pick.selected
      ? 'bg-[rgb(28_28_28_/_0.12)] text-ink opacity-55'
      : 'bg-[rgb(28_28_28_/_0.03)] ink-soft opacity-45'
  }
  if (pick.selected) return 'bg-ink text-[var(--color-paper)]'
  return 'bg-[rgb(28_28_28_/_0.04)] text-ink hover:bg-[rgb(28_28_28_/_0.1)]'
}

function confirm() {
  emit('save', { mode: props.mode || 'days', picks: picksForSave() })
}
</script>

<template>
  <section class="space-y-3 pb-8 lg:pb-8">
    <div class="flex items-center justify-between gap-2">
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :aria-label="t('bookings.prevMonth')" @click="shiftMonth(-1)" />
      <p class="min-w-0 truncate font-display text-lg capitalize tracking-[-0.02em]">{{ monthLabel(month) }}</p>
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right" :aria-label="t('bookings.nextMonth')" @click="shiftMonth(1)" />
    </div>

    <div v-if="showFilterRow" class="flex items-center gap-2.5">
      <USelect
        v-if="subUnits.length"
        v-model="selectedSubUnit"
        :items="subUnitItems"
        size="md"
        color="neutral"
        variant="none"
        :highlight="false"
        trailing-icon="i-lucide-chevron-down"
        class="min-w-0 flex-1"
        :ui="selectUi"
        :aria-label="t('bookings.meal')"
      />
      <USelect
        v-if="showDiet"
        v-model="selectedDiet"
        :items="dietItems"
        size="md"
        color="neutral"
        variant="none"
        :highlight="false"
        trailing-icon="i-lucide-chevron-down"
        class="min-w-0 flex-1"
        :ui="selectUi"
        :aria-label="t('bookings.diet')"
      />
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ink-soft">
      <span>{{ t('bookings.booked', { count: liveBooked }) }}</span>
      <span>{{ t('bookings.open', { count: liveOpen }) }}</span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block size-2.5 rounded-sm bg-ink" />
        {{ t('bookings.marked') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block size-2.5 rounded-sm bg-[rgb(28_28_28_/_0.12)]" />
        {{ t('bookings.available') }}
      </span>
    </div>

    <p v-if="!subUnits.length" class="text-sm ink-soft">{{ t('bookings.noUnits') }}</p>

    <!-- Compact month grid for single-meal day booking -->
    <div v-else-if="draft.length && isDaysMode && !multiPeriod" class="surface overflow-hidden rounded-2xl p-2">
      <div class="grid grid-cols-5 gap-1">
        <div
          v-for="label in weekdayLabels"
          :key="label"
          class="py-1 text-center text-[11px] font-medium uppercase tracking-wide ink-soft"
        >
          {{ label }}
        </div>
        <template v-for="cell in calendarCells" :key="cell.key">
          <button
            v-if="cell.date"
            type="button"
            class="pressable relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors"
            :class="cellClass(dayByDate.get(cell.date))"
            :disabled="!canEdit || !dayByDate.get(cell.date) || dayByDate.get(cell.date)?.locked || dayByDate.get(cell.date)?.picks[0]?.locked"
            :aria-pressed="dayByDate.get(cell.date)?.picks[0]?.selected || false"
            :aria-label="cellPlateAria(cell.date)"
            @click="dayByDate.get(cell.date) && toggleDay(dayByDate.get(cell.date)!)"
          >
            <span>{{ cell.dayNum }}</span>
            <span
              v-if="dayByDate.get(cell.date)?.picks[0]?.selected && plateShortLabel(dayByDate.get(cell.date)!.picks[0]!)"
              class="mt-0.5 max-w-full truncate px-0.5 text-[9px] font-medium leading-none opacity-80"
            >
              {{ plateShortLabel(dayByDate.get(cell.date)!.picks[0]!) }}
            </span>
            <span
              v-else-if="dayByDate.get(cell.date)?.picks[0]?.price != null && dayByDate.get(cell.date)?.picks[0]?.price !== ''"
              class="mt-0.5 max-w-full truncate px-0.5 text-[9px] font-normal opacity-70"
            >
              {{ formatMoney(dayByDate.get(cell.date)!.picks[0]!.price) }}
            </span>
          </button>
          <div v-else class="aspect-square" />
        </template>
      </div>
    </div>

    <!-- Multi-period: dense day rows -->
    <div v-else-if="draft.length" class="space-y-1.5">
      <article
        v-for="day in draft"
        :key="day.id"
        class="surface flex items-center gap-2 rounded-xl px-2.5 py-2"
      >
        <p class="w-9 shrink-0 text-center font-display text-lg leading-none tracking-[-0.02em]">
          {{ dayNum(day.date) }}
        </p>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="pick in day.picks"
              :key="`${day.id}-${pick.idPeriod}`"
              type="button"
              class="pressable rounded-lg px-2.5 py-1.5 text-left text-xs"
              :disabled="!canEdit || pick.locked || day.locked"
              :class="pick.selected
                ? 'bg-ink text-[var(--color-paper)]'
                : pick.locked || day.locked
                  ? 'bg-[rgb(28_28_28_/_0.03)] opacity-45'
                  : 'bg-[rgb(28_28_28_/_0.05)] ink-soft'"
              @click="toggle(day, pick)"
            >
              <span class="font-semibold">{{ pick.description || t('bookings.meal') }}</span>
              <span v-if="pick.price != null && pick.price !== ''" class="ml-1 opacity-70">{{ formatMoney(pick.price) }}</span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-else class="text-sm ink-soft">{{ t('bookings.emptyMonth') }}</p>

    <!-- Stay in-page (not body teleport) so it never overlays the More drawer. -->
    <div
      v-if="canEdit"
      class="sticky bottom-0 z-10 mt-4 border-t border-[var(--color-line)] bg-[rgb(247_244_237_/_0.96)] px-1 py-3 backdrop-blur-md"
    >
      <div class="flex items-center gap-3">
        <p class="min-w-0 flex-1 text-xs ink-soft">
          <span v-if="dirty">{{ t('bookings.pending', { count: pendingCount }) }}</span>
          <span v-else>{{ t('bookings.hintShort') }}</span>
        </p>
        <UButton
          size="md"
          class="shrink-0"
          :label="t('bookings.confirm')"
          :loading="saving"
          :disabled="!dirty"
          @click="confirm"
        />
      </div>
    </div>
  </section>
</template>
