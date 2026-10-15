<script setup lang="ts">
const { t } = useAppI18n()
useHead({ title: computed(() => t('initialize.title')) })

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const messageKey = ref(token ? 'initialize.checking' : 'initialize.missing')
const messageText = ref('')
const message = computed(() => messageText.value || t(messageKey.value))

if (token) {
  try {
    const result = await $fetch<{ ok: boolean, to?: string, message?: string }>('/api/auth/initialize', {
      method: 'POST',
      body: { token }
    })
    if (result.ok && result.to) await navigateTo(result.to)
    else if (result.message) messageText.value = result.message
    else messageKey.value = 'initialize.failed'
  }
  catch (error) {
    messageText.value = errorText(error)
  }
}
</script>

<template>
  <AuthFrame :kicker="t('initialize.kicker')" :title="t('initialize.heading')" :subtitle="t('initialize.subtitle')">
    <p class="text-sm whitespace-pre-line ink-soft">{{ message }}</p>
    <UButton to="/" class="mt-6" color="neutral" variant="outline" :label="t('initialize.back')" />
  </AuthFrame>
</template>
