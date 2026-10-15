<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { BootstrapPayload, LoginResponse, ModulePayload } from '#shared/siga'
import { usefulLinks, videos } from '#shared/siga'

const { t, locale } = useAppI18n()
const { message, showKey, showText, clear } = useNotice()

useHead({ title: computed(() => t('login.title')) })

const route = useRoute()
const flow = typeof route.query.flow === 'string' ? route.query.flow : ''
const linkToken = typeof route.query.token === 'string' ? route.query.token : ''

const { data: me } = await useFetch('/api/auth/me')
if (me.value?.authenticated) await navigateTo('/app')

const sync = ref<{ source: string, target: string } | null>(null)
const bootText = ref('')
const bootKey = ref('')
const bootError = computed(() => bootText.value || (bootKey.value ? t(bootKey.value) : ''))
const syncNote = computed(() => sync.value
  ? t('login.sync', {
      source: sync.value.source || t('login.sourceFallback'),
      target: sync.value.target || t('login.targetFallback')
    })
  : '')

if (flow === 'auto-login' && linkToken) {
  try {
    const result = await $fetch<{ ok: boolean, to?: string, message?: string }>('/api/auth/educonnect', {
      method: 'POST',
      body: { flow, token: linkToken }
    })
    if (result.ok && result.to) await navigateTo(result.to)
    else if (result.message) bootText.value = result.message
    else bootKey.value = 'login.autoFailed'
  }
  catch (error) {
    bootText.value = errorText(error)
  }
}
else if (flow === 'sync' && linkToken) {
  try {
    const result = await $fetch<{ ok: boolean, project?: Record<string, unknown> | null, message?: string }>('/api/auth/educonnect', {
      method: 'POST',
      body: { flow, token: linkToken }
    })
    if (result.ok) {
      const source = result.project?.sourcePlatformName
      const target = result.project?.targetProjectName
      sync.value = {
        source: typeof source === 'string' ? source : '',
        target: typeof target === 'string' ? target : ''
      }
    }
    else bootText.value = result.message || ''
  }
  catch (error) {
    bootText.value = errorText(error)
  }
}

const schema = computed(() => z.object({
  username: z.string().trim().min(1, t('login.userRequired')),
  password: z.string().min(4, t('login.passwordShort'))
}))
const state = reactive({ username: '', password: '' })
const USER_KEY = 'siga_username'
const REMEMBER_KEY = 'siga_remember'
const SECRET_KEY = 'siga_secret'
const remember = ref(true)
const pending = ref(false)
const entering = ref(false)
const busy = computed(() => pending.value || entering.value)
const needCaptcha = ref(false)
const captcha = ref('')
const captchaKey = ref(0)
const video = ref<{ key: string, url: string } | null>(null)
const first = ref<{ idUserCentral: string, email: string | null } | null>(null)
const nextPassword = reactive({ password: '', match: '' })
const strength = computed(() => scorePassword(nextPassword.password))

onMounted(async () => {
  if (localStorage.getItem(REMEMBER_KEY) === '0') remember.value = false
  const savedUser = localStorage.getItem(USER_KEY)
  if (savedUser) state.username = savedUser
  await fillSavedPassword()
})

function encodeSecret(value: string) {
  try {
    return btoa(unescape(encodeURIComponent(value)))
  }
  catch {
    return ''
  }
}

function decodeSecret(value: string) {
  try {
    return decodeURIComponent(escape(atob(value)))
  }
  catch {
    return ''
  }
}

function readLocalSecret() {
  const raw = localStorage.getItem(SECRET_KEY)
  if (!raw) return ''
  return decodeSecret(raw)
}

function writeLocalSecret(password: string) {
  const encoded = encodeSecret(password)
  if (!encoded) return
  localStorage.setItem(SECRET_KEY, encoded)
}

function clearLocalSecret() {
  localStorage.removeItem(SECRET_KEY)
}

async function fillSavedPassword() {
  const local = readLocalSecret()
  if (local) {
    state.password = local
    return
  }
  const credentials = navigator.credentials
  if (!credentials?.get) return
  try {
    const saved = await credentials.get({ password: true, mediation: 'silent' })
    if (!saved || saved.type !== 'password' || !('password' in saved)) return
    const password = saved.password
    if (typeof saved.id === 'string' && saved.id) state.username = saved.id
    if (typeof password === 'string' && password) state.password = password
  }
  catch {
    // Optional browser password store.
  }
}

