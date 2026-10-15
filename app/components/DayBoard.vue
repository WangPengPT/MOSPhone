<script setup lang="ts">
import type { DayItem } from '~/utils/days'

const props = defineProps<{
  days: DayItem[]
  saving: boolean
}>()

const emit = defineEmits<{ save: [days: DayItem[]] }>()
const { t, locale } = useAppI18n()
const draft = ref<DayItem[]>(props.days.map(day => ({ ...day, raw: { ...day.raw } })))

watch(() => props.days, (days) => {
  draft.value = days.map(day => ({ ...day, raw: { ...day.raw } }))
})

function toggle(day: DayItem) {
  day.marked = !day.marked
  day.raw = { ...day.raw, [day.flag]: day.marked }
}

function label(day: DayItem) {
  const date = new Date(day.date)
  if (Number.isNaN(date.getTime())) return day.date
  const tag = locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt-PT' : 'en-GB'
  return new Intl.DateTimeFormat(tag, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h2 class="font-display text-2xl leading-[1.1] tracking-[-0.02em]">{{ t('days.title') }}</h2>
        <p class="mt-2 text-sm ink-soft">{{ t('days.hint') }}</p>
      </div>
      <UButton size="lg" :label="t('days.confirm')" :loading="saving" @click="emit('save', draft)" />
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      <button
        v-for="day in draft"
        :key="day.id"
        type="button"
        class="pressable rounded-2xl px-3 py-3.5 text-left"
        :class="day.marked ? 'bg-[rgb(28_28_28_/_0.08)] text-ink' : 'bg-[rgb(28_28_28_/_0.03)] ink-soft hover:bg-[rgb(28_28_28_/_0.06)] hover:text-ink'"
        @click="toggle(day)"
      >
        <span class="block text-sm font-semibold capitalize">{{ label(day) }}</span>
        <span class="mt-1 block text-xs opacity-80">{{ day.marked ? t('days.marked') : t('days.open') }}</span>
        <span v-if="day.title" class="mt-2 block text-xs leading-snug opacity-80">{{ day.title }}</span>
      </button>
    </div>
  </section>
</template>
