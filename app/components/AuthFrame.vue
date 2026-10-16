<script setup lang="ts">
const props = withDefaults(defineProps<{
  kicker?: string
  title?: string
  subtitle?: string
}>(), {
  kicker: '',
  title: '',
  subtitle: ''
})

const { t } = useAppI18n()

/** Login-style: no page title — brand carries the first viewport. */
const brandFirst = computed(() => !props.kicker && !props.title)
</script>

<template>
  <div class="atmosphere auth-shell min-h-dvh max-w-[100vw] overflow-x-hidden text-ink">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-[max(1.25rem,var(--safe-bottom))] sm:px-8 lg:px-12"
      style="padding-top: calc(0.85rem + var(--safe-top))"
    >
      <header class="rise flex items-center justify-between gap-3">
        <NuxtLink
          to="/"
          class="font-display text-[2.5rem] leading-none tracking-[-0.04em] transition-opacity hover:opacity-80 lg:text-[2.65rem]"
          aria-label="Siga"
        >
          siga
        </NuxtLink>
        <div class="flex items-center gap-1">
          <TextScaleSwitch />
          <LocaleSwitch />
        </div>
      </header>

      <!-- Tall viewports: stage centers the login block; short ones stay top-led. Footer stays pinned. -->
      <div class="auth-stage grid w-full min-w-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <section class="rise rise-delay-1 hidden min-w-0 lg:block">
          <p class="text-sm font-medium tracking-[0.14em] text-muted uppercase">{{ t('auth.eyebrow') }}</p>
          <p class="mt-6 font-display text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.05em]">
            siga
          </p>
          <h1 class="mt-6 max-w-lg font-display text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-balance">
            {{ t('auth.headline') }}
          </h1>
          <p class="mt-5 max-w-md text-base leading-relaxed ink-soft">
            {{ t('auth.lead') }}
          </p>
          <ul class="mt-10 space-y-3 text-[0.95rem] ink-soft">
            <li class="flex gap-3">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-ink/35" />
              <span>{{ t('auth.point1') }}</span>
            </li>
            <li class="flex gap-3">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-ink/35" />
              <span>{{ t('auth.point2') }}</span>
            </li>
            <li class="flex gap-3">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-ink/35" />
              <span>{{ t('auth.point3') }}</span>
            </li>
          </ul>
        </section>

        <section class="rise rise-delay-2 mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:max-w-none">
          <p
            v-if="brandFirst && subtitle"
            class="mb-5 max-w-sm text-[0.95rem] leading-relaxed ink-soft lg:hidden"
          >
            {{ subtitle }}
          </p>

          <div v-else-if="kicker || title || subtitle" class="mb-5 lg:hidden">
            <p v-if="kicker" class="text-sm font-medium tracking-[0.12em] text-muted uppercase">{{ kicker }}</p>
            <h1
              v-if="title"
              class="font-display text-[2.15rem] leading-[1.05] tracking-[-0.03em] text-balance sm:text-[2.35rem]"
              :class="kicker ? 'mt-2' : ''"
            >{{ title }}</h1>
            <p v-if="subtitle" class="mt-2.5 text-[0.95rem] leading-relaxed ink-soft">{{ subtitle }}</p>
          </div>

          <div class="auth-panel rounded-[1.25rem] px-5 py-5 sm:px-6 sm:py-6 lg:rounded-[1.35rem] lg:px-7 lg:py-7">
            <div v-if="!brandFirst && (kicker || title || subtitle)" class="mb-5 hidden lg:block">
              <p v-if="kicker" class="text-sm font-medium tracking-[0.12em] text-muted uppercase">{{ kicker }}</p>
              <h2
                v-if="title"
                class="font-display text-[2.15rem] leading-[1.05] tracking-[-0.03em]"
                :class="kicker ? 'mt-2' : ''"
              >{{ title }}</h2>
              <p v-if="subtitle" class="mt-2.5 leading-relaxed ink-soft">{{ subtitle }}</p>
            </div>
            <p
              v-else-if="brandFirst && subtitle"
              class="mb-5 hidden text-[0.95rem] leading-relaxed ink-soft lg:block"
            >
              {{ subtitle }}
            </p>
            <slot />
          </div>
        </section>
      </div>

      <footer
        v-if="$slots.below"
        class="rise rise-delay-3 mt-auto w-full max-w-md border-t border-[rgb(28_28_28_/_0.08)] pt-4 pb-1 mx-auto lg:mx-0 lg:max-w-none lg:border-0 lg:pt-0"
      >
        <slot name="below" />
      </footer>
    </div>
  </div>
</template>
