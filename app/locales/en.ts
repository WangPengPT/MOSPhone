export const en = {
  meta: {
    description: 'Parent area connected to SIGA, designed for your phone.'
  },
  errors: {
    request: 'The request could not be completed.'
  },
  api: {
    credentials: 'Enter your username and password.',
    firstAccess: 'This is your first sign-in. Set a password to continue.',
    signIn: 'Sign in to continue.',
    unknownModule: 'Unknown module.',
    incomplete: 'This link is incomplete.',
    unknownFlow: 'Unknown flow.',
    account: 'Could not identify the account.',
    weak: 'Use at least 12 characters, with upper and lower case, a number and a symbol.',
    passwordSet: 'Password saved. Sign in with your username and the new password.',
    passwordChanged: 'Password changed. You can sign in now.',
    badCode: 'The recovery code is not valid.',
    codeOk: 'Code accepted. You can set a new password.',
    email: 'Enter a valid email.',
    robot: 'Confirm you are not a robot.',
    recoverSent: 'Request sent. Open the email and use the code, or the link, to set a new password.',
    portalHidden: 'The school portal did not expose this service in this session.',
    rejected: 'Destination was rejected.',
    insecure: 'Only secure links are allowed.',
    outside: 'Destination is outside the school portal.',
    tooLarge: 'The portal response was too large.',
    refused: 'The portal refused the request.',
    unreachable: 'Could not reach the school portal.',
    redirect: 'The school portal did not finish the redirect.',
    session: 'Session key missing on the server. Locally set NUXT_SESSION_PASSWORD in .env (≥32 chars). The Android app uses the online Worker — set the same variable in that Cloudflare Worker’s Secrets.',
    sigaDown: 'SIGA did not respond.',
    portalOpen: 'Could not open the school portal.',
    needWallet: 'Create the digital school card before topping up.'
  },
  brand: {
    role: 'Parent'
  },
  locale: {
    label: 'Language'
  },
  auth: {
    eyebrow: 'Connected to SIGA',
    headline: 'Your child\'s school, on a screen that fits in your hand.',
    lead: 'The same data and the same requests as the official portal. A clearer interface, built for a phone.',
    point1: 'Meal and after-school bookings',
    point2: 'School card, balance and top-ups',
    point3: 'Menus, payments and the gate'
  },
  login: {
    title: 'Sign in · Siga',
    kicker: 'Sign in',
    heading: 'Sign in',
    subtitle: 'The same username and password as SIGA.',
    username: 'Username',
    usernamePlaceholder: 'username',
    password: 'Password',
    passwordPlaceholder: 'password or code',
    showPassword: 'Show password',
    remember: 'Remember me',
    rememberHint: 'Stay signed in on this device for 30 days, and keep the username and password filled in. The password stays masked as dots.',
    submit: 'Sign in',
    entering: 'Entering',
    enteringHint: 'Opening the school portal…',
    recover: 'Reset access',
    haveCode: 'I have a code',
    robot: 'Confirm you are not a robot.',
    failed: 'Could not sign in.',
    autoFailed: 'Automatic sign-in did not work.',
    mismatch: 'The passwords do not match.',
    weak: 'Use at least 12 characters, with upper and lower case, a number and a symbol.',
    userRequired: 'Enter your username',
    passwordShort: 'The password is too short',
    firstLead: 'First sign-in. Choose a password only you know. The email on file is {email}.',
    schoolEmail: 'the one the school has on file',
    newPassword: 'New password',
    confirm: 'Confirm',
    setPassword: 'Set password',
    back: 'Back',
    sync: 'Linking {source} to {target}. Sign in to finish.',
    sourceFallback: 'the source account',
    targetFallback: 'SIGA',
    videoFallback: 'Video',
    videoFrame: 'Help video'
  },
  recover: {
    title: 'Reset access · Siga',
    kicker: 'Account',
    heading: 'Reset access',
    subtitle: 'We send a code to the email on the account.',
    email: 'Email',
    emailPlaceholder: 'name@email.com',
    emailInvalid: 'Enter a valid email',
    submit: 'Send request',
    back: 'Back to sign in',
    robot: 'Confirm you are not a robot.'
  },
  reset: {
    title: 'New password · Siga',
    kicker: 'Account',
    heading: 'New password',
    subtitle: 'The SIGA email opens the official site. Paste the code from that link here.',
    code: 'Email code',
    codePlaceholder: 'code from the link',
    validate: 'Check code',
    askNew: 'Request a new code',
    enter: 'Sign in',
    account: 'Account {email}',
    newPassword: 'New password',
    confirm: 'Confirm',
    save: 'Save',
    min: 'Use at least 12 characters',
    confirmRequired: 'Confirm the password',
    mismatch: 'The passwords do not match',
    complexity: 'Include upper and lower case, a number and a symbol',
    paste: 'Paste the code from the email.'
  },
  initialize: {
    title: 'Signing in · Siga',
    kicker: 'Link',
    heading: 'Signing in',
    subtitle: 'We are confirming access with SIGA.',
    checking: 'Confirming the link…',
    missing: 'This link has no code.',
    failed: 'Could not sign in.',
    back: 'Back'
  },
  error: {
    title: 'This page did not open.',
    fallback: 'Try again in a moment.',
    home: 'Back to home',
    missing: 'This page does not exist.'
  },
  shell: {
    school: 'School portal',
    student: 'Student',
    logout: 'Sign out',
    opening: 'Opening the school portal…',
    more: 'More',
    moreTitle: 'More modules'
  },
  module: {
    refresh: 'Refresh',
    emptyTitle: 'Nothing here right now',
    emptyBody: 'The school did not return data for this student in this area (it may be unavailable, or there are no records this year). Refresh from More, or try another student.',
    sent: 'Request sent to the portal.',
    bookingUnconfirmed: 'The portal did not confirm the booking.',
    topUpSent: 'Top-up request sent.',
    topUpRejected: 'The portal did not accept the top-up.',
    toastSent: 'Request sent',
    nif: 'Tax ID'
  },
  days: {
    title: 'Book or cancel',
    hint: 'In most municipalities, same-day booking closes at 10:00.',
    confirm: 'Confirm',
    marked: 'Booked',
    open: 'Open'
  },
  bookings: {
    title: 'Meal bookings',
    hint: 'Tap a day on the calendar to book or cancel. The whole month fits on one screen.',
    hintShort: 'Tap days to toggle',
    pending: '{count} day(s) changed — save when ready',
    confirm: 'Save bookings',
    marked: 'Booked',
    available: 'Open',
    locked: 'Closed',
    meal: 'Meal',
    booked: '{count} booked',
    open: '{count} open',
    emptyMonth: 'No bookable days in this month for the selected service.',
    noUnits: 'This student has no meal or after-school service available for booking.',
    prevMonth: 'Previous month',
    nextMonth: 'Next month'
  },
  meals: {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
    meals: 'Meals',
    schoolMeals: 'School meals',
    bar: 'Bar',
    transport: 'Transport',
    fine: 'Fine'
  },
  menus: {
    title: 'School menus',
    hint: 'Official meal PDFs published by the school or catering firm.',
    current: 'Current',
    openPdf: 'Open menu PDF',
    noFile: 'No file available for this menu.',
    empty: 'No menus were published for this student yet.',
    allSchools: 'All schools',
    allMeals: 'All meals'
  },
  topup: {
    title: 'Top up the card',
    action: 'Top up',
    hint: 'The request goes to the school portal. Multibanco and Payshop send the reference by email.',
    method: 'Method',
    amount: 'Amount',
    phone: 'Mobile',
    email: 'Email for the reference',
    submit: 'Send request'
  },
  walletCreate: {
    title: 'Create digital school card',
    action: 'Create card',
    needed: 'This student has no digital school card yet. Create one before topping up.',
    blocked: 'This account cannot create or top up right now (closed, suspended, or close requested).',
    unavailable: 'The school does not allow creating a digital card for this student.',
    terms: 'I have read and accept the school card terms.',
    eeName: 'Parent name',
    eeDocType: 'Document type',
    eeDocNumber: 'Document number',
    eeExpiry: 'Document expiry',
    eeNif: 'Parent tax ID (NIF)',
    eeAddress: 'Address',
    eePostal: 'Postal code (4)',
    eePostalExt: 'Postal ext (3)',
    eeCity: 'City',
    eeEmail: 'Email',
    studentName: 'Student name',
    studentBirth: 'Student birth date',
    studentNif: 'Student tax ID',
    studentEchelon: 'Echelon',
    dateHint: 'Format DD-MM-YYYY',
    submit: 'Create school card',
    created: 'Digital school card created.',
    rejected: 'The school did not accept this card request.'
  },
  data: {
    more: 'Show {count} more',
    yes: 'Yes',
    no: 'No'
  },
  panel: {
    balance: 'Available balance',
    reserved: 'Reserved',
    credit: 'Credit',
    cards: 'Card details',
    card: 'School card',
    cardNumber: 'Card number',
    units: 'Meal types',
    unitsHint: 'What the school card can pay for: breakfast, lunch, snacks and related charges.',
    movements: 'Movements',
    load: 'Load',
    sectionEmpty: 'The school returned no card details, or this student has no linked card.',
    reloginTitle: 'Sign in again',
    reloginBody: 'The school session is missing or expired. Sign out and sign in again to load bookings, the card and the other modules.'
  },
  home: {
    hello: 'Hello, {name}',
    focusStudent: 'Selected student',
    openCard: 'Open card',
    bookingsMonth: 'This month',
    openBookings: 'Book meals',
    students: 'Your students',
    current: 'Current',
    alerts: 'Recent notices',
    allAlerts: 'All'
  },
  modules: {
    inicio: {
      label: 'Home',
      nav: 'Home',
      description: 'Students, balance and this month’s bookings.'
    },
    pessoal: {
      label: 'Profile',
      nav: 'Profile',
      description: 'Your details and password.'
    },
    candidaturas: {
      label: 'Applications',
      nav: 'Applications',
      description: 'Services the municipality has opened or closed.'
    },
    cartao: {
      label: 'School card',
      nav: 'Card',
      description: 'Balance, movements, top-ups and invoices.'
    },
    ementas: {
      label: 'Menus',
      nav: 'Menus',
      description: 'Meals for the week and the month.'
    },
    marcacoes: {
      label: 'Bookings',
      nav: 'Book',
      description: 'Meals, after-school care and attendance.'
    },
    notificacoes: {
      label: 'Notifications',
      nav: 'Alerts',
      description: 'Notices sent by email or SMS.'
    },
    pagamentos: {
      label: 'Payments',
      nav: 'Payments',
      description: 'Spending, movements and invoices.'
    },
    portaria: {
      label: 'Gate',
      nav: 'Gate',
      description: 'Entries and exits, allowed or denied.'
    }
  },
  videos: {
    bookings: 'How to make bookings',
    wallet: 'How to use the wallet',
    password: 'Reset your password'
  },
  links: {
    manual: 'Access manual',
    privacy: 'Privacy',
    terms: 'Terms',
    faq: 'FAQ',
    ticket: 'Open a ticket',
    ticketStatus: 'Ticket status'
  },
  fields: {
    nif: 'Tax ID',
    nome: 'Name',
    name: 'Name',
    username: 'Username',
    saldo: 'Balance',
    ano: 'Year',
    anoescolaridade: 'School year',
    email: 'Email',
    data: 'Date',
    estado: 'Status',
    descricao: 'Description',
    ementa: 'Menu',
    marcado: 'Booked',
    valor: 'Amount',
    montante: 'Amount',
    prato: 'Dish',
    hora: 'Time',
    tipo: 'Type',
    escola: 'School',
    projeto: 'Project',
    id: 'ID'
  }
} as const

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> }

export type Messages = Widen<typeof en>
