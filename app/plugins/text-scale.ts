export default defineNuxtPlugin(() => {
  const { scale } = useTextScale()

  useHead({
    htmlAttrs: {
      class: computed(() => (scale.value === 'large' ? 'siga-text-large' : undefined))
    }
  })

  if (import.meta.client) {
    watch(scale, (value) => {
      document.documentElement.classList.toggle('siga-text-large', value === 'large')
    }, { immediate: true })
  }
})
