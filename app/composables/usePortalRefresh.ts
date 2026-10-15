type RefreshHandler = () => void | Promise<void>

// Keep the callback off useState — Nuxt cannot serialize functions into the SSR payload.
let refreshHandler: RefreshHandler | null = null

export function usePortalRefresh() {
  const pending = useState('portal-refresh-pending', () => false)

  function register(fn: RefreshHandler) {
    if (import.meta.server) return
    refreshHandler = fn
    onScopeDispose(() => {
      if (refreshHandler === fn) refreshHandler = null
    })
  }

  async function refresh() {
    pending.value = true
    try {
      if (refreshHandler) await refreshHandler()
      else await refreshNuxtData()
    }
    finally {
      pending.value = false
    }
  }

  return {
    register,
    refresh,
    pending,
    hasHandler: computed(() => Boolean(refreshHandler))
  }
}
