export const Result = {
  Error: 0,
  InvalidToken: 1,
  Success: 2,
  NoData: 3,
  Invoice: 4,
  Requisition: 5,
  FirstLogin: 6,
  DuplicatedData: 7
} as const

export interface SigaEnvelope<T = unknown> {
  resultObject: T
  isSuccessful?: boolean
  resultOperation: number
  message?: string | null
}

export interface LoginObject {
  redirect?: string | null
  idUserCentral?: string | null
  firstLogin?: boolean
  email?: string | null
  serverIP?: string | null
  node?: string | null
  requiresAndIsMissingCaptcha?: boolean
}

export interface SigaSession {
  idUserCentral?: string | null
  email?: string | null
  redirect?: string | null
  portalHost?: string | null
  schoolAuthToken?: string | null
  schoolUser?: {
    IdUser?: number
    IdUserType?: number
    IdSchool?: number
    IdSchoolYear?: number
    IdProject?: number
    AuthToken?: string
    SchoolYearDescription?: string
    UserExtra?: {
      DisplayName?: string
      UserName?: string
      Email?: string
      UserType?: string
    } | null
    MasterMenu?: Array<{ Id?: number, Path?: string, Description?: string }>
  } | null
}

export interface Student {
  id: string
  name: string
  year?: string | null
  description?: string | null
  balance?: number | string | null
  nif?: string | null
  cardNumber?: string | null
  unread?: number | null
}

export interface AuthMe {
  authenticated: boolean
  email: string | null
  portalHost: string | null
}

export interface LoginResponse {
  ok: boolean
  firstLogin?: boolean
  idUserCentral?: string | null
  email?: string | null
  captcha?: boolean
  message?: string
  to?: string
}

export interface ModulePayload {
  ok: boolean
  message?: string
  payload: unknown
  canTopUp: boolean
  canSaveDays: boolean
  source?: string | null
  needRelogin?: boolean
}

export interface BootstrapPayload {
  ok: boolean
  message?: string
  portalHost: string | null
  email: string | null
  students: Student[]
}

export interface PortalModule {
  key: string
  to: string
  label: string
  description: string
  icon: string
  keywords: string[]
}

export const portalModules: PortalModule[] = [
  {
    key: 'inicio',
    to: '/app',
    label: 'Início',
    description: 'Educandos, saldo e atalhos do dia.',
    icon: 'i-lucide-house',
    keywords: ['home', 'inicio', 'dashboard', 'educando', 'aluno', 'resumo', 'summary', 'encarregado']
  },
  {
    key: 'pessoal',
    to: '/app/pessoal',
    label: 'Área pessoal',
    description: 'Os seus dados e a palavra-passe.',
    icon: 'i-lucide-user-round',
    keywords: ['pessoal', 'perfil', 'profile', 'utilizador', 'dados', 'password', 'palavra']
  },
  {
    key: 'candidaturas',
    to: '/app/candidaturas',
    label: 'Candidaturas',
    description: 'Serviços abertos e encerrados pelo município.',
    icon: 'i-lucide-file-badge',
    keywords: ['candidat']
  },
  {
    key: 'cartao',
    to: '/app/cartao',
    label: 'Cartão escolar',
    description: 'Saldo, movimentos, carregamentos e faturas.',
    icon: 'i-lucide-wallet',
    keywords: ['cartao', 'wallet', 'unicard', 'saldo', 'carreg', 'movimento']
  },
  {
    key: 'ementas',
    to: '/app/ementas',
    label: 'Ementas',
    description: 'Refeições da semana e do mês.',
    icon: 'i-lucide-utensils',
    keywords: ['ementa', 'menu', 'refeic']
  },
  {
    key: 'marcacoes',
    to: '/app/marcacoes',
    label: 'Marcações',
    description: 'Refeições, prolongamento e assiduidade.',
    icon: 'i-lucide-calendar-check',
    keywords: ['marcac', 'requisi', 'assiduid', 'prolong']
  },
  {
    key: 'notificacoes',
    to: '/app/notificacoes',
    label: 'Notificações',
    description: 'Avisos enviados por email ou SMS.',
    icon: 'i-lucide-bell',
    keywords: ['notific', 'mensagem', 'aviso', 'sms']
  },
  {
    key: 'pagamentos',
    to: '/app/pagamentos',
    label: 'Pagamentos',
    description: 'Consumos, movimentos e faturas.',
    icon: 'i-lucide-receipt',
    keywords: ['pagament', 'fatura', 'recibo', 'consumo', 'movimento']
  },
  {
    key: 'portaria',
    to: '/app/portaria',
    label: 'Portaria',
    description: 'Entradas e saídas, autorizadas ou negadas.',
    icon: 'i-lucide-door-open',
    keywords: ['portaria', 'entrada', 'saida', 'acesso']
  }
]

export const primaryNav = ['inicio', 'marcacoes', 'cartao', 'ementas'] as const

export const videos = [
  { key: 'bookings', url: 'https://www.youtube.com/embed/UNm-Aos9VxY' },
  { key: 'wallet', url: 'https://www.youtube.com/embed/5C7kAastkuo' },
  { key: 'password', url: 'https://www.youtube.com/embed/P3dWPrvDw90' }
]

export const usefulLinks = [
  { key: 'manual', href: 'https://assets.edubox.pt/siga/documents/SIGA_manual_acesso.pdf' },
  { key: 'privacy', href: 'https://edubox.pt/politica-de-privacidade' },
  { key: 'terms', href: 'https://edubox.pt/documentos/termos-e-condicoes-siga' },
  { key: 'faq', href: 'https://edubox.pt/documentos/perguntas-frequentes-siga' },
  { key: 'ticket', href: 'https://helpdesk.edubox.pt/ticket/opentype.php?type=siga' },
  { key: 'ticketStatus', href: 'https://helpdesk.edubox.pt/ticket/viewstatus.php' }
]
