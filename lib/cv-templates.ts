export const CV_TEMPLATE_IDS = [
  "british_irish",
  "germanic_tabular",
  "nordic_concise",
  "french_speaking_concise",
  "dutch_tailored",
  "southern_european",
  "europass_friendly_structured",
  "post_soviet_local_resume",
] as const

export type CvLayoutId = (typeof CV_TEMPLATE_IDS)[number]

export const CV_COUNTRIES = [
  "Albania", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belarus",
  "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus",
  "Czechia", "Denmark", "Estonia", "Finland", "France", "Georgia",
  "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo",
  "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova",
  "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway",
  "Poland", "Portugal", "Romania", "Russia", "San Marino", "Serbia",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Türkiye",
  "Ukraine", "United Kingdom", "Vatican City/Holy See",
] as const

export type CvCountry = (typeof CV_COUNTRIES)[number]

export const CV_LOCALES = [
  "en", "ga", "de", "fr", "it", "nl", "lb", "da", "fi", "sv", "is", "no",
  "ca", "el", "mt", "pt", "es", "sq", "az", "bs", "bg", "hr", "cs", "et",
  "ka", "hu", "lv", "lt", "ro", "sr", "mk", "pl", "sk", "sl", "tr", "uk",
  "hy", "be", "ru",
] as const

export type CvLocale = (typeof CV_LOCALES)[number]

export type CvPersonalField =
  | "dateOfBirth"
  | "placeOfBirth"
  | "nationality"
  | "workAuthorization"
  | "drivingLicences"
  | "references"

export interface CvRegionalOptions {
  showPhoto: boolean
  personalFields: CvPersonalField[]
  showSignature: boolean
  documentDate: string
  customFooter: string
}

export interface CvTemplateDefinition {
  id: CvLayoutId
  label: string
  shortLabel: string
  countries: readonly CvCountry[]
  description: string
  accent: string
  pageGuidance: string
  conventions: readonly string[]
  defaultOptions: CvRegionalOptions
  sectionOrder: readonly string[]
  sidebarSections: readonly string[]
}

const groups: Record<CvLayoutId, readonly CvCountry[]> = {
  british_irish: ["Ireland", "United Kingdom"],
  germanic_tabular: ["Austria", "Germany", "Liechtenstein", "Switzerland"],
  nordic_concise: ["Denmark", "Finland", "Iceland", "Norway", "Sweden"],
  french_speaking_concise: ["Belgium", "France", "Luxembourg", "Monaco"],
  dutch_tailored: ["Netherlands"],
  southern_european: [
    "Andorra", "Cyprus", "Greece", "Italy", "Malta", "Portugal", "San Marino",
    "Spain", "Vatican City/Holy See",
  ],
  europass_friendly_structured: [
    "Albania", "Azerbaijan", "Bosnia and Herzegovina", "Bulgaria", "Croatia",
    "Czechia", "Estonia", "Georgia", "Hungary", "Kosovo", "Latvia", "Lithuania",
    "Moldova", "Montenegro", "North Macedonia", "Poland", "Romania", "Serbia",
    "Slovakia", "Slovenia", "Türkiye", "Ukraine",
  ],
  post_soviet_local_resume: ["Armenia", "Belarus", "Russia"],
}

const options = (
  showPhoto: boolean,
  personalFields: CvPersonalField[] = [],
  showSignature = false,
): CvRegionalOptions => ({
  showPhoto,
  personalFields,
  showSignature,
  documentDate: "",
  customFooter: "",
})

