<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number, statusMessage?: string, message?: string }
}>()

const { t } = useAppI18n()
const detail = computed(() => {
  if (props.error.statusCode === 404) return t('error.missing')
  return props.error.statusMessage || props.error.message || t('error.fallback')
})

function home() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <main class="atmosphere grid min-h-dvh place-items-center px-6 text-ink">
      <div class="rise max-w-md text-center">
        <div class="mb-8 flex justify-center gap-1">
          <TextScaleSwitch />
          <LocaleSwitch />
        </div>
        <p class="text-sm tracking-[0.08em] text-muted uppercase">{{ error.statusCode || 500 }}</p>
        <h1 class="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.03em]">{{ t('error.title') }}</h1>
        <p class="mt-4 leading-relaxed ink-soft">{{ detail }}</p>
        <UButton class="mt-8" size="lg" :label="t('error.home')" @click="home" />
      </div>
    </main>
  </UApp>
</template>
