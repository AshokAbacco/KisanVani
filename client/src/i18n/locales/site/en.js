// Public website, navbar, footer and auth screens — English (source).
// Every other locales/site/<code>.js mirrors these keys exactly.
// Arrays are rendered in order; keep the same number of items in every language.
// src/i18n/locales/site/en.js is the source of truth for all other locales.
const en = {
  meta: {
    title: 'KisanVani — From Farm to Market',
  },

  nav: {
    features: 'Features',
    about: 'About',
    contact: 'Contact',
    faq: 'FAQ',
    howItWorks: 'How it works',
    signIn: 'Sign in',
    getStarted: 'Get started',
    openDashboard: 'Open dashboard',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    main: 'Main',
    mobile: 'Mobile',
    language: 'Language',
    chooseLanguage: 'Choose language',
  },

  footer: {
    tagline: 'Farmers, Market Mandis, shops and drivers working from the same order — so produce moves faster and everyone is paid on time.',
    platform: 'Platform',
    company: 'Company',
    talkToUs: 'Talk to us',
    createAccount: 'Create an account',
    aboutUs: 'About us',
    privacy: 'Privacy policy',
    terms: 'Terms and conditions',
    contactForm: 'Contact form',
    copyright: '© {year} KisanVani. Made for India’s fresh-produce supply chain.',
  },

  roleNames: {
    ADMIN: 'Admin',
    SHOPKEEPER: 'Shopkeeper',
    FARMER: 'Farmer',
    MANDI_OWNER: 'Market Mandi Owner',
    DRIVER: 'Driver',
  },

  roleTaglines: {
    ADMIN: 'Run the platform',
    SHOPKEEPER: 'Bill, stock and buy fresh',
    FARMER: 'Sell your harvest directly',
    MANDI_OWNER: 'Trade wholesale lots',
    DRIVER: 'Carry loads, get paid',
  },

  home: {
    eyebrow: 'Agri supply chain platform',
    heroLine1: 'From Farm',
    heroLine2Before: 'to ',
    heroHighlight: 'Market',
    heroLine2After: '',
    heroBody:
      'One platform for farmers, Market Mandis, neighbourhood shops and drivers. List the harvest, take the order, move the load and bill it — with every kilo tracked from field to counter.',
    exploreFeatures: 'Explore features',
    trust: ['Free for farmers', 'Mandis & shops pay per order', 'Works on any phone browser', 'Verified drivers'],
    featuresTitle: 'One system for the whole chain, not six apps',
    featuresBody:
      'Each role gets a dashboard made for its day, but they all work from the same records — so a reservation, a weight or a payment is never typed twice.',
    seeEveryFeature: 'See every feature',
    features: [
      {
        title: 'POS billing with the weighing scale',
        body: 'Bill by the gram with quick 250 g – 5 kg buttons, cash, UPI or udhar, and print an 80 mm cash memo. Stock drops the moment the bill is saved.',
      },
      {
        title: 'Direct procurement from farmers',
        body: 'Shops and mandis see fresh harvest listings with price, minimum order and distance, and order without middle layers.',
      },
      {
        title: 'Wholesale trading for Market Mandis',
        body: 'Publish bagged, crated or loose lots, reserve weight for each order, and settle with commission worked out for you.',
      },
      {
        title: 'Transport with live tracking',
        body: 'Request a vehicle, assign a verified driver and follow the load on a map — with an honest “last seen” when the driver is offline.',
      },
      {
        title: 'Inventory that matches the counter',
        body: 'Every sale, receipt, wastage and correction is a ledger entry, so stock levels can always be explained.',
      },
      {
        title: 'Built for many languages',
        body: 'Use the website in English, Hindi, Kannada, Telugu, Tamil, Malayalam or Marathi — switch any time from the language button at the top.',
      },
    ],
    stepsTitle: 'How a harvest reaches the counter',
    steps: [
      { title: 'Farmer lists the harvest', body: 'Crop, grade, quantity and price per kg, with photos and the farm location.' },
      { title: 'A shop or mandi orders', body: 'The quantity is reserved at once, so two buyers can never buy the same kilo.' },
      { title: 'A driver carries it', body: 'Pickup weight, live location and delivery proof are recorded on the trip.' },
      { title: 'The buyer confirms and pays', body: 'Received kilos go into stock and a settlement is created for the seller.' },
    ],
    portalsTitle: 'Choose your portal',
    portalsBody: 'Every account belongs to one role, checked by the server at sign-in.',
  },

  about: {
    title: 'About KisanVani',
    intro:
      'Vani means voice. KisanVani started from a simple observation at a Bengaluru vegetable market: the farmer, the commission agent, the shopkeeper and the tempo driver were all keeping separate notebooks about the same crate of tomatoes.',
    paragraphs: [
      'When those notebooks disagree, the person with the least information — usually the farmer — loses. Prices are settled late, shortfalls are argued over, and nobody can say where a load is.',
      'KisanVani replaces the notebooks with one shared record. A harvest listing becomes an order, the order becomes a trip, and the trip ends in a stock entry and a settlement. Each person sees their part of it in a dashboard built for their work.',
      'We build for the realities of Indian produce trade: kilos and grams, cash and UPI, udhar accounts, APMC yards, tractors and tempos, patchy mobile data and many languages.',
    ],
    cta: 'Create your account',
    principles: [
      {
        title: 'The farmer sees the price first',
        body: 'Listings show the farmer’s own rate per kilo. Commission, where a Market Mandi charges it, is shown on the settlement — never hidden in the price.',
      },
      {
        title: 'Weights are the source of truth',
        body: 'Ordered, loaded, delivered and received quantities are recorded separately, so a shortfall can be traced to the step where it happened.',
      },
      {
        title: 'Nothing moves without a record',
        body: 'Every change to stock, an order, a trip or a payment leaves a record, so every party sees the same history.',
      },
      {
        title: 'Locations are shared only with the people on the trip',
        body: 'A driver’s position is visible to the buyer, seller and requester of that load — and only while the trip is active.',
      },
    ],
  },

  features: {
    title: 'Features',
    intro: 'Every role works from the same orders, weights and payments. Here is what each dashboard does.',
    count: '{n} features',
    roles: {
      SHOPKEEPER: {
        tag: 'Retail counter',
        points: [
          'Point-of-sale with produce search, category filters and weight entry in kg or grams',
          'Quick weights (250 g, 500 g, 1 kg, 2 kg, 5 kg) and optional USB/serial weighing scale',
          'Cash, UPI and credit (udhar) bills with customer khata and collections',
          '80 mm thermal cash memo, reprints counted and logged',
          'Stock & rates master, wastage and corrections with a full stock ledger',
          'Buy from farmers and Market Mandis, confirm received kilos into stock',
          'Supplier purchases, payments and sales reports with CSV export',
        ],
      },
      FARMER: {
        tag: 'Sell the harvest',
        points: [
          'Post harvests with grade, variety, photos, harvest date and farm location',
          'Publish, pause or complete listings; remaining quantity updates as orders arrive',
          'Accept or reject orders, mark preparing and ready for pickup',
          'Request a vehicle from the farm to the buyer or mandi',
          'Settlements and payments received, month by month',
        ],
      },
      MANDI_OWNER: {
        tag: 'Wholesale trading',
        points: [
          'Create loose, bagged, crated or boxed lots with yard, gate and quality notes',
          'Weight is reserved per order so lots are never oversold',
          'Incoming shop orders, delivered quantities and settlement history',
          'Buy from farmers with your commission calculated on each settlement',
          'Assign verified drivers and vehicles to your loads',
        ],
      },
      DRIVER: {
        tag: 'Move the load',
        points: [
          'Register vehicles and upload RC, insurance, fitness and permit documents',
          'Accept assigned trips or take open loads near you',
          'Confirm loaded and delivered weights, upload proof of delivery',
          'Share GPS only during active trips, with directions in your map app',
          'Earnings per trip and payments received',
        ],
      },
      ADMIN: {
        tag: 'Run the platform',
        points: [
          'Approve new Market Mandi Owners and Drivers, verify vehicles',
          'Search, filter and manage every user, order, trip and payment',
          'Charts for registrations, order volume, trade value and completed trips',
          'Platform settings and broadcast notifications',
        ],
      },
    },
    ctaTitle: 'Ready to bring your harvest, shop or mandi online?',
    ctaBody: 'Free for farmers. Set up your account in a few minutes.',
  },

  contact: {
    title: 'Contact Us',
    intro:
      'Questions about setting up your shop, mandi or farm — or something not working as expected? Reach the support team directly.',
    phoneTitle: 'Phone and WhatsApp',
    emailTitle: 'E-mail',
    hoursTitle: 'Hours',
    hoursLines: ['Monday to Saturday, 6 am – 8 pm IST.', 'Mandi hours start early, so do we.'],
    formTitle: 'Send us a message',
    sentTitle: 'Message sent',
    sentBody: 'Thanks for writing in. Our support team will call or WhatsApp you on the number you gave.',
    sendAnother: 'Send another message',
    name: 'Your name',
    mobile: 'Mobile number',
    iAmA: 'I am a',
    other: 'Other',
    topic: 'Topic',
    topics: [
      'Billing and POS',
      'Orders and listings',
      'Transport and tracking',
      'Payments and settlements',
      'Account and sign-in',
      'Something else',
    ],
    message: 'How can we help?',
    messagePlaceholder: 'Tell us about your query...',
    sending: 'Sending…',
    submit: 'Write to support',
    errors: {
      name: 'Please enter your name.',
      mobile: 'Enter a valid 10-digit mobile number.',
      message: 'Tell us a little more (at least 10 characters).',
    },
  },

  faq: {
    title: 'Frequently asked questions',
    intro: 'Short answers to what people ask most. For anything else, use the contact page.',
    items: [
      {
        q: 'Who can use KisanVani?',
        a: 'Farmers, shopkeepers, Market Mandi Owners and drivers each register for their own role. Admins manage the platform. One account belongs to one role.',
      },
      {
        q: 'Why does my Market Mandi or Driver account need approval?',
        a: 'These accounts handle other people’s goods and money, so an admin checks the details before activating them. Farmers and shopkeepers can start immediately.',
      },
      {
        q: 'Do I need a weighing scale connected to the computer?',
        a: 'No. Weights can be typed or chosen with quick buttons. If your scale has a USB/serial output, the shop can switch on scale reading in Chrome or Edge from the billing screen.',
      },
      {
        q: 'Can two shops buy the same harvest at the same time?',
        a: 'No. When an order is placed the quantity is reserved in the same database step that checks it, so the second buyer is told only the remaining quantity is available.',
      },
      {
        q: 'What if fewer kilos arrive than were ordered?',
        a: 'The driver records loaded and delivered weights, and the buyer confirms the received weight. Stock and the seller’s settlement use the received weight.',
      },
      {
        q: 'Who can see where a driver is?',
        a: 'Only the buyer and seller of that order, whoever requested or assigned the transport, and admins — and only while the trip is active. Tracking stops when the trip ends.',
      },
      {
        q: 'What happens if the driver loses mobile signal?',
        a: 'The map shows the last known position with the time it was received and marks it as offline. KisanVani never guesses a position.',
      },
      {
        q: 'How are commissions shown?',
        a: 'When a Market Mandi buys from a farmer, the mandi’s commission percentage is shown separately on the settlement as gross, commission and net amounts.',
      },
      {
        q: 'Can I print a bill on a thermal printer?',
        a: 'Yes. Bills are laid out for 80 mm rolls. Set the thermal printer as the browser’s printer with zero margins.',
      },
      {
        q: 'Is my password stored safely?',
        a: 'Passwords are stored only as bcrypt hashes. Sessions use short-lived tokens with a refresh token kept in a secure, http-only cookie.',
      },
    ],
  },

  privacy: {
    title: 'Privacy policy',
    intro: 'What KisanVani collects, why, and who can see it. Last updated October 2026.',
    sections: [
      {
        body: 'This policy describes how KisanVani handles personal information for farmers, shopkeepers, Market Mandi Owners, drivers and their customers. It is written to align with the Digital Personal Data Protection Act, 2023. Operators deploying KisanVani should review it with their own legal advisers.',
      },
      {
        title: 'Information we collect',
        items: [
          'Account details: name, mobile number, optional e-mail, role and preferred language.',
          'Business details: shop, farm or mandi name, licence numbers, GSTIN, addresses and optional GPS coordinates.',
          'Trade records: listings, orders, bills, stock movements, settlements and payments.',
          'Driver information: licence, vehicle registration and documents, and GPS positions during active trips.',
          'Shop customers: name and mobile number entered on bills, used for the shop’s own khata.',
        ],
      },
      {
        title: 'How location is used',
        body: 'Drivers share location only after starting it on an active trip, with the browser’s permission. Positions are visible only to the parties of that trip and to admins, and sharing stops when the trip ends.',
      },
      {
        title: 'Who can see your information',
        body: 'Each role sees only what it needs: buyers see the seller’s listing and contact for their orders; drivers see pickup and drop contacts for their trips. Admins can see platform records to operate and support the service.',
      },
      {
        title: 'Security',
        body: 'Passwords are stored as bcrypt hashes. Sessions use short-lived access tokens and an http-only refresh cookie. Uploaded files are checked by type and content.',
      },
      {
        title: 'Retention and your rights',
        body: 'Trade and payment records are kept as required for accounting and tax purposes. You may ask to see, correct or delete your personal information by contacting support; records that must be retained by law are kept but restricted.',
      },
      {
        title: 'Contact',
        body: 'For privacy questions, write to the support address on the contact page.',
      },
    ],
  },

  terms: {
    title: 'Terms and conditions',
    intro: 'The rules for using KisanVani. Last updated October 2026.',
    sections: [
      {
        title: 'Accounts',
        body: 'You must give accurate details and keep your password private. Each account has one role. Market Mandi Owner and Driver accounts are activated after review. We may suspend accounts that misuse the platform, with the reason recorded.',
      },
      {
        title: 'Listings and orders',
        items: [
          'Sellers are responsible for the accuracy of quantity, grade and price in their listings and lots.',
          'An order reserves quantity once placed. Sellers accept or reject it; rejections and cancellations require a reason.',
          'Settlement amounts are based on the quantity the buyer confirms as received.',
        ],
      },
      {
        title: 'Payments',
        body: 'KisanVani records payments made between users by cash, UPI or bank transfer. It does not hold or transfer money. Disputes about payments are between the parties; the order, trip and payment history is available to both.',
      },
      {
        title: 'Transport',
        body: 'Drivers must hold a valid licence and keep vehicle documents current. Vehicles are used for trips only after verification. Loaded and delivered weights recorded by the driver form part of the order record.',
      },
      {
        title: 'Acceptable use',
        body: 'Do not post false listings, attempt to access other users’ data, interfere with the service, or use it for unlawful trade.',
      },
      {
        title: 'Liability',
        body: 'KisanVani is provided to help parties record and coordinate trade. The quality of produce, the conduct of trips and the settlement of payments remain the responsibility of the parties involved.',
      },
    ],
  },

  notFound: {
    title: 'This page isn’t on the map',
    body: 'The link may be old, or the page may belong to a different role. Head back and try again.',
    backDashboard: 'Back to my dashboard',
    backHome: 'Back to home',
    contactSupport: 'Contact support',
  },

  auth: {
    welcomeBack: 'Welcome back',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    chooseRole: 'I am signing in as',
    identifier: 'E-mail or mobile number',
    password: 'Password',
    forgot: 'Forgot password?',
    noAccount: 'New to KisanVani?',
    createAccount: 'Create an account',
    haveAccount: 'Already registered?',
    register: 'Create account',
    registering: 'Creating account…',
    resetTitle: 'Reset your password',
    sendCode: 'Send verification code',
    verifyCode: 'Verify code',
    setNewPassword: 'Set new password',
  },

  login: {
    heroBefore: 'Manage Your ',
    heroHighlight: 'Farm-to-Market',
    heroAfter: ' Operations',
    heroBody: 'A single platform for Farmers, Shop Owners, Market Mandis and Drivers.',
    subtitle: 'Sign in to your KisanVani dashboard.',
    sessionEnded: 'Your session ended. Please sign in again.',
    identifierPlaceholder: 'Enter e-mail or mobile number',
    passwordPlaceholder: 'Enter password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },

  register: {
    heroTitle: 'Join the farm-to-market network',
    heroBody: 'Farmers, shops, mandis and drivers working from the same order.',
    title: 'Create your account',
    subtitle: 'Choose the role you work in. You can’t change it later.',
    iAmA: 'I am a',
    approvalNote: '{role} accounts are activated after an admin checks your details.',
    fixFields: 'Please correct the highlighted fields.',
    pendingTitle: 'Registration received',
    pendingBody:
      'Thanks, {name}. {role} accounts are reviewed by an admin before first sign-in. You will be able to sign in as soon as it is approved — usually within one working day.',
    optional: 'Optional',
    sections: {
      details: 'Your details',
      shop: 'Shop details',
      farm: 'Farm details',
      mandi: 'Mandi details',
      licence: 'Driving licence',
      location: 'Location',
      password: 'Set a password',
    },
    fields: {
      fullName: 'Full name',
      mobile: 'Mobile number',
      email: 'E-mail',
      emailHint: 'Needed for password reset',
      shopName: 'Shop name',
      gstin: 'GSTIN',
      farmName: 'Farm name',
      mainCrops: 'Main crops',
      mainCropsHint: 'Comma separated, e.g. Tomato, Onion',
      mandiName: 'Mandi / firm name',
      marketYard: 'Market yard',
      marketYardPlaceholder: 'e.g. K.R. Market APMC Yard',
      apmcLicence: 'APMC licence number',
      licenceNumber: 'Driving licence number',
      licenceValid: 'Licence valid until',
      yearsDriving: 'Years driving',
      village: 'Village',
      areaTown: 'Area / town',
      district: 'District',
      pincode: 'Pincode',
      password: 'Password',
      passwordHint: '8+ characters with a letter and a number',
      confirmPassword: 'Confirm password',
    },
    agreeBefore: 'I agree to the ',
    agreeTerms: 'terms',
    agreeAnd: ' and ',
    agreePrivacy: 'privacy policy',
    agreeAfter: '.',
  },

  validation: {
    required: '{label} is required',
    nameRequired: 'Name is required',
    min2: 'Enter at least 2 characters',
    tooLong: 'Too long',
    mobileRequired: 'Mobile number is required',
    mobileInvalid: 'Enter a valid 10-digit Indian mobile number',
    emailInvalid: 'Enter a valid e-mail address',
    passwordRequired: 'Password is required',
    min8: 'At least 8 characters',
    max72: 'At most 72 characters',
    letterNumber: 'Use at least one letter and one number',
    pincode: 'Pincode must be 6 digits',
    identifierRequired: 'Enter your e-mail or mobile number',
    enterPassword: 'Enter your password',
    licenceRequired: 'Licence number is required',
    licenceCheck: 'Check the licence number',
    confirmRequired: 'Confirm your password',
    mismatch: 'Passwords do not match',
    acceptTerms: 'Please accept the terms',
    codeRequired: 'Enter the code',
    codeDigits: 'The code has 6 digits',
  },

  authLayout: {
    title: 'Every kilo, accounted for — from the field to the shop counter.',
    body: 'One login for your role. Orders, weights, trips and payments stay in step for farmers, Market Mandis, shops and drivers.',
  },

  forgot: {
    body: 'Enter the e-mail or mobile number on your account. We will send a 6-digit code and a reset link to your registered e-mail.',
    remembered: 'Remembered it?',
  },

  verify: {
    title: 'Enter the verification code',
    body: 'We sent a 6-digit code to the e-mail on your account. It expires in 15 minutes.',
    devMode: 'Development mode',
    resent: 'A new code has been sent.',
    code: '6-digit code',
    resend: 'Send a new code',
    backToSignIn: 'Back to sign in',
    enterIdFirst: 'Enter your e-mail or mobile number first.',
  },

  reset: {
    missingTitle: 'Reset link missing',
    missingBody: 'Open the link from your e-mail again, or request a new code.',
    requestNew: 'Request a new code',
    doneTitle: 'Password updated',
    doneBody: 'You have been signed out on all devices. Sign in with your new password.',
    body: 'Use at least 8 characters, including a letter and a number.',
    newPassword: 'New password',
    confirmNew: 'Confirm new password',
  },
};

export default en;