export const CV_TEMPLATES: readonly CvTemplateDefinition[] = [
  {
    id: "british_irish", label: "British & Irish CV", shortLabel: "UK / Ireland",
    countries: groups.british_irish,
    description: "A direct, ATS-first chronology with a compact profile and achievement-led evidence.",
    accent: "#183153", pageGuidance: "1–2 A4 pages",
    conventions: ["No photo", "Reverse chronology", "ATS-first"],
    defaultOptions: options(false),
    sectionOrder: ["profile", "skills", "experience", "education", "projects", "languages", "certs", "links", "awards", "publications"],
    sidebarSections: [],
  },
  {
    id: "germanic_tabular", label: "Germanic Tabular CV", shortLabel: "Germanic",
    countries: groups.germanic_tabular,
    description: "A formal date-and-content grid with exact periods, restrained typography and optional signature.",
    accent: "#8a1c24", pageGuidance: "1–2 A4 pages",
    conventions: ["Tabular dates", "Optional photo", "Exact periods"],
    defaultOptions: options(true, ["nationality"], true),
    sectionOrder: ["profile", "experience", "education", "skills", "languages", "certs", "projects", "links", "awards", "publications"],
    sidebarSections: [],
  },
  {
    id: "nordic_concise", label: "Nordic Concise CV", shortLabel: "Nordic",
    countries: groups.nordic_concise,
    description: "Calm, airy and competence-led, with concise results and generous scanning space.",
    accent: "#0f6c72", pageGuidance: "1–2 A4 pages",
    conventions: ["Competence summary", "Minimal", "Photo optional"],
    defaultOptions: options(false),
    sectionOrder: ["profile", "skills", "experience", "projects", "education", "languages", "certs", "links", "awards", "publications"],
    sidebarSections: ["skills", "languages", "certs", "links"],
  },
  {
    id: "french_speaking_concise", label: "French-Speaking Concise CV", shortLabel: "Francophone",
    countries: groups.french_speaking_concise,
    description: "A dense, one-page-first composition with a visible target role and skills rail.",
    accent: "#22577a", pageGuidance: "1 page preferred; 2 when needed",
    conventions: ["Skills-led", "Compact", "Target role"],
    defaultOptions: options(false),
    sectionOrder: ["profile", "skills", "experience", "education", "languages", "projects", "certs", "links", "awards", "publications"],
    sidebarSections: ["profile", "skills", "languages", "certs", "links"],
  },
  {
    id: "dutch_tailored", label: "Dutch Tailored CV", shortLabel: "Dutch",
    countries: groups.dutch_tailored,
    description: "A concise, vacancy-tailored layout with a strong profile, keywords and study projects.",
    accent: "#e05b26", pageGuidance: "1 page preferred; 2 maximum",
    conventions: ["Tailored profile", "Scannable", "Study projects"],
    defaultOptions: options(false),
    sectionOrder: ["profile", "experience", "projects", "education", "skills", "languages", "certs", "links", "awards", "publications"],
    sidebarSections: ["skills", "languages", "certs", "links"],
  },
  {
    id: "southern_european", label: "Southern European CV", shortLabel: "Southern Europe",
    countries: groups.southern_european,
    description: "A warm, polished structure balancing identity, experience, languages and digital skills.",
    accent: "#9a3412", pageGuidance: "1–2 A4 pages",
    conventions: ["Optional photo", "Languages visible", "Warm accent"],
    defaultOptions: options(false),
    sectionOrder: ["profile", "experience", "projects", "education", "skills", "languages", "certs", "links", "awards", "publications"],
    sidebarSections: ["profile", "skills", "languages", "certs", "links"],
  },
  {
    id: "europass_friendly_structured", label: "Europass-Friendly Structured CV", shortLabel: "Europass-Friendly",
    countries: groups.europass_friendly_structured,
    description: "A transparent, labeled skills-and-experience structure inspired by familiar European conventions.",
    accent: "#0b5cad", pageGuidance: "Multiple A4 pages when relevant",
    conventions: ["Structured groups", "CEFR-friendly", "EU mobility"],
    defaultOptions: options(false, ["workAuthorization", "drivingLicences"]),
    sectionOrder: ["profile", "experience", "education", "skills", "languages", "certs", "projects", "awards", "publications", "links"],
    sidebarSections: [],
  },
  {
    id: "post_soviet_local_resume", label: "Post-Soviet Local Résumé", shortLabel: "Post-Soviet",
    countries: groups.post_soviet_local_resume,
    description: "A compact, one-page-first résumé with an immediate target role and exact career periods.",
    accent: "#2f4858", pageGuidance: "1 page preferred",
    conventions: ["Target role", "Optional photo", "Exact dates"],
    defaultOptions: options(true),
    sectionOrder: ["profile", "experience", "education", "skills", "languages", "certs", "projects", "links", "awards", "publications"],
    sidebarSections: ["skills", "languages", "certs", "links"],
  },
] as const

