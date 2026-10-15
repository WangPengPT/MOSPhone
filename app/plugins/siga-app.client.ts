import { isSigaApp } from '~/utils/native'

export default defineNuxtPlugin(() => {
  if (!isSigaApp()) return
  document.documentElement.classList.add('siga-app')
})
