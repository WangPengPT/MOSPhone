export default defineNuxtPlugin(() => {
  const { htmlLang, t } = useAppI18n()
  useHead({
    htmlAttrs: { lang: htmlLang },
    meta: [{ key: 'description', name: 'description', content: computed(() => t('meta.description')) }]
  })
})