export const CV_TEMPLATE_BY_ID = Object.fromEntries(
  CV_TEMPLATES.map((template) => [template.id, template]),
) as Record<CvLayoutId, CvTemplateDefinition>

export const COUNTRY_TEMPLATE_MAP = Object.fromEntries(
  CV_TEMPLATES.flatMap((template) => template.countries.map((country) => [country, template.id])),
) as Record<CvCountry, CvLayoutId>

export const COUNTRY_LOCALES: Record<CvCountry, readonly CvLocale[]> = {
  Albania: ["sq", "en"], Andorra: ["ca", "en"], Armenia: ["hy", "ru", "en"],
  Austria: ["de", "en"], Azerbaijan: ["az", "en"], Belarus: ["be", "ru", "en"],
  Belgium: ["nl", "fr", "de", "en"], "Bosnia and Herzegovina": ["bs", "hr", "sr", "en"],
  Bulgaria: ["bg", "en"], Croatia: ["hr", "en"], Cyprus: ["el", "tr", "en"],
  Czechia: ["cs", "en"], Denmark: ["da", "en"], Estonia: ["et", "en"],
  Finland: ["fi", "sv", "en"], France: ["fr", "en"], Georgia: ["ka", "en"],
  Germany: ["de", "en"], Greece: ["el", "en"], Hungary: ["hu", "en"],
  Iceland: ["is", "en"], Ireland: ["en", "ga"], Italy: ["it", "en"],
  Kosovo: ["sq", "sr", "en"], Latvia: ["lv", "en"], Liechtenstein: ["de", "en"],
  Lithuania: ["lt", "en"], Luxembourg: ["lb", "fr", "de", "en"], Malta: ["mt", "en"],
  Moldova: ["ro", "ru", "en"], Monaco: ["fr", "en"], Montenegro: ["sr", "en"],
  Netherlands: ["nl", "en"], "North Macedonia": ["mk", "sq", "en"], Norway: ["no", "en"],
  Poland: ["pl", "en"], Portugal: ["pt", "en"], Romania: ["ro", "en"],
  Russia: ["ru", "en"], "San Marino": ["it", "en"], Serbia: ["sr", "en"],
  Slovakia: ["sk", "en"], Slovenia: ["sl", "en"], Spain: ["es", "en"],
  Sweden: ["sv", "en"], Switzerland: ["de", "fr", "it", "en"], Türkiye: ["tr", "en"],
  Ukraine: ["uk", "en"], "United Kingdom": ["en"], "Vatican City/Holy See": ["it", "en"],
}

export type TemplateSectionKey =
  | "profile" | "skills" | "languages" | "certs" | "links"
  | "experience" | "projects" | "education" | "awards" | "publications"

type TemplateLabels = Record<TemplateSectionKey, string> & { present: string }

const en: TemplateLabels = {
  profile: "Profile", skills: "Skills", languages: "Languages", certs: "Certifications",
  links: "Links", experience: "Experience", projects: "Projects", education: "Education",
  awards: "Awards", publications: "Publications", present: "Present",
}

