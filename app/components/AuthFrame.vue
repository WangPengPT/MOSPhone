<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  subtitle: string
}>()

const { t } = useAppI18n()
</script>

<template>
  <div class="atmosphere min-h-dvh max-w-[100vw] overflow-x-hidden text-ink">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-5 sm:px-8 sm:pb-6 lg:px-12"
      style="padding-top: calc(1rem + var(--safe-top))"
    >
      <header class="rise flex items-center justify-between gap-3">
        <NuxtLink to="/" class="font-display text-[2.5rem] leading-none tracking-[-0.04em]" aria-label="Siga">
          siga
        </NuxtLink>
        <LocaleSwitch />
      </header>

      <div class="grid w-full min-w-0 flex-1 items-center gap-10 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-12">
        <section class="rise rise-delay-1 hidden min-w-0 lg:block">
          <p class="text-sm font-normal tracking-[0.08em] text-muted uppercase">{{ t('auth.eyebrow') }}</p>
          <h1 class="mt-5 max-w-xl font-display text-[3.75rem] leading-[1.05] tracking-[-0.04em] text-balance">
            {{ t('auth.headline') }}
          </h1>
          <p class="mt-6 max-w-md text-lg leading-[1.38] ink-soft">
            {{ t('auth.lead') }}
          </p>
          <ul class="mt-12 space-y-4 text-base ink-soft">
            <li>{{ t('auth.point1') }}</li>
            <li>{{ t('auth.point2') }}</li>
            <li>{{ t('auth.point3') }}</li>
          </ul>
        </section>

        <section class="rise rise-delay-2 min-w-0">
          <div class="mb-7 lg:hidden">
            <p class="text-sm font-normal tracking-[0.08em] text-muted uppercase">{{ kicker }}</p>
            <h1 class="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em] text-balance">{{ title }}</h1>
            <p class="mt-3 leading-relaxed ink-soft">{{ subtitle }}</p>
          </div>

          <div class="surface rounded-2xl p-6 sm:p-8">
            <div class="hidden lg:block">
              <p class="text-sm font-normal tracking-[0.08em] text-muted uppercase">{{ kicker }}</p>
              <h2 class="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.03em]">{{ title }}</h2>
              <p class="mt-3 leading-relaxed ink-soft">{{ subtitle }}</p>
            </div>
            <div class="lg:mt-7">
              <slot />
            </div>
          </div>
          <div class="rise rise-delay-3 mt-6">
            <slot name="below" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