async function keepPassword(id: string, password: string) {
  writeLocalSecret(password)
  const PasswordCredentialCtor = (window as Window & {
    PasswordCredential?: new (data: { id: string, password: string, name?: string }) => Credential
  }).PasswordCredential
  if (!PasswordCredentialCtor || !navigator.credentials?.store) return
  try {
    await navigator.credentials.store(new PasswordCredentialCtor({ id, password, name: id }))
  }
  catch {
    // Local secret is enough when the browser declines.
  }
}

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema.value>>) {
  if (busy.value) return
  if (needCaptcha.value && !captcha.value) {
    showKey('login.robot')
    return
  }
  pending.value = true
  clear()
  try {
    const result = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        username: event.data.username,
        password: event.data.password,
        recaptcha: captcha.value,
        remember: remember.value,
        syncToken: flow === 'sync' ? linkToken : undefined
      }
    })
    if (result.ok && result.to) {
      entering.value = true
      localStorage.setItem(REMEMBER_KEY, remember.value ? '1' : '0')
      if (remember.value) {
        localStorage.setItem(USER_KEY, event.data.username)
        writeLocalSecret(event.data.password)
        void keepPassword(event.data.username, event.data.password)
      }
      else {
        localStorage.removeItem(USER_KEY)
        clearLocalSecret()
      }
      try {
        sessionStorage.setItem('siga_auth_ok', '1')
      }
      catch {
        // ignore
      }
      // Prefetch in background; never block navigation.
      void warmAppEntry()
      try {
        await navigateTo(result.to)
      }
      catch (error) {
        entering.value = false
        pending.value = false
        showText(errorText(error))
      }
      return
    }
    if (result.firstLogin && result.idUserCentral) {
      first.value = { idUserCentral: result.idUserCentral, email: result.email ?? null }
      state.password = ''
      return
    }
    if (result.message) showText(result.message)
    else showKey('login.failed')
    if (result.captcha) {
      needCaptcha.value = true
      captcha.value = ''
      captchaKey.value += 1
    }
  }
  catch (error) {
    showText(errorText(error))
  }
  finally {
    if (!entering.value) pending.value = false
  }
}

async function warmAppEntry() {
  const boot = await $fetch<BootstrapPayload>('/api/portal/bootstrap', {
    signal: AbortSignal.timeout(8000)
  }).catch(() => null)
  if (!boot?.ok) return
  warmPortalBootstrap(boot)
  const firstStudent = boot.students?.[0]?.id || null
  if (firstStudent) useStudentId().value = firstStudent
  const home = await $fetch<ModulePayload>('/api/portal/module', {
    query: {
      module: 'inicio',
      studentId: firstStudent || undefined
    },
    signal: AbortSignal.timeout(8000)
  }).catch(() => null)
  if (home?.ok) warmPortalModule(homeModuleKey(firstStudent), home)
}

async function setFirstPassword() {
  if (!first.value) return
  if (nextPassword.password !== nextPassword.match) {
    showKey('login.mismatch')
    return
  }
  if (strength.value < 1) {
    showKey('login.weak')
    return
  }
  pending.value = true
  clear()
  try {
    const result = await $fetch<{ ok: boolean, message?: string }>('/api/auth/first-password', {
      method: 'POST',
      body: { idUserCentral: first.value.idUserCentral, password: nextPassword.password }
    })
    if (result.message) showText(result.message)
    if (result.ok) {
      first.value = null
      nextPassword.password = ''
      nextPassword.match = ''
    }
  }
  catch (error) {
    showText(errorText(error))
  }
  finally {
    pending.value = false
  }
}

function scorePassword(value: string) {
  let score = 0
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return score / 4
}
</script>

