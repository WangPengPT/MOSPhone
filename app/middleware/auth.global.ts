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

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (!to.path.startsWith('/app')) return

  // Bottom-tab / sidebar switches stay inside /app — do not re-hit /api/auth/me.
  if (from.path.startsWith('/app')) return

  const sessionOk = useState('siga-app-session', () => false)
  if (sessionOk.value) return

  const fetchMe = useRequestFetch()
  let me = await readAuth(fetchMe)

  // Android WebView can lag a beat before Set-Cookie from /login is visible.
  if (!me.authenticated && import.meta.client && (from.path === '/' || from.path === '')) {
    await new Promise(resolve => setTimeout(resolve, 120))
    me = await readAuth(fetchMe)
  }

  if (!me.authenticated) {
    sessionOk.value = false
    return navigateTo('/')
  }

  sessionOk.value = true
})
