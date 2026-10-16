import type { Messages } from './en'

export const pt = {
  meta: {
    description: 'Área do encarregado de educação, ligada ao SIGA, pensada para o telemóvel.'
  },
  errors: {
    request: 'Não foi possível concluir o pedido.'
  },
  api: {
    credentials: 'Indique o utilizador e a palavra-passe.',
    firstAccess: 'É o primeiro acesso. Defina uma palavra-passe para continuar.',
    signIn: 'Inicie sessão para continuar.',
    unknownModule: 'Módulo desconhecido.',
    incomplete: 'Ligação incompleta.',
    unknownFlow: 'Fluxo desconhecido.',
    account: 'Não foi possível identificar a conta.',
    weak: 'Use pelo menos 12 caracteres, com maiúsculas, minúsculas, números e um símbolo.',
    passwordSet: 'Palavra-passe definida. Entre com o utilizador e a nova palavra-passe.',
    passwordChanged: 'Palavra-passe alterada. Já pode entrar.',
    badCode: 'O código de recuperação não é válido.',
    codeOk: 'Código válido. Já pode definir a nova palavra-passe.',
    email: 'Indique um email válido.',
    robot: 'Confirme que não é um robot.',
    recoverSent: 'Pedido enviado. Abra o email e use o código, ou o link, para definir a nova palavra-passe.',
    portalHidden: 'O portal da escola não expôs este serviço nesta sessão.',
    rejected: 'Destino recusado.',
    insecure: 'Só são permitidas ligações seguras.',
    outside: 'Destino fora do portal da escola.',
    tooLarge: 'A resposta do portal era demasiado grande.',
    refused: 'O portal recusou o pedido.',
    unreachable: 'Não foi possível contactar o portal da escola.',
    redirect: 'O portal da escola não concluiu o redirecionamento.',
    session: 'Falta a chave de sessão no Worker. Defina NUXT_SESSION_PASSWORD (≥32) em Cloudflare → este Worker → Settings → Variables and Secrets (o .env local não serve para a app).',
    sigaDown: 'O SIGA não respondeu.',
    portalOpen: 'Não foi possível abrir o portal da escola.',
    needWallet: 'Crie o cartão escolar digital antes de carregar saldo.',
    mbwayInvalidPhone: 'O número de telemóvel MB WAY não é válido.',
    mbwayMissing: 'Não foi encontrada conta MB WAY para este número.',
    mbwayInactive: 'A carteira não está ativa para carregamentos MB WAY.',
    mbwayProvider: 'O MB WAY não concluiu o pedido. Tente mais tarde.',
    mbwayMonthLimit: 'Este carregamento ultrapassa o limite mensal.',
    mbwayAboveMax: 'O montante está acima do máximo permitido.',
    mbwayBelowMin: 'O montante está abaixo do mínimo para MB WAY.'
  },
  brand: {
    role: 'Encarregado de educação'
  },
  locale: {
    label: 'Idioma'
  },
  auth: {
    eyebrow: 'Ligado ao SIGA',
    headline: 'A escola do seu educando, num ecrã que cabe na mão.',
    lead: 'Os mesmos dados e os mesmos pedidos do portal oficial. A interface é outra: clara, grande e feita para o telemóvel.',
    point1: 'Marcações de refeições e prolongamento',
    point2: 'Cartão escolar, saldo e carregamentos',
    point3: 'Ementas, pagamentos e portaria',
    captchaFailed: 'A verificação não carregou. Atualize a página ou use o SIGA oficial.'
  },
  login: {
    title: 'Entrar · Siga',
    kicker: 'Autenticação',
    heading: 'Entrar',
    subtitle: 'O mesmo utilizador e a mesma palavra-passe do SIGA.',
    username: 'Utilizador',
    usernamePlaceholder: 'nome de utilizador',
    password: 'Palavra-passe',
    passwordPlaceholder: 'palavra-passe ou código',
    showPassword: 'Mostrar palavra-passe',
    remember: 'Lembrar-me',
    rememberHint: 'Mantém a sessão neste dispositivo durante 30 dias e guarda o utilizador e a palavra-passe. A palavra-passe fica mascarada com pontos.',
    submit: 'Iniciar sessão',
    entering: 'A entrar',
    enteringHint: 'A abrir o portal da escola…',
    recover: 'Recuperar acesso',
    haveCode: 'Tenho um código',
    robot: 'Confirme que não é um robot.',
    captchaRequired: 'A escola pede a verificação abaixo antes de entrar.',
    switchOfficial: 'Entrar no SIGA oficial',
    switchOfficialHint: 'Se for preciso verificação de robot, abra o site oficial na app. Tentamos preencher o utilizador e a palavra-passe atuais; complete o captcha e entre. Use “Voltar a esta app” no topo.',
    switchOfficialCaptcha: 'É preciso verificação — abrir SIGA oficial',
    switchApp: 'Voltar a esta app',
    failed: 'Não foi possível entrar.',
    autoFailed: 'Não foi possível entrar automaticamente.',
    mismatch: 'As palavras-passe não coincidem.',
    weak: 'Use pelo menos 12 caracteres, com maiúsculas, minúsculas, números e um símbolo.',
    userRequired: 'Indique o utilizador',
    passwordShort: 'A palavra-passe é demasiado curta',
    firstLead: 'Primeiro acesso. Defina uma palavra-passe só sua. O email associado é {email}.',
    schoolEmail: 'o que a escola tiver registado',
    newPassword: 'Nova palavra-passe',
    confirm: 'Confirmar',
    setPassword: 'Definir palavra-passe',
    back: 'Voltar',
    sync: 'A associar {source} a {target}. Entre para concluir.',
    sourceFallback: 'a conta de origem',
    targetFallback: 'o SIGA',
    videoFallback: 'Vídeo',
    videoFrame: 'Vídeo de ajuda'
  },
  recover: {
    title: 'Recuperar acesso · Siga',
    kicker: 'Conta',
    heading: 'Recuperar acesso',
    subtitle: 'Enviamos um código para o email associado à conta.',
    email: 'Email',
    emailPlaceholder: 'nome@email.pt',
    emailInvalid: 'Indique um email válido',
    submit: 'Enviar pedido',
    back: 'Voltar a entrar',
    robot: 'Confirme que não é um robot.'
  },
  reset: {
    title: 'Nova palavra-passe · Siga',
    kicker: 'Conta',
    heading: 'Nova palavra-passe',
    subtitle: 'O email do SIGA abre o site oficial. Pode colar aqui o código desse link.',
    code: 'Código do email',
    codePlaceholder: 'código do link',
    validate: 'Validar código',
    askNew: 'Pedir um código novo',
    enter: 'Entrar',
    account: 'Conta {email}',
    newPassword: 'Nova palavra-passe',
    confirm: 'Confirmar',
    save: 'Guardar',
    min: 'Use pelo menos 12 caracteres',
    confirmRequired: 'Confirme a palavra-passe',
    mismatch: 'As palavras-passe não coincidem',
    complexity: 'Inclua maiúsculas, minúsculas, números e um símbolo',
    paste: 'Cole o código que recebeu no email.'
  },
  initialize: {
    title: 'A entrar · Siga',
    kicker: 'Ligação',
    heading: 'A entrar',
    subtitle: 'Estamos a confirmar o acesso com o SIGA.',
    checking: 'A confirmar a ligação…',
    missing: 'Esta ligação não tem código.',
    failed: 'Não foi possível entrar.',
    back: 'Voltar'
  },
  error: {
    title: 'Esta página não abriu.',
    fallback: 'Tente outra vez dentro de momentos.',
    home: 'Voltar ao início',
    missing: 'Esta página não existe.'
  },
  shell: {
    school: 'Portal da escola',
    student: 'Educando',
    logout: 'Terminar sessão',
    opening: 'A abrir o portal da escola…',
    more: 'Mais',
    moreTitle: 'Todos os módulos'
  },
  module: {
    refresh: 'Atualizar',
    emptyTitle: 'Sem conteúdo neste momento',
    emptyBody: 'A escola não devolveu dados deste educando nesta área (pode não estar disponível, ou não há registos este ano). Atualize em Mais, ou escolha outro educando.',
    sent: 'Pedido enviado ao portal.',
    bookingUnconfirmed: 'O portal não confirmou a marcação.',
    topUpSent: 'Pedido de carregamento enviado.',
    topUpRejected: 'O portal não aceitou o carregamento.',
    toastSent: 'Pedido enviado',
    nif: 'NIF'
  },
  days: {
    title: 'Marcar ou desmarcar',
    hint: 'Na maioria dos municípios, a marcação do próprio dia fecha às 10:00.',
    confirm: 'Confirmar',
    marked: 'Marcado',
    open: 'Livre'
  },
  bookings: {
    title: 'Marcações de refeições',
    hint: 'Toque num dia do calendário para marcar ou desmarcar. O mês inteiro cabe num ecrã.',
    hintShort: 'Toque nos dias para alterar',
    pending: '{count} dia(s) alterado(s) — guarde quando estiver pronto',
    confirm: 'Guardar marcações',
    marked: 'Marcado',
    available: 'Livre',
    locked: 'Fechado',
    meal: 'Refeição',
    booked: '{count} marcadas',
    open: '{count} livres',
    emptyMonth: 'Não há dias marcáveis neste mês para o serviço selecionado.',
    noUnits: 'Este educando não tem serviço de refeição ou prolongamento disponível para marcar.',
    prevMonth: 'Mês anterior',
    nextMonth: 'Mês seguinte',
    diet: 'Tipo de prato',
    dietNormal: 'Normal',
    dietVegetarian: 'Vegetariano',
    dietShortNormal: 'Norm.',
    dietShortVegetarian: 'Veg.',
    limitReached: 'Foi atingido o limite de marcações da escola neste período.',
    needPlate: 'Escolha o tipo de prato (normal/vegetariano) antes de confirmar a marcação.'
  },
  meals: {
    breakfast: 'Pequeno-almoço',
    lunch: 'Almoço',
    snack: 'Lanche',
    dinner: 'Jantar',
    meals: 'Refeições',
    schoolMeals: 'Escolares',
    bar: 'Bar',
    transport: 'Transportes',
    fine: 'Multa'
  },
  menus: {
    title: 'Ementas',
    hint: 'PDFs oficiais publicados pela escola ou pela empresa de refeições.',
    current: 'Atual',
    openPdf: 'Abrir ementa em PDF',
    noFile: 'Não há ficheiro para esta ementa.',
    empty: 'Ainda não há ementas publicadas para este educando.',
    allSchools: 'Todas as escolas',
    allMeals: 'Todas as refeições'
  },
  topup: {
    title: 'Carregar cartão',
    action: 'Carregar',
    hint: 'O MB WAY pede confirmação no telemóvel. Multibanco e Payshop enviam a referência por email (não é preciso indicar montante aqui).',
    method: 'Meio',
    amount: 'Montante',
    phone: 'Telemóvel (MB WAY)',
    email: 'Email para a referência',
    submit: 'Enviar pedido'
  },
  walletCreate: {
    title: 'Criar cartão escolar digital',
    action: 'Criar cartão',
    needed: 'Este educando ainda não tem cartão digital. Crie-o antes de carregar saldo.',
    blocked: 'A conta não permite criar ou carregar agora (fechada, suspensa ou com pedido de fecho).',
    unavailable: 'A escola não permite criar cartão digital para este educando.',
    terms: 'Li e aceito os termos do cartão escolar.',
    eeName: 'Nome do EE',
    eeDocType: 'Tipo de documento',
    eeDocNumber: 'Número do documento',
    eeExpiry: 'Validade do documento',
    eeNif: 'NIF do EE',
    eeAddress: 'Morada',
    eePostal: 'Código postal (4)',
    eePostalExt: 'Extensão (3)',
    eeCity: 'Localidade',
    eeEmail: 'Email',
    studentName: 'Nome do educando',
    studentBirth: 'Data de nascimento',
    studentNif: 'NIF do educando',
    studentEchelon: 'Escalão',
    dateHint: 'Formato DD-MM-AAAA',
    submit: 'Criar cartão escolar',
    created: 'Cartão escolar digital criado.',
    rejected: 'A escola não aceitou este pedido de criação.'
  },
  data: {
    more: 'Mostrar mais {count}',
    yes: 'Sim',
    no: 'Não'
  },
  panel: {
    balance: 'Saldo disponível',
    reserved: 'Reservado',
    credit: 'Crédito',
    cards: 'Dados do cartão',
    card: 'Cartão escolar',
    cardNumber: 'Número',
    units: 'Tipos de refeição',
    unitsHint: 'O que o cartão pode pagar: pequeno-almoço, almoço, lanche e encargos associados.',
    movements: 'Movimentos',
    load: 'Mostrar',
    sectionEmpty: 'A escola não devolveu dados do cartão, ou este aluno ainda não tem cartão associado.',
    reloginTitle: 'Inicie sessão outra vez',
    reloginBody: 'A sessão da escola falta ou expirou. Saia e entre de novo para carregar marcações, cartão e os outros módulos.'
  },
  home: {
    hello: 'Olá, {name}',
    focusStudent: 'Educando selecionado',
    openCard: 'Ver cartão',
    bookingsMonth: 'Marcações deste mês',
    openBookings: 'Marcar',
    students: 'Os seus educandos',
    current: 'Atual',
    alerts: 'Avisos recentes',
    allAlerts: 'Todos'
  },
  modules: {
    inicio: {
      label: 'Início',
      nav: 'Início',
      description: 'Educandos, saldo e marcações do mês.'
    },
    pessoal: {
      label: 'Área pessoal',
      nav: 'Pessoal',
      description: 'Os seus dados e a palavra-passe.'
    },
    candidaturas: {
      label: 'Candidaturas',
      nav: 'Candidaturas',
      description: 'Serviços abertos e encerrados pelo município.'
    },
    cartao: {
      label: 'Cartão escolar',
      nav: 'Cartão',
      description: 'Saldo, movimentos, carregamentos e faturas.'
    },
    ementas: {
      label: 'Ementas',
      nav: 'Ementas',
      description: 'Refeições da semana e do mês.'
    },
    marcacoes: {
      label: 'Marcações',
      nav: 'Marcar',
      description: 'Refeições, prolongamento e assiduidade.'
    },
    notificacoes: {
      label: 'Notificações',
      nav: 'Avisos',
      description: 'Avisos enviados por email ou SMS.'
    },
    pagamentos: {
      label: 'Pagamentos',
      nav: 'Pagar',
      description: 'Consumos, movimentos e faturas.'
    },
    portaria: {
      label: 'Portaria',
      nav: 'Portaria',
      description: 'Entradas e saídas, autorizadas ou negadas.'
    }
  },
  videos: {
    bookings: 'Aprenda a fazer marcações',
    wallet: 'Aprenda a usar a wallet',
    password: 'Recuperar a palavra-passe'
  },
  links: {
    manual: 'Manual de acesso',
    privacy: 'Privacidade',
    terms: 'Termos',
    faq: 'Perguntas frequentes',
    ticket: 'Abrir ticket',
    ticketStatus: 'Estado do ticket'
  },
  fields: {
    nif: 'NIF',
    nome: 'Nome',
    name: 'Nome',
    username: 'Utilizador',
    saldo: 'Saldo',
    ano: 'Ano',
    anoescolaridade: 'Ano de escolaridade',
    email: 'Email',
    data: 'Data',
    estado: 'Estado',
    descricao: 'Descrição',
    ementa: 'Ementa',
    marcado: 'Marcado',
    valor: 'Valor',
    montante: 'Montante',
    prato: 'Prato',
    hora: 'Hora',
    tipo: 'Tipo',
    escola: 'Escola',
    projeto: 'Projeto',
    id: 'ID'
  }
} satisfies Messages
