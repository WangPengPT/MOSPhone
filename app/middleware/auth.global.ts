export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app')) return

  const me = await useRequestFetch()<{ authenticated: boolean }>('/api/auth/me')
  if (!me.authenticated) return navigateTo('/')
})
