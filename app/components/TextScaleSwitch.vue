<script setup lang="ts">
const { isLarge, toggle } = useTextScale()
const { t } = useAppI18n()
</script>

<template>
  <button
    type="button"
    class="pressable inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-ink transition hover:bg-[rgb(28_28_28_/_0.06)]"
    :aria-pressed="isLarge"
    :aria-label="isLarge ? t('textScale.toNormal') : t('textScale.toLarge')"
    :title="isLarge ? t('textScale.toNormal') : t('textScale.toLarge')"
    @click="toggle"
  >
    <span class="text-xs font-medium leading-none" :class="isLarge ? 'opacity-45' : ''">A</span>
    <span class="text-base font-semibold leading-none tracking-tight" :class="isLarge ? '' : 'opacity-45'">A</span>
  </button>
</template>
