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

function studentDisplayName(student: { id: string, name?: string | null }) {
  const name = student.name?.trim()
  if (name && name !== student.id && !/^\d+$/.test(name)) return name
  return name || student.id
}

/** Closed select: keep at most 5 characters, then ellipsis. */
function shortName(value: string, max = 5) {
  const text = value.trim()
  if ([...text].length <= max) return text
  return `${[...text].slice(0, max).join('')}…`
}

const studentItems = computed(() => students.value.map((student) => {
  const label = studentDisplayName(student)
  return {
    label: student.year ? `${label} · ${student.year}` : label,
    value: student.id,
    short: shortName(label)
  }
}))

function studentShortById(id: unknown) {
  const item = studentItems.value.find(row => row.value === id)
  if (item) return item.short
  const student = students.value.find(row => row.id === id)
  return student ? shortName(studentDisplayName(student)) : ''
}
const current = computed(() => portalModules.find(item => item.to === route.path) ?? portalModules[0])
const tabs = computed(() => portalModules.filter(item => primaryNav.includes(item.key as typeof primaryNav[number])))
/** All modules not on the bottom bar (bookings, card, menus, …). */
const extra = computed(() => portalModules.filter(item => !primaryNav.includes(item.key as typeof primaryNav[number])))
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
  <div class="atmosphere flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden text-ink lg:block lg:h-auto lg:max-h-none lg:min-h-dvh lg:overflow-visible">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-[var(--color-line)] bg-paper px-6 py-7 lg:flex">
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

    <div class="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-[17rem]">
      <header
        class="z-20 shrink-0 border-b border-[var(--color-line)] bg-[rgb(247_244_237_/_0.92)] px-3 pb-2.5 backdrop-blur-xl sm:px-4 sm:pb-3"
        style="padding-top: calc(0.5rem + var(--safe-top))"
      >
        <div class="mx-auto flex max-w-3xl min-w-0 items-center gap-2 sm:gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs tracking-[0.08em] text-muted uppercase lg:hidden">{{ schoolLabel }}</p>
            <h1 class="truncate font-display text-[1.5rem] leading-[1.1] tracking-[-0.03em] sm:text-[1.75rem]">
              {{ current ? t(`modules.${current.key}.label`) : t('modules.inicio.label') }}
            </h1>
          </div>
          <LocaleSwitch class="shrink-0 lg:hidden" />
          <USelect
            v-if="studentItems.length > 1"
            v-model="studentId"
            :items="studentItems"
            size="xs"
            class="w-auto max-w-[7.5rem] shrink-0"
            :ui="{
              base: 'px-2 gap-1',
              value: 'text-xs tabular-nums',
              trailingIcon: 'size-3.5 opacity-60',
              content: 'min-w-52 max-w-[min(20rem,90vw)]',
              item: 'text-sm'
            }"
            :aria-label="t('shell.student')"
          >
            <template #default="{ modelValue }">
              {{ studentShortById(modelValue) }}
            </template>
          </USelect>
          <p
            v-else-if="students[0]"
            class="shrink-0 text-right text-xs ink-soft sm:text-sm"
            :title="studentDisplayName(students[0])"
          >
            {{ shortName(studentDisplayName(students[0])) }}
          </p>
        </div>
      </header>

      <main class="rise mx-auto w-full min-h-0 min-w-0 max-w-3xl flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-5 sm:px-4 sm:py-6 lg:py-7 lg:pb-14">
        <p v-if="pending" class="mb-5 text-sm ink-soft">{{ t('shell.opening') }}</p>
        <p v-else-if="data && !data.ok && data.message" class="mb-5 text-sm text-amber-800">{{ data.message }}</p>
        <slot />
      </main>

      <nav
        class="z-30 shrink-0 border-t border-[var(--color-line)] bg-[rgb(247_244_237_/_0.96)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden"
        style="--portal-tabbar: 4.25rem"
      >
        <ul class="mx-auto grid max-w-lg grid-cols-4 gap-1">
          <li v-for="item in tabs" :key="item.key" class="min-w-0">
            <NuxtLink
              :to="item.to"
              class="pressable flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]"
              :class="active(item.to) ? 'bg-[rgb(28_28_28_/_0.06)] text-ink' : 'ink-soft'"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" />
              <span class="max-w-full truncate">{{ t(`modules.${item.key}.nav`) }}</span>
            </NuxtLink>
          </li>
          <li class="min-w-0">
            <button
              type="button"
              class="pressable flex w-full flex-col items-center gap-1 rounded-xl py-2 text-[11px]"
              :class="more || extra.some(item => active(item.to)) ? 'bg-[rgb(28_28_28_/_0.06)] text-ink' : 'ink-soft'"
              @click="more = true"
            >
              <UIcon name="i-lucide-ellipsis" class="size-5 shrink-0" />
              <span class="max-w-full truncate">{{ t('shell.more') }}</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>

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