const labelPacks: Partial<Record<CvLocale, Partial<TemplateLabels>>> = {
  ga: { profile: "Próifíl", skills: "Scileanna", languages: "Teangacha", certs: "Deimhnithe", links: "Naisc", experience: "Taithí oibre", projects: "Tionscadail", education: "Oideachas", awards: "Dámhachtainí", publications: "Foilseacháin", present: "Faoi láthair" },
  de: { profile: "Profil", skills: "Kenntnisse", languages: "Sprachen", certs: "Zertifikate", links: "Links", experience: "Berufserfahrung", projects: "Projekte", education: "Ausbildung", awards: "Auszeichnungen", publications: "Publikationen", present: "Heute" },
  fr: { profile: "Profil", skills: "Compétences", languages: "Langues", certs: "Certifications", links: "Liens", experience: "Expérience professionnelle", projects: "Projets", education: "Formation", awards: "Distinctions", publications: "Publications", present: "Aujourd’hui" },
  it: { profile: "Profilo", skills: "Competenze", languages: "Lingue", certs: "Certificazioni", links: "Collegamenti", experience: "Esperienza professionale", projects: "Progetti", education: "Formazione", awards: "Riconoscimenti", publications: "Pubblicazioni", present: "Presente" },
  nl: { profile: "Profiel", skills: "Vaardigheden", languages: "Talen", certs: "Certificaten", links: "Links", experience: "Werkervaring", projects: "Projecten", education: "Opleiding", awards: "Onderscheidingen", publications: "Publicaties", present: "Heden" },
  lb: { profile: "Profil", skills: "Kompetenzen", languages: "Sproochen", certs: "Zertifikater", links: "Linken", experience: "Beruffserfarung", projects: "Projeten", education: "Ausbildung", awards: "Auszeechnungen", publications: "Publikatiounen", present: "Aktuell" },
  es: { profile: "Perfil", skills: "Competencias", languages: "Idiomas", certs: "Certificaciones", links: "Enlaces", experience: "Experiencia profesional", projects: "Proyectos", education: "Formación", awards: "Reconocimientos", publications: "Publicaciones", present: "Actualidad" },
  pt: { profile: "Perfil", skills: "Competências", languages: "Idiomas", certs: "Certificações", links: "Ligações", experience: "Experiência profissional", projects: "Projetos", education: "Formação", awards: "Prémios", publications: "Publicações", present: "Atual" },
  ca: { profile: "Perfil", skills: "Competències", languages: "Idiomes", certs: "Certificacions", links: "Enllaços", experience: "Experiència professional", projects: "Projectes", education: "Formació", awards: "Reconeixements", publications: "Publicacions", present: "Actualitat" },
  mt: { profile: "Profil", skills: "Ħiliet", languages: "Lingwi", certs: "Ċertifikazzjonijiet", links: "Links", experience: "Esperjenza tax-xogħol", projects: "Proġetti", education: "Edukazzjoni", awards: "Premjijiet", publications: "Pubblikazzjonijiet", present: "Preżenti" },
  da: { profile: "Profil", skills: "Kompetencer", languages: "Sprog", certs: "Certificeringer", links: "Links", experience: "Erhvervserfaring", projects: "Projekter", education: "Uddannelse", awards: "Priser", publications: "Publikationer", present: "Nu" },
  sv: { profile: "Profil", skills: "Kompetenser", languages: "Språk", certs: "Certifieringar", links: "Länkar", experience: "Arbetslivserfarenhet", projects: "Projekt", education: "Utbildning", awards: "Utmärkelser", publications: "Publikationer", present: "Nuvarande" },
  fi: { profile: "Profiili", skills: "Osaaminen", languages: "Kielet", certs: "Sertifikaatit", links: "Linkit", experience: "Työkokemus", projects: "Projektit", education: "Koulutus", awards: "Palkinnot", publications: "Julkaisut", present: "Nykyinen" },
  is: { profile: "Prófíll", skills: "Hæfni", languages: "Tungumál", certs: "Vottanir", links: "Tenglar", experience: "Starfsreynsla", projects: "Verkefni", education: "Menntun", awards: "Verðlaun", publications: "Útgáfur", present: "Núverandi" },
  no: { profile: "Profil", skills: "Kompetanse", languages: "Språk", certs: "Sertifiseringer", links: "Lenker", experience: "Arbeidserfaring", projects: "Prosjekter", education: "Utdanning", awards: "Utmerkelser", publications: "Publikasjoner", present: "Nå" },
  ru: { profile: "О себе", skills: "Навыки", languages: "Языки", certs: "Сертификаты", links: "Ссылки", experience: "Опыт работы", projects: "Проекты", education: "Образование", awards: "Награды", publications: "Публикации", present: "Настоящее время" },
  uk: { profile: "Профіль", skills: "Навички", languages: "Мови", certs: "Сертифікати", links: "Посилання", experience: "Досвід роботи", projects: "Проєкти", education: "Освіта", awards: "Нагороди", publications: "Публікації", present: "Дотепер" },
  pl: { profile: "Profil", skills: "Umiejętności", languages: "Języki", certs: "Certyfikaty", links: "Linki", experience: "Doświadczenie", projects: "Projekty", education: "Wykształcenie", awards: "Nagrody", publications: "Publikacje", present: "Obecnie" },
  ro: { profile: "Profil", skills: "Competențe", languages: "Limbi", certs: "Certificări", links: "Linkuri", experience: "Experiență profesională", projects: "Proiecte", education: "Educație", awards: "Premii", publications: "Publicații", present: "Prezent" },
  tr: { profile: "Profil", skills: "Beceriler", languages: "Diller", certs: "Sertifikalar", links: "Bağlantılar", experience: "İş deneyimi", projects: "Projeler", education: "Eğitim", awards: "Ödüller", publications: "Yayınlar", present: "Günümüz" },
  el: { profile: "Προφίλ", skills: "Δεξιότητες", languages: "Γλώσσες", certs: "Πιστοποιήσεις", links: "Σύνδεσμοι", experience: "Επαγγελματική εμπειρία", projects: "Έργα", education: "Εκπαίδευση", awards: "Βραβεία", publications: "Δημοσιεύσεις", present: "Σήμερα" },
  cs: { profile: "Profil", skills: "Dovednosti", languages: "Jazyky", certs: "Certifikace", links: "Odkazy", experience: "Pracovní zkušenosti", projects: "Projekty", education: "Vzdělání", awards: "Ocenění", publications: "Publikace", present: "Současnost" },
  hu: { profile: "Profil", skills: "Készségek", languages: "Nyelvek", certs: "Tanúsítványok", links: "Hivatkozások", experience: "Szakmai tapasztalat", projects: "Projektek", education: "Tanulmányok", awards: "Díjak", publications: "Publikációk", present: "Jelenleg" },
  bg: { profile: "Профил", skills: "Умения", languages: "Езици", certs: "Сертификати", links: "Връзки", experience: "Професионален опит", projects: "Проекти", education: "Образование", awards: "Награди", publications: "Публикации", present: "До момента" },
  hr: { profile: "Profil", skills: "Vještine", languages: "Jezici", certs: "Certifikati", links: "Poveznice", experience: "Radno iskustvo", projects: "Projekti", education: "Obrazovanje", awards: "Nagrade", publications: "Publikacije", present: "Danas" },
  sr: { profile: "Profil", skills: "Veštine", languages: "Jezici", certs: "Sertifikati", links: "Linkovi", experience: "Radno iskustvo", projects: "Projekti", education: "Obrazovanje", awards: "Nagrade", publications: "Publikacije", present: "Danas" },
  sk: { profile: "Profil", skills: "Zručnosti", languages: "Jazyky", certs: "Certifikáty", links: "Odkazy", experience: "Pracovné skúsenosti", projects: "Projekty", education: "Vzdelanie", awards: "Ocenenia", publications: "Publikácie", present: "Súčasnosť" },
  sl: { profile: "Profil", skills: "Znanja", languages: "Jeziki", certs: "Certifikati", links: "Povezave", experience: "Delovne izkušnje", projects: "Projekti", education: "Izobrazba", awards: "Nagrade", publications: "Publikacije", present: "Trenutno" },
  et: { profile: "Profiil", skills: "Oskused", languages: "Keeled", certs: "Sertifikaadid", links: "Lingid", experience: "Töökogemus", projects: "Projektid", education: "Haridus", awards: "Tunnustused", publications: "Publikatsioonid", present: "Praegu" },
  lv: { profile: "Profils", skills: "Prasmes", languages: "Valodas", certs: "Sertifikāti", links: "Saites", experience: "Darba pieredze", projects: "Projekti", education: "Izglītība", awards: "Apbalvojumi", publications: "Publikācijas", present: "Pašlaik" },
  lt: { profile: "Profilis", skills: "Įgūdžiai", languages: "Kalbos", certs: "Sertifikatai", links: "Nuorodos", experience: "Darbo patirtis", projects: "Projektai", education: "Išsilavinimas", awards: "Apdovanojimai", publications: "Publikacijos", present: "Dabar" },
  sq: { profile: "Profili", skills: "Aftësitë", languages: "Gjuhët", certs: "Certifikimet", links: "Lidhje", experience: "Përvoja e punës", projects: "Projektet", education: "Arsimi", awards: "Çmime", publications: "Publikime", present: "Aktualisht" },
  az: { profile: "Profil", skills: "Bacarıqlar", languages: "Dillər", certs: "Sertifikatlar", links: "Keçidlər", experience: "İş təcrübəsi", projects: "Layihələr", education: "Təhsil", awards: "Mükafatlar", publications: "Nəşrlər", present: "Hazırda" },
  bs: { profile: "Profil", skills: "Vještine", languages: "Jezici", certs: "Certifikati", links: "Linkovi", experience: "Radno iskustvo", projects: "Projekti", education: "Obrazovanje", awards: "Nagrade", publications: "Publikacije", present: "Trenutno" },
  ka: { profile: "პროფილი", skills: "უნარები", languages: "ენები", certs: "სერტიფიკატები", links: "ბმულები", experience: "სამუშაო გამოცდილება", projects: "პროექტები", education: "განათლება", awards: "ჯილდოები", publications: "პუბლიკაციები", present: "დღემდე" },
  mk: { profile: "Профил", skills: "Вештини", languages: "Јазици", certs: "Сертификати", links: "Линкови", experience: "Работно искуство", projects: "Проекти", education: "Образование", awards: "Награди", publications: "Публикации", present: "Денес" },
  hy: { profile: "Իմ մասին", skills: "Հմտություններ", languages: "Լեզուներ", certs: "Վկայականներ", links: "Հղումներ", experience: "Աշխատանքային փորձ", projects: "Նախագծեր", education: "Կրթություն", awards: "Մրցանակներ", publications: "Հրապարակումներ", present: "Ներկա" },
  be: { profile: "Пра сябе", skills: "Навыкі", languages: "Мовы", certs: "Сертыфікаты", links: "Спасылкі", experience: "Досвед працы", projects: "Праекты", education: "Адукацыя", awards: "Узнагароды", publications: "Публікацыі", present: "Цяпер" },
}