<template>
  <AuthFrame :kicker="t('login.kicker')" :title="t('login.heading')" :subtitle="t('login.subtitle')">
    <p v-if="syncNote" class="mb-4 text-sm text-ink">{{ syncNote }}</p>
    <p v-if="bootError" class="mb-4 text-sm whitespace-pre-line text-red-600">{{ bootError }}</p>
    <p v-if="message" class="mb-4 text-sm whitespace-pre-line ink-soft">{{ message }}</p>

    <form v-if="first" class="space-y-4" @submit.prevent="setFirstPassword">
      <p class="text-sm ink-soft">{{ t('login.firstLead', { email: first.email || t('login.schoolEmail') }) }}</p>
      <UFormField :label="t('login.newPassword')">
        <UInput v-model="nextPassword.password" type="password" autocomplete="new-password" class="w-full" size="lg" />
      </UFormField>
      <div class="h-1.5 overflow-hidden rounded-full bg-[rgb(28_28_28_/_0.06)]">
        <div class="h-full rounded-full bg-ink transition-all" :style="{ width: `${Math.max(strength * 100, 6)}%` }" />
      </div>
      <UFormField :label="t('login.confirm')">
        <UInput v-model="nextPassword.match" type="password" autocomplete="new-password" class="w-full" size="lg" />
      </UFormField>
      <UButton type="submit" block size="lg" :label="t('login.setPassword')" :loading="pending" />
      <button type="button" class="pressable text-sm ink-soft hover:text-ink" @click="first = null">{{ t('login.back') }}</button>
    </form>

    <div v-else class="relative">
      <div
        v-if="entering"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-[rgb(247_244_237_/_0.92)] px-4 text-center backdrop-blur-sm"
      >
        <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-ink" />
        <p class="font-display text-xl tracking-[-0.02em]">{{ t('login.entering') }}</p>
        <p class="text-sm ink-soft">{{ t('login.enteringHint') }}</p>
      </div>

      <UForm
        :key="locale"
        :schema="schema"
        :state="state"
        class="space-y-5"
        :class="entering ? 'pointer-events-none opacity-40' : ''"
        @submit="onSubmit"
      >
        <UFormField name="username" :label="t('login.username')">
          <UInput
            v-model="state.username"
            name="username"
            autocomplete="username"
            :placeholder="t('login.usernamePlaceholder')"
            class="w-full"
            size="lg"
            :disabled="busy"
          />
        </UFormField>
        <UFormField name="password" :label="t('login.password')">
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            :placeholder="t('login.passwordPlaceholder')"
            class="w-full"
            size="lg"
            :disabled="busy"
          />
        </UFormField>
        <UCheckbox v-model="remember" :label="t('login.remember')" :description="t('login.rememberHint')" :disabled="busy" />
        <ClientOnly>
          <RecaptchaBox v-if="needCaptcha" :key="`${locale}-${captchaKey}`" @resolved="captcha = $event" />
        </ClientOnly>
        <UButton
          type="submit"
          block
          size="lg"
          :label="entering ? t('login.entering') : t('login.submit')"
          :loading="busy"
          :disabled="busy"
        />
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <NuxtLink
            to="/recuperar"
            class="underline decoration-[rgb(28_28_28_/_0.25)] underline-offset-4 transition hover:decoration-ink"
            :class="busy ? 'pointer-events-none opacity-40' : ''"
          >{{ t('login.recover') }}</NuxtLink>
          <NuxtLink
            to="/recuperar/nova"
            class="ink-soft transition hover:text-ink"
            :class="busy ? 'pointer-events-none opacity-40' : ''"
          >{{ t('login.haveCode') }}</NuxtLink>
        </div>
      </UForm>
    </div>

    <template #below>
      <div class="min-w-0 space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="item in videos"
            :key="item.url"
            type="button"
            class="chip chip-off px-3 py-1.5"
            @click="video = item"
          >
            {{ t(`videos.${item.key}`) }}
          </button>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm ink-soft">
          <a v-for="link in usefulLinks.slice(0, 3)" :key="link.href" :href="link.href" target="_blank" rel="noreferrer" class="hover:text-ink">{{ t(`links.${link.key}`) }}</a>
        </div>
      </div>
    </template>
  </AuthFrame>

  <UModal :open="Boolean(video)" :title="video ? t(`videos.${video.key}`) : t('login.videoFallback')" @update:open="(value) => { if (!value) video = null }">
    <template #body>
      <div v-if="video" class="aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe :src="video.url" class="h-full w-full" :title="t('login.videoFrame')" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen />
      </div>
    </template>
  </UModal>
</template>
