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
}>(), {
  mode: 'days',
  userPick: null
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
const pendingCount = computed(() => changedPicks().length)
const dirty = computed(() => pendingCount.value > 0)
const isDaysMode = computed(() => (props.mode || 'days') !== 'periods')
const multiPeriod = computed(() => draft.value.some(day => day.picks.length > 1))

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
  pick.selected = !pick.selected
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
  emit('save', { mode: props.mode || 'days', picks: changedPicks() })
}
</script>

<template>
  <section class="space-y-3 pb-8 lg:pb-8">
    <div class="flex items-center justify-between gap-2">
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :aria-label="t('bookings.prevMonth')" @click="shiftMonth(-1)" />
      <p class="min-w-0 truncate font-display text-lg capitalize tracking-[-0.02em]">{{ monthLabel(month) }}</p>
      <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right" :aria-label="t('bookings.nextMonth')" @click="shiftMonth(1)" />
    </div>

    <div v-if="subUnits.length > 1" class="flex flex-wrap gap-1.5">
      <button
        v-for="unit in subUnits"
        :key="unit.id"
        type="button"
        class="pressable rounded-lg px-2.5 py-1.5 text-xs"
        :class="unit.id === selectedSubUnitId ? 'bg-[rgb(28_28_28_/_0.1)] text-ink' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft'"
        @click="emit('update:subUnitId', unit.id)"
      >
        {{ formatWalletUnit(unit.name) }}
      </button>
    </div>
    <p v-else-if="subUnits[0]" class="text-xs ink-soft">
      {{ subUnits[0].unitName
        ? `${formatWalletUnit(subUnits[0].unitName)} · ${formatWalletUnit(subUnits[0].name)}`
        : formatWalletUnit(subUnits[0].name) }}
    </p>

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
            :aria-label="cell.date"
            @click="dayByDate.get(cell.date) && toggleDay(dayByDate.get(cell.date)!)"
          >
            <span>{{ cell.dayNum }}</span>
            <span
              v-if="dayByDate.get(cell.date)?.picks[0]?.price != null && dayByDate.get(cell.date)?.picks[0]?.price !== ''"
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
