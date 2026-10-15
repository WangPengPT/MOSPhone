<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t, locale } = useAppI18n()
const { message, showKey, showText, clear } = useNotice()

useHead({ title: computed(() => t('reset.title')) })

const route = useRoute()
const token = ref(typeof route.query.token === 'string' ? route.query.token : '')
const checked = ref(false)
const valid = ref(false)
const pending = ref(false)
const ok = ref(false)
const email = ref('')

const schema = computed(() => z.object({
  password: z.string().min(12, t('reset.min')),
  match: z.string().min(1, t('reset.confirmRequired'))
}).refine(value => value.password === value.match, { path: ['match'], message: t('reset.mismatch') })
  .refine(value => /[a-z]/.test(value.password) && /[A-Z]/.test(value.password) && /\d/.test(value.password) && /[^A-Za-z0-9]/.test(value.password), {
    path: ['password'],
    message: t('reset.complexity')
  }))

const state = reactive({ password: '', match: '' })

async function validate() {
  if (token.value.trim().length < 8) {
    showKey('reset.paste')
    return
  }
  pending.value = true
  clear()
  try {
    const result = await $fetch<{ ok: boolean, message?: string, email?: string }>('/api/auth/validate', {
      method: 'POST',
      body: { token: token.value.trim() }
    })
    checked.value = true
    valid.value = result.ok
    email.value = result.email || ''
    if (result.message) showText(result.message)
  }
  catch (error) {
    showText(errorText(error))
  }
  finally {
    pending.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema.value>>) {
  pending.value = true
  clear()
  try {
    const result = await $fetch<{ ok: boolean, message?: string }>('/api/auth/reset', {
      method: 'POST',
      body: { token: token.value.trim(), password: event.data.password }
    })
    ok.value = result.ok
    if (result.message) showText(result.message)
  }
  catch (error) {
    showText(errorText(error))
  }
  finally {
    pending.value = false
  }
}

if (token.value) await validate()
</script>

<template>
  <AuthFrame :kicker="t('reset.kicker')" :title="t('reset.heading')" :subtitle="t('reset.subtitle')">
    <p v-if="message" class="mb-4 rounded-xl px-4 py-3 text-sm whitespace-pre-line bg-[rgb(28_28_28_/_0.04)]" :class="ok || valid ? 'text-ink' : 'ink-soft'">{{ message }}</p>

    <form v-if="!valid" class="space-y-4" @submit.prevent="validate">
      <UFormField :label="t('reset.code')">
        <UInput v-model="token" class="w-full" size="lg" :placeholder="t('reset.codePlaceholder')" />
      </UFormField>
      <UButton type="submit" block size="lg" :label="t('reset.validate')" :loading="pending" />
      <NuxtLink to="/recuperar" class="block text-center text-sm ink-soft transition hover:text-ink">{{ t('reset.askNew') }}</NuxtLink>
    </form>

    <div v-else-if="ok" class="space-y-4">
      <UButton to="/" block size="lg" :label="t('reset.enter')" />
    </div>

    <UForm v-else :key="locale" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <p v-if="email" class="text-sm ink-soft">{{ t('reset.account', { email }) }}</p>
      <UFormField name="password" :label="t('reset.newPassword')">
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" size="lg" />
      </UFormField>
      <UFormField name="match" :label="t('reset.confirm')">
        <UInput v-model="state.match" type="password" autocomplete="new-password" class="w-full" size="lg" />
      </UFormField>
      <UButton type="submit" block size="lg" :label="t('reset.save')" :loading="pending" />
    </UForm>
  </AuthFrame>
</template>
