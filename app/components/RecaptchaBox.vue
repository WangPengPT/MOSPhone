<script setup lang="ts">
const emit = defineEmits<{
  resolved: [token: string]
  failed: []
}>()
const config = useRuntimeConfig()
const { locale, t } = useAppI18n()
const host = ref<HTMLElement | null>(null)
const failed = ref(false)
const ready = ref(false)

const hl = computed(() => locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt' : 'en')

type Grecaptcha = {
  render: (el: HTMLElement, options: Record<string, unknown>) => number
  reset: (id?: number) => void
}

function getGrecaptcha() {
  return (window as Window & { grecaptcha?: Grecaptcha }).grecaptcha
}

function render() {
  const grecaptcha = getGrecaptcha()
  if (!host.value || !grecaptcha?.render) return
  host.value.replaceChildren()
  failed.value = false
  try {
    grecaptcha.render(host.value, {
      sitekey: config.public.recaptchaSiteKey,
      callback: (token: string) => {
        ready.value = true
        emit('resolved', token)
      },
      'expired-callback': () => {
        ready.value = false
        emit('resolved', '')
      },
      'error-callback': () => {
        failed.value = true
        ready.value = false
        emit('failed')
        emit('resolved', '')
      }
    })
  }
  catch {
    failed.value = true
    emit('failed')
  }
}

function mountCaptcha() {
  if (!import.meta.client) return
  failed.value = false
  ready.value = false
  const win = window as Window & { grecaptcha?: Grecaptcha, [key: string]: unknown }
  const existing = document.querySelector('script[data-siga-recaptcha]') as HTMLScriptElement | null
  if (existing?.dataset.hl === hl.value && win.grecaptcha?.render) {
    void nextTick(() => render())
    return
  }
  existing?.remove()
  delete win.grecaptcha
  const callbackName = `sigaCaptcha_${Math.random().toString(36).slice(2)}`
  win[callbackName] = () => {
    void nextTick(() => render())
  }
  const script = document.createElement('script')
  script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit&hl=${hl.value}`
  script.async = true
  script.dataset.sigaRecaptcha = 'true'
  script.dataset.hl = hl.value
  script.onerror = () => {
    failed.value = true
    emit('failed')
  }
  document.head.appendChild(script)
}

onMounted(() => {
  void nextTick(() => mountCaptcha())
})

watch(hl, () => {
  if (host.value) mountCaptcha()
})
</script>

<template>
  <div class="space-y-2">
    <div ref="host" class="min-h-[78px] overflow-hidden" />
    <p v-if="failed" class="text-xs text-amber-800">{{ t('auth.captchaFailed') }}</p>
  </div>
</template>
