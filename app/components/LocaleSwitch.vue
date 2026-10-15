<script setup lang="ts">
import type { Locale } from '~/locales'

const { locale, setLocale, choices, t } = useAppI18n()

const items = computed(() =>
  choices.map(item => ({
    label: item.name,
    value: item.code,
    short: item.short
  }))
)

const selected = computed({
  get: () => locale.value,
  set: (value: Locale) => setLocale(value)
})

function shortOf(code: unknown) {
  return choices.find(item => item.code === code)?.short || 'EN'
}
</script>

<template>
  <USelect
    v-model="selected"
    :items="items"
    size="sm"
    variant="ghost"
    trailing-icon="i-lucide-chevron-down"
    class="w-auto min-w-0 shrink-0"
    :ui="{
      base: 'px-1.5 gap-0.5 ring-0',
      value: 'text-xs font-medium tabular-nums',
      trailingIcon: 'size-3.5 opacity-60',
      content: 'min-w-36',
      item: 'text-sm'
    }"
    :aria-label="t('locale.label')"
  >
    <template #default="{ modelValue }">
      {{ shortOf(modelValue) }}
    </template>
  </USelect>
</template>
