<script setup lang="ts">
const emit = defineEmits<{ resolved: [token: string] }>()
const config = useRuntimeConfig()
const { locale } = useAppI18n()
const host = ref<HTMLElement | null>(null)

const hl = computed(() => locale.value === 'zh' ? 'zh-CN' : locale.value === 'pt' ? 'pt' : 'en')

function render() {
  const win = window as Window & { grecaptcha?: { render: (el: HTMLElement, options: object) => void } }
  if (!host.value || !win.grecaptcha?.render) return
  host.value.replaceChildren()
  win.grecaptcha.render(host.value, {
    sitekey: config.public.recaptchaSiteKey,
    callback: (token: string) => emit('resolved', token)
  })
}

function mountCaptcha() {
  const win = window as Window & { grecaptcha?: { render: (el: HTMLElement, options: object) => void }, [key: string]: unknown }
  const existing = document.querySelector('script[data-siga-recaptcha]') as HTMLScriptElement | null
  if (existing?.dataset.hl === hl.value && win.grecaptcha?.render) {
    render()
    return
  }
  existing?.remove()
  delete win.grecaptcha
  const callbackName = `sigaCaptcha_${Math.random().toString(36).slice(2)}`
  win[callbackName] = () => render()
  const script = document.createElement('script')
  script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit&hl=${hl.value}`
  script.async = true
  script.dataset.sigaRecaptcha = 'true'
  script.dataset.hl = hl.value
  document.head.appendChild(script)
}

onMounted(mountCaptcha)
watch(hl, () => {
  if (host.value) mountCaptcha()
})
</script>

<template>
  <div ref="host" class="min-h-[78px] overflow-hidden" />
</template>
