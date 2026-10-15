import type { BootstrapPayload, ModulePayload } from '#shared/siga'

const empty: BootstrapPayload = {
  ok: false,
  message: '',
  portalHost: null,
  email: null,
  students: []
}

const BOOT_KEY = 'portal-bootstrap-v9'
let warmBoot: BootstrapPayload | null = null
const warmModules = new Map<string, ModulePayload>()

export function warmPortalBootstrap(payload: BootstrapPayload) {
  warmBoot = payload
}

export function warmPortalModule(key: string, payload: ModulePayload) {
  warmModules.set(key, payload)
}

export function takeWarmPortalModule(key: string) {
  const payload = warmModules.get(key) || null
  if (payload) warmModules.delete(key)
  return payload
}

export function peekWarmPortalModule(key: string) {
  return warmModules.get(key) || null
}

export function homeModuleKey(studentId?: string | null) {
  return moduleCacheKey('inicio', studentId)
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function moduleCacheKey(module: string, studentId?: string | null, opts?: { month?: string, subUnitId?: string | null }) {
  if (module === 'marcacoes') {
    return `portal-module-${module}-${studentId || 'all'}-${opts?.month || currentMonthKey()}-${opts?.subUnitId || 'auto'}`
  }
  return `portal-module-${module}-${studentId || 'all'}-x`
}

export function usePortalBootstrap() {
  return useAsyncData<BootstrapPayload>(BOOT_KEY, async () => {
    if (warmBoot) {
      const payload = warmBoot
      warmBoot = null
      return payload
    }
    return $fetch<BootstrapPayload>('/api/portal/bootstrap').catch(() => empty)
  }, { server: false })
}

/** Warm primary tabs so bottom-nav switches feel instant. */
export function prefetchPortalModules(modules: string[], studentId?: string | null) {
  if (!import.meta.client) return
  const nuxtApp = useNuxtApp()
  const month = currentMonthKey()
  for (const module of modules) {
    const key = moduleCacheKey(module, studentId, { month })
    if (nuxtApp.payload.data[key] || warmModules.has(key)) continue
    void $fetch<ModulePayload>('/api/portal/module', {
      query: {
        module,
        studentId: studentId || undefined,
        part: module === 'cartao' ? 'summary' : undefined,
        month: module === 'marcacoes' ? month : undefined
      }
    }).then((payload) => {
      nuxtApp.payload.data[key] = payload
      warmPortalModule(key, payload)
    }).catch(() => {})
  }
}
