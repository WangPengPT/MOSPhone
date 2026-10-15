<script setup lang="ts">
import { portalModules, primaryNav } from '#shared/siga'

const route = useRoute()
const studentId = useStudentId()
const more = ref(false)
const { t } = useAppI18n()
const { refresh: runPortalRefresh, pending: refreshPending } = usePortalRefresh()

const { data, pending, refresh: refreshBootstrap } = await usePortalBootstrap()

watch(data, (value) => {
  const students = value?.students ?? []
  if (!students.length) return
  if (!studentId.value || !students.some(student => student.id === studentId.value)) {
    studentId.value = students[0].id
  }
}, { immediate: true })

const students = computed(() => data.value?.students ?? [])
const studentItems = computed(() => students.value.map((student) => {
  const name = student.name?.trim()
  const label = name && name !== student.id && !/^\d+$/.test(name)
    ? name
    : (name || student.id)
  return {
    label: student.year ? `${label} · ${student.year}` : label,
    value: student.id
  }
}))
const current = computed(() => portalModules.find(item => item.to === route.path) ?? portalModules[0])
const tabs = computed(() => portalModules.filter(item => primaryNav.includes(item.key as typeof primaryNav[number])))
const extra = computed(() => portalModules.filter(item => !primaryNav.includes(item.key as typeof primaryNav[number]) && item.key !== 'inicio'))
const schoolLabel = computed(() => {
  const host = data.value?.portalHost || ''
  if (!host) return t('shell.school')
  return host.replace(/\.siga\.edubox\.pt$/i, '').replace(/^node/i, 'Node ')
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  studentId.value = null
  await navigateTo('/')
}

async function onRefresh() {
  more.value = false
  await Promise.all([
    runPortalRefresh(),
    refreshBootstrap()
  ])
}

function active(to: string) {
  return route.path === to
}
</script>

<template>
  <div class="atmosphere min-h-dvh text-ink">
    <aside class="fixed inset-y-0 left-0 hidden w-[17rem] flex-col border-r border-[var(--color-line)] bg-paper px-6 py-7 lg:flex">
      <NuxtLink to="/app" class="font-display text-[2.25rem] leading-none tracking-[-0.04em]">siga</NuxtLink>
      <p class="mt-2 truncate text-sm ink-soft">{{ schoolLabel }}</p>
      <nav class="mt-10 space-y-0.5">
        <NuxtLink
          v-for="item in portalModules"
          :key="item.key"
          :to="item.to"
          class="nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
          :class="active(item.to) ? 'nav-active' : 'ink-soft'"
        >
          <UIcon :name="item.icon" class="size-5" />
          {{ t(`modules.${item.key}.label`) }}
        </NuxtLink>
      </nav>
      <div class="mt-auto space-y-5">
        <LocaleSwitch />
        <button
          type="button"
          class="pressable flex items-center gap-3 text-left text-sm ink-soft hover:text-ink"
          :disabled="refreshPending || pending"
          @click="onRefresh"
        >
          <UIcon name="i-lucide-refresh-cw" class="size-4" :class="(refreshPending || pending) ? 'animate-spin' : ''" />
          {{ t('module.refresh') }}
        </button>
        <button type="button" class="pressable text-left text-sm ink-soft hover:text-ink" @click="logout">{{ t('shell.logout') }}</button>
      </div>
    </aside>

    <div class="lg:pl-[17rem]">
      <header class="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[rgb(247_244_237_/_0.92)] px-4 py-3.5 backdrop-blur-xl">
        <div class="mx-auto flex max-w-3xl items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs tracking-[0.08em] text-muted uppercase lg:hidden">{{ schoolLabel }}</p>
            <h1 class="truncate font-display text-[1.75rem] leading-[1.1] tracking-[-0.03em]">{{ current ? t(`modules.${current.key}.label`) : t('modules.inicio.label') }}</h1>
          </div>
          <LocaleSwitch class="lg:hidden" />
          <USelect
            v-if="studentItems.length > 1"
            v-model="studentId"
            :items="studentItems"
            class="min-w-40 max-w-[14rem] sm:min-w-52 sm:max-w-[18rem]"
            :aria-label="t('shell.student')"
          />
          <p v-else-if="students[0]" class="max-w-[14rem] truncate text-right text-sm ink-soft sm:max-w-[18rem]" :title="students[0].name">
            {{ students[0].name }}
          </p>
        </div>
      </header>

      <main class="rise mx-auto max-w-3xl px-4 py-7 pb-28 lg:pb-14">
        <p v-if="pending" class="mb-5 text-sm ink-soft">{{ t('shell.opening') }}</p>
        <p v-else-if="data && !data.ok && data.message" class="mb-5 text-sm text-amber-800">{{ data.message }}</p>
        <slot />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-[rgb(247_244_237_/_0.94)] px-2 pt-2 backdrop-blur-xl lg:hidden"
      style="padding-bottom: calc(0.55rem + env(safe-area-inset-bottom)); --portal-tabbar: 4.75rem"
    >
      <ul class="grid grid-cols-5">
        <li v-for="item in tabs" :key="item.key">
          <NuxtLink :to="item.to" class="pressable flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px]" :class="active(item.to) ? 'bg-[rgb(28_28_28_/_0.06)] text-ink' : 'ink-soft'">
            <UIcon :name="item.icon" class="size-5" />
            <span class="max-w-full truncate">{{ t(`modules.${item.key}.nav`) }}</span>
          </NuxtLink>
        </li>
        <li>
          <button type="button" class="pressable flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] ink-soft" @click="more = true">
            <UIcon name="i-lucide-ellipsis" class="size-5" />
            {{ t('shell.more') }}
          </button>
        </li>
      </ul>
    </nav>

    <UDrawer v-model:open="more" :title="t('shell.moreTitle')">
      <template #body>
        <div class="space-y-1 pb-6">
          <NuxtLink
            v-for="item in extra"
            :key="item.key"
            :to="item.to"
            class="nav-item flex items-center gap-3 rounded-xl px-2 py-3"
            @click="more = false"
          >
            <UIcon :name="item.icon" class="size-5 text-ink" />
            <span>{{ t(`modules.${item.key}.label`) }}</span>
          </NuxtLink>
          <button
            type="button"
            class="nav-item pressable mt-4 flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left"
            :disabled="refreshPending || pending"
            @click="onRefresh"
          >
            <UIcon name="i-lucide-refresh-cw" class="size-5 text-ink" :class="(refreshPending || pending) ? 'animate-spin' : ''" />
            <span>{{ t('module.refresh') }}</span>
          </button>
          <button type="button" class="pressable w-full px-2 py-3 text-left text-sm ink-soft hover:text-ink" @click="logout">{{ t('shell.logout') }}</button>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
