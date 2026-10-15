import type { Messages } from './en'

export const zh = {
  meta: {
    description: '连接 SIGA 的家长区，为手机而做。'
  },
  errors: {
    request: '请求没有完成。'
  },
  api: {
    credentials: '请填写用户名和密码。',
    firstAccess: '这是首次登录。请设置密码后继续。',
    signIn: '请先登录。',
    unknownModule: '未知功能。',
    incomplete: '这个链接不完整。',
    unknownFlow: '未知流程。',
    account: '无法识别这个账户。',
    weak: '至少 12 位，并包含大写、小写、数字和一个符号。',
    passwordSet: '密码已设置。请用用户名和新密码登录。',
    passwordChanged: '密码已更改。现在可以登录。',
    badCode: '恢复验证码无效。',
    codeOk: '验证码有效。现在可以设置新密码。',
    email: '请填写有效的邮箱。',
    robot: '请确认你不是机器人。',
    recoverSent: '请求已发送。打开邮件，用验证码或链接设置新密码。',
    portalHidden: '学校门户在这次会话里没有提供这项服务。',
    rejected: '目标地址被拒绝。',
    insecure: '只允许安全连接。',
    outside: '目标不在学校门户范围内。',
    tooLarge: '门户返回的内容过大。',
    refused: '门户拒绝了这个请求。',
    unreachable: '无法联系学校门户。',
    redirect: '学校门户没有完成跳转。',
    session: '线上 Worker 未配置会话密钥。请到 Cloudflare → 该 Worker → Settings → Variables and Secrets 设置 NUXT_SESSION_PASSWORD（≥32 字符）。本地 .env 只对电脑网页生效，对 App 无效。',
    sigaDown: 'SIGA 没有响应。',
    portalOpen: '无法打开学校门户。',
    needWallet: '需要先创建数字校园卡，才能充值。'
  },
  brand: {
    role: '家长'
  },
  locale: {
    label: '语言'
  },
  auth: {
    eyebrow: '已连接 SIGA',
    headline: '孩子的学校，放在一只手就能握住的屏幕上。',
    lead: '数据和操作与官方门户相同。界面是重新做的：清楚、字大，并且为手机设计。',
    point1: '订餐与课后延长',
    point2: '校园卡、余额与充值',
    point3: '菜单、付款与门禁'
  },
  login: {
    title: '登录 · Siga',
    kicker: '登录',
    heading: '登录',
    subtitle: '使用与 SIGA 相同的用户名和密码。',
    username: '用户名',
    usernamePlaceholder: '用户名',
    password: '密码',
    passwordPlaceholder: '密码或验证码',
    showPassword: '显示密码',
    remember: '记住我',
    rememberHint: '在这台设备上保持登录 30 天，并记住用户名和密码。密码只会以圆点显示，不会明文露出。',
    submit: '登录',
    entering: '正在进入',
    enteringHint: '正在打开学校门户，请稍候…',
    recover: '找回访问',
    haveCode: '我有验证码',
    robot: '请确认你不是机器人。',
    switchOfficial: '改用官方 SIGA 登录',
    switchOfficialHint: '若出现人机验证，可在 App 内打开官方网站。会尽量自动填入当前账号密码，完成验证码后登录。顶部有「返回本 App」。',
    switchOfficialCaptcha: '需要人机验证 — 打开官方 SIGA',
    switchApp: '返回本 App',
    failed: '无法登录。',
    autoFailed: '自动登录没有成功。',
    mismatch: '两次输入的密码不一致。',
    weak: '至少 12 位，并包含大写、小写、数字和一个符号。',
    userRequired: '请填写用户名',
    passwordShort: '密码太短',
    firstLead: '首次登录。请设置一个只有你知道的密码。账户邮箱是 {email}。',
    schoolEmail: '学校登记的邮箱',
    newPassword: '新密码',
    confirm: '确认',
    setPassword: '设置密码',
    back: '返回',
    sync: '正在把 {source} 关联到 {target}。登录后即可完成。',
    sourceFallback: '来源账户',
    targetFallback: 'SIGA',
    videoFallback: '视频',
    videoFrame: '帮助视频'
  },
  recover: {
    title: '找回访问 · Siga',
    kicker: '账户',
    heading: '找回访问',
    subtitle: '我们会把验证码发到账户绑定的邮箱。',
    email: '邮箱',
    emailPlaceholder: 'name@email.com',
    emailInvalid: '请填写有效的邮箱',
    submit: '发送请求',
    back: '返回登录',
    robot: '请确认你不是机器人。'
  },
  reset: {
    title: '新密码 · Siga',
    kicker: '账户',
    heading: '新密码',
    subtitle: 'SIGA 的邮件会打开官方网站。把链接里的验证码粘贴到这里。',
    code: '邮件验证码',
    codePlaceholder: '链接中的验证码',
    validate: '验证',
    askNew: '重新获取验证码',
    enter: '登录',
    account: '账户 {email}',
    newPassword: '新密码',
    confirm: '确认',
    save: '保存',
    min: '至少 12 位',
    confirmRequired: '请再次输入密码',
    mismatch: '两次输入的密码不一致',
    complexity: '需包含大写、小写、数字和一个符号',
    paste: '请粘贴邮件中的验证码。'
  },
  initialize: {
    title: '正在登录 · Siga',
    kicker: '链接',
    heading: '正在登录',
    subtitle: '正在向 SIGA 确认这次访问。',
    checking: '正在确认链接…',
    missing: '这个链接没有验证码。',
    failed: '无法登录。',
    back: '返回'
  },
  error: {
    title: '这个页面没有打开。',
    fallback: '请稍后再试。',
    home: '回到首页',
    missing: '这个页面不存在。'
  },
  shell: {
    school: '学校门户',
    student: '学生',
    logout: '退出',
    opening: '正在打开学校门户…',
    more: '更多',
    moreTitle: '全部功能'
  },
  module: {
    refresh: '刷新',
    emptyTitle: '这里暂时没有内容',
    emptyBody: '学校这边没有给当前学生返回这条信息（可能未开通，或本学期没有记录）。可在「更多」里刷新，或换一个学生试试。',
    sent: '请求已发给门户。',
    bookingUnconfirmed: '门户没有确认这次预约。',
    topUpSent: '充值请求已发送。',
    topUpRejected: '门户没有接受这次充值。',
    toastSent: '请求已发送',
    nif: '税号'
  },
  days: {
    title: '预约或取消',
    hint: '在大多数市镇，当天的预约于 10:00 截止。',
    confirm: '确认',
    marked: '已预约',
    open: '未预约'
  },
  bookings: {
    title: '餐食预约',
    hint: '点日历格子即可预约或取消，整月一目了然。',
    hintShort: '点日期切换预约',
    pending: '已改 {count} 天，记得保存',
    confirm: '保存预约',
    marked: '已预约',
    available: '可预约',
    locked: '已关闭',
    meal: '餐次',
    booked: '已预约 {count}',
    open: '可约 {count}',
    emptyMonth: '该服务在本月没有可预约日期。',
    noUnits: '该学生没有可预约的餐食或课后服务。',
    prevMonth: '上个月',
    nextMonth: '下个月'
  },
  meals: {
    breakfast: '早餐',
    lunch: '午餐',
    snack: '点心',
    dinner: '晚餐',
    meals: '餐食',
    schoolMeals: '学生餐',
    bar: '小卖部',
    transport: '交通',
    fine: '罚款'
  },
  menus: {
    title: '学校菜单',
    hint: '学校或配餐公司发布的正式菜单 PDF。',
    current: '当前',
    openPdf: '打开菜单 PDF',
    noFile: '这份菜单没有可打开的文件。',
    empty: '该学生还没有已发布的菜单。',
    allSchools: '全部学校',
    allMeals: '全部餐次'
  },
  topup: {
    title: '校园卡充值',
    action: '充值',
    hint: '请求会发到学校门户。Multibanco 和 Payshop 会把参考号发到邮箱。',
    method: '方式',
    amount: '金额',
    phone: '手机',
    email: '接收参考号的邮箱',
    submit: '发送请求'
  },
  walletCreate: {
    title: '创建数字校园卡',
    action: '创建数字卡',
    needed: '这个学生还没有数字校园卡，创建后才能充值。',
    blocked: '当前账户状态不允许创建或充值（可能已关闭、暂停或正在销户）。',
    unavailable: '学校未开通数字校园卡，或该学生暂不可创建。',
    terms: '我已阅读并同意学校校园卡使用条款。',
    eeName: '家长姓名',
    eeDocType: '证件类型',
    eeDocNumber: '证件号码',
    eeExpiry: '证件有效期',
    eeNif: '家长税号 (NIF)',
    eeAddress: '地址',
    eePostal: '邮编前 4 位',
    eePostalExt: '邮编后 3 位',
    eeCity: '城市',
    eeEmail: '邮箱',
    studentName: '学生姓名',
    studentBirth: '学生出生日期',
    studentNif: '学生税号',
    studentEchelon: '阶梯 / Escalão',
    dateHint: '格式 DD-MM-YYYY',
    submit: '创建校园卡',
    created: '数字校园卡已创建。',
    rejected: '学校没有接受这次开卡请求。'
  },
  data: {
    more: '再显示 {count} 条',
    yes: '是',
    no: '否'
  },
  panel: {
    balance: '可用余额',
    reserved: '已预留',
    credit: '信用额',
    cards: '卡片信息',
    card: '校园卡',
    cardNumber: '卡号',
    units: '餐次类型',
    unitsHint: '学校餐卡可消费的项目：早餐、午餐、点心等。预约或刷卡用餐时按这些类型扣费。',
    movements: '流水',
    load: '加载',
    sectionEmpty: '学校没有返回卡片资料，或该学生还没有关联校园卡。',
    reloginTitle: '需要重新登录',
    reloginBody: '学校会话没有建立或已过期。请退出后重新登录，才能加载预约、校园卡和其他功能。'
  },
  home: {
    hello: '你好，{name}',
    focusStudent: '当前学生',
    openCard: '看校园卡',
    bookingsMonth: '本月预约',
    openBookings: '去预约',
    students: '我的学生',
    current: '当前',
    alerts: '最近通知',
    allAlerts: '全部'
  },
  modules: {
    inicio: {
      label: '首页',
      nav: '首页',
      description: '学生、余额和本月预约概况。'
    },
    pessoal: {
      label: '个人资料',
      nav: '资料',
      description: '你的资料和密码。'
    },
    candidaturas: {
      label: '申请',
      nav: '申请',
      description: '市镇已开放或已结束的服务。'
    },
    cartao: {
      label: '校园卡',
      nav: '校园卡',
      description: '余额、流水、充值和发票。'
    },
    ementas: {
      label: '菜单',
      nav: '菜单',
      description: '本周和本月的餐食。'
    },
    marcacoes: {
      label: '定餐',
      nav: '定餐',
      description: '餐食、课后延长和出勤。'
    },
    notificacoes: {
      label: '通知',
      nav: '通知',
      description: '通过邮件或短信发出的通知。'
    },
    pagamentos: {
      label: '付款',
      nav: '付款',
      description: '消费、流水和发票。'
    },
    portaria: {
      label: '门禁',
      nav: '门禁',
      description: '进出记录，允许或拒绝。'
    }
  },
  videos: {
    bookings: '如何预约',
    wallet: '如何使用校园卡',
    password: '如何重置密码'
  },
  links: {
    manual: '使用手册',
    privacy: '隐私',
    terms: '条款',
    faq: '常见问题',
    ticket: '提交工单',
    ticketStatus: '工单状态'
  },
  fields: {
    nif: '税号',
    nome: '姓名',
    name: '姓名',
    username: '用户名',
    saldo: '余额',
    ano: '年级',
    anoescolaridade: '学年',
    email: '邮箱',
    data: '日期',
    estado: '状态',
    descricao: '说明',
    ementa: '菜单',
    marcado: '已预约',
    valor: '金额',
    montante: '金额',
    prato: '菜品',
    hora: '时间',
    tipo: '类型',
    escola: '学校',
    projeto: '项目',
    id: '编号'
  }
} satisfies Messages
