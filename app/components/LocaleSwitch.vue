<script setup lang="ts">
const { locale, setLocale, choices, t } = useAppI18n()
</script>

<template>
  <div class="flex shrink-0 gap-1 text-xs font-normal" role="group" :aria-label="t('locale.label')">
    <button
      v-for="item in choices"
      :key="item.code"
      type="button"
      class="chip px-2.5 py-1.5"
      :class="locale === item.code ? 'chip-on' : 'chip-off'"
      :lang="item.code === 'zh' ? 'zh-Hans' : item.code"
      :aria-pressed="locale === item.code"
      @click="setLocale(item.code)"
    >
      {{ item.short }}
    </button>
  </div>
</template>
