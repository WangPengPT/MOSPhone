<script setup lang="ts">
type MenuItem = {
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

const props = defineProps<{
  schools: Array<{ id: string, name: string }>
  subUnits: Array<{ id: string, name: string }>
  menus: MenuItem[]
}>()

const { t, locale } = useAppI18n()
const schoolId = ref(props.schools[0]?.id || 'all')
const subUnitId = ref(props.subUnits[0]?.id || 'all')

watch(() => props.schools, (schools) => {
  if (!schools.some(item => item.id === schoolId.value)) schoolId.value = schools[0]?.id || 'all'
}, { deep: true })

watch(() => props.subUnits, (units) => {
  if (!units.some(item => item.id === subUnitId.value)) subUnitId.value = units[0]?.id || 'all'
}, { deep: true })

const filtered = computed(() => {
  return props.menus.filter((item) => {
    const schoolOk = schoolId.value === 'all' || String(item.idSchool) === schoolId.value
    const unitOk = subUnitId.value === 'all' || String(item.idSubUnit) === subUnitId.value
    return schoolOk && unitOk
  })
})

const current = computed(() => filtered.value.find(item => item.isActual) || filtered.value[0] || null)

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return ''
  const tag = locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt-PT' : 'en-GB'
  const fmt = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value.slice(0, 10)
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  }
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start || end || '')
}
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="font-display text-2xl leading-[1.1] tracking-[-0.02em]">{{ t('menus.title') }}</h2>
      <p class="mt-1 text-sm ink-soft">{{ t('menus.hint') }}</p>
    </div>

    <div v-if="schools.length > 1 || subUnits.length > 1" class="flex flex-wrap gap-2">
      <template v-if="schools.length > 1">
        <button
          type="button"
          class="pressable rounded-xl px-3 py-2 text-sm"
          :class="schoolId === 'all' ? 'bg-[rgb(28_28_28_/_0.1)]' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft'"
          @click="schoolId = 'all'"
        >
          {{ t('menus.allSchools') }}
        </button>
        <button
          v-for="school in schools"
          :key="school.id"
          type="button"
          class="pressable rounded-xl px-3 py-2 text-sm"
          :class="schoolId === school.id ? 'bg-[rgb(28_28_28_/_0.1)]' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft'"
          @click="schoolId = school.id"
        >
          {{ school.name }}
        </button>
      </template>
      <template v-if="subUnits.length > 1">
        <button
          type="button"
          class="pressable rounded-xl px-3 py-2 text-sm"
          :class="subUnitId === 'all' ? 'bg-[rgb(28_28_28_/_0.1)]' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft'"
          @click="subUnitId = 'all'"
        >
          {{ t('menus.allMeals') }}
        </button>
        <button
          v-for="unit in subUnits"
          :key="unit.id"
          type="button"
          class="pressable rounded-xl px-3 py-2 text-sm"
          :class="subUnitId === unit.id ? 'bg-[rgb(28_28_28_/_0.1)]' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft'"
          @click="subUnitId = unit.id"
        >
          {{ formatWalletUnit(unit.name) }}
        </button>
      </template>
    </div>

    <a
      v-if="current?.fileUrl"
      :href="current.fileUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="surface pressable block rounded-2xl px-5 py-5"
    >
      <p class="text-xs tracking-[0.08em] text-muted uppercase">{{ t('menus.current') }}</p>
      <p class="mt-2 font-display text-2xl tracking-[-0.02em]">{{ current.title }}</p>
      <p v-if="current.school || current.firm" class="mt-2 text-sm ink-soft">
        {{ [current.school, current.firm].filter(Boolean).join(' · ') }}
      </p>
      <p v-if="current.startDate || current.endDate" class="mt-1 text-sm ink-soft">
        {{ formatRange(current.startDate, current.endDate) }}
      </p>
      <p class="mt-4 text-sm font-medium">{{ t('menus.openPdf') }}</p>
    </a>

    <ul v-if="filtered.length" class="surface divide-y divide-[var(--color-line)] rounded-2xl px-5">
      <li v-for="item in filtered" :key="item.id" class="py-4">
        <a
          v-if="item.fileUrl"
          :href="item.fileUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="pressable -mx-2 block rounded-xl px-2 py-1"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium">{{ item.title }}</p>
              <p v-if="item.school || item.firm" class="mt-1 text-sm ink-soft">
                {{ [item.school, item.firm].filter(Boolean).join(' · ') }}
              </p>
              <p v-if="item.startDate || item.endDate" class="mt-1 text-xs ink-soft">
                {{ formatRange(item.startDate, item.endDate) }}
              </p>
            </div>
            <span v-if="item.isActual" class="shrink-0 text-xs font-medium">{{ t('menus.current') }}</span>
          </div>
        </a>
        <div v-else>
          <p class="font-medium">{{ item.title }}</p>
          <p class="mt-1 text-sm ink-soft">{{ t('menus.noFile') }}</p>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm ink-soft">{{ t('menus.empty') }}</p>
  </section>
</template>
