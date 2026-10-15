export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app')) return

  // Right after login we already have a session cookie — skip an extra /api/auth/me round-trip.
  if (import.meta.client) {
    try {
      if (sessionStorage.getItem('siga_auth_ok') === '1') {
        sessionStorage.removeItem('siga_auth_ok')
        return
      }
    }
    catch {
      // private mode / blocked storage
    }
  }

  const me = await useRequestFetch()<{ authenticated: boolean }>('/api/auth/me')
  if (!me.authenticated) return navigateTo('/')
})
