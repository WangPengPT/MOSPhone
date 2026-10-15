async function readAuth(fetchMe: typeof useRequestFetch) {
  try {
    return await fetchMe<{ authenticated: boolean }>('/api/auth/me', {
      credentials: 'include'
    })
  }
  catch {
    return { authenticated: false }
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app')) return

  const fetchMe = useRequestFetch()
  let me = await readAuth(fetchMe)

  // Android WebView can lag a beat before Set-Cookie from /login is visible.
  if (!me.authenticated && import.meta.client) {
    await new Promise(resolve => setTimeout(resolve, 120))
    me = await readAuth(fetchMe)
  }

  if (!me.authenticated) return navigateTo('/')
})
