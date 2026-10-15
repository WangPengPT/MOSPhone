<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t, locale } = useAppI18n()
const { message, showKey, showText, clear } = useNotice()
const ok = ref(false)

useHead({ title: computed(() => t('recover.title')) })

const schema = computed(() => z.object({
  email: z.email(t('recover.emailInvalid'))
}))
const state = reactive({ email: '' })
const pending = ref(false)
const captcha = ref('')

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema.value>>) {
  if (!captcha.value) {
    showKey('recover.robot')
    ok.value = false
    return
  }
  pending.value = true
  clear()
  try {
    const result = await $fetch<{ ok: boolean, message?: string }>('/api/auth/recover', {
      method: 'POST',
      body: { email: event.data.email, recaptcha: captcha.value }
    })
    ok.value = result.ok
    if (result.message) showText(result.message)
  }
  catch (error) {
    ok.value = false
    showText(errorText(error))
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthFrame :kicker="t('recover.kicker')" :title="t('recover.heading')" :subtitle="t('recover.subtitle')">
    <p v-if="message" class="mb-4 rounded-xl px-4 py-3 text-sm whitespace-pre-line" :class="ok ? 'bg-[rgb(28_28_28_/_0.04)] text-ink' : 'bg-[rgb(28_28_28_/_0.04)] ink-soft'">{{ message }}</p>
    <UForm :key="locale" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField name="email" :label="t('recover.email')">
        <UInput v-model="state.email" type="email" autocomplete="email" :placeholder="t('recover.emailPlaceholder')" class="w-full" size="lg" />
      </UFormField>
      <ClientOnly>
        <RecaptchaBox :key="locale" @resolved="captcha = $event" />
      </ClientOnly>
      <UButton type="submit" block size="lg" :label="t('recover.submit')" :loading="pending" />
      <NuxtLink to="/" class="block text-center text-sm ink-soft transition hover:text-ink">{{ t('recover.back') }}</NuxtLink>
    </UForm>
  </AuthFrame>
</template>