export function labelsForLocale(locale: CvLocale): TemplateLabels {
  return { ...en, ...(labelPacks[locale] ?? {}) }
}

export function templateForCountry(country: CvCountry): CvLayoutId {
  return COUNTRY_TEMPLATE_MAP[country]
}

export function inferCvCountry(location: string): CvCountry {
  const normalized = location.toLocaleLowerCase()
  const aliases: Partial<Record<CvCountry, readonly string[]>> = {
    Italy: ["italy", "italia", "cuneo"],
    "United Kingdom": ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland"],
    Türkiye: ["türkiye", "turkey"],
    "Vatican City/Holy See": ["vatican", "holy see"],
    Russia: ["russia", "россия"],
  }
  const match = CV_COUNTRIES.find((country) =>
    [country.toLocaleLowerCase(), ...(aliases[country] ?? [])].some((value) => normalized.includes(value)),
  )
  return match ?? "Italy"
}

export function isCvCountry(value: string): value is CvCountry {
  return (CV_COUNTRIES as readonly string[]).includes(value)
}

export function isCvLocale(value: string): value is CvLocale {
  return (CV_LOCALES as readonly string[]).includes(value)
}

export function isCvLayoutId(value: string): value is CvLayoutId {
  return (CV_TEMPLATE_IDS as readonly string[]).includes(value)
}
