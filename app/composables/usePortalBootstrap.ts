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

export function homeModuleKey(studentId?: string | null) {
  return `portal-module-inicio-${studentId || 'all'}-x`
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
