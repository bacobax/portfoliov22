import "dotenv/config"

import { MongoClient, type Document } from "mongodb"

import {
  CONTENT_HUB_COLLECTION,
  CONTENT_HUB_ID,
  applyEditorOperations,
  contentHubDocumentSchema,
  materializeCvPresets,
  validateHubReferences,
  type ContentHubDocument,
} from "../lib/content-hub"
import { hydrateStoredContentHub } from "../lib/content-hub-storage"
import type { CvSection, CvSectionData } from "../lib/cv-content"
import { cvPresetSchema, type CvPreset } from "../lib/cv-presets"

const SOURCE_PRESET_ID = "1772411940727-zo8azuk"
const EN_RECRUITER_ID = "cv-recruiter-en"
const IT_TECHNICAL_ID = "cv-technical-it"
const IT_RECRUITER_ID = "cv-recruiter-it"

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type SectionWithData<T extends CvSectionData["type"]> = CvSection & {
  data: Extract<CvSectionData, { type: T }>
}

function textSection(preset: CvPreset, id: string) {
  const section = preset.content.sections.find((item) => item.id === id)
  if (!section || section.data.type !== "text") {
    throw new Error(`Missing text section: ${id}`)
  }
  return section as SectionWithData<"text">
}

function tagsSection(preset: CvPreset, id: string) {
  const section = preset.content.sections.find((item) => item.id === id)
  if (!section || section.data.type !== "tags") {
    throw new Error(`Missing tags section: ${id}`)
  }
  return section as SectionWithData<"tags">
}

function listSection(preset: CvPreset, id: string) {
  const section = preset.content.sections.find((item) => item.id === id)
  if (!section || section.data.type !== "simple-list") {
    throw new Error(`Missing list section: ${id}`)
  }
  return section as SectionWithData<"simple-list">
}

function logSection(preset: CvPreset, id: string) {
  const section = preset.content.sections.find((item) => item.id === id)
  if (!section || section.data.type !== "log") {
    throw new Error(`Missing log section: ${id}`)
  }
  return section as SectionWithData<"log">
}

function entry(preset: CvPreset, sectionId: string, entryId: string) {
  const section = logSection(preset, sectionId)
  const result = section.data.entries.find((item) => item.id === entryId)
  if (!result) throw new Error(`Missing entry: ${sectionId}/${entryId}`)
  return result
}

function createVariant(
  source: CvPreset,
  input: Pick<CvPreset, "id" | "name" | "targetCountry" | "documentLanguage">,
) {
  const preset = clone(source)
  Object.assign(preset, input)
  preset.visible = true
  return preset
}

function recruiterEnglish(source: CvPreset): CvPreset {
  const preset = createVariant(source, {
    id: EN_RECRUITER_ID,
    name: "Recruiter friendly EN",
    targetCountry: "Switzerland",
    documentLanguage: "en",
  })

  preset.content.title = "AI & SOFTWARE ENGINEER"

  textSection(preset, "profile").data.content =
    "MSc student in Artificial Intelligence Systems at the University of Trento. I build and test AI systems that analyze and generate images. My research includes creating realistic infrared images to improve limited datasets, adapting image-recognition models and identifying manipulated images. I also have practical experience in software and connected-device projects, which helps me turn research ideas into complete, reliable solutions. I work methodically, compare alternatives and communicate results clearly."

  Object.assign(entry(preset, "experience", "experience-16xo1vt"), {
    title: "RESEARCH INTERN — AI & IMAGE TECHNOLOGY",
    description:
      "Developing ways to create realistic infrared images with AI so that teams can work with larger and more varied datasets. I train, adapt and compare different AI models, assess the quality of their outputs and test how the generated images can support image-analysis tasks. The work combines research, structured experimentation and specialized real-world data.",
    tags: [
      "Artificial Intelligence",
      "Image Analysis",
      "Synthetic Data",
      "Model Training",
      "Experiment Design",
      "Results Evaluation",
    ],
  })

  Object.assign(entry(preset, "experience", "experience-17l0h73"), {
    title: "SOFTWARE & CONNECTED DEVICES CONSULTANT",
    description:
      "Designed and built software, web tools and connected-device systems for practical business applications. A recent project supported port operations by linking sensors, small electronic devices and web services into one system. I contributed across planning, development and integration, coordinating the different technical parts into a working solution.",
    tags: [
      "Software Development",
      "Connected Devices",
      "System Integration",
      "Web Services",
      "Embedded Systems",
    ],
  })

  Object.assign(entry(preset, "experience", "1790106809352-oclg1op"), {
    title: "RESEARCH INTERN — AI ASSISTANT INSTRUCTIONS",
    subtitle: "University of Turin",
    description:
      "Studied how the instructions given to AI assistants affect their performance in software development, education, summarization and content creation. Built a web platform to compare different approaches, organized evaluations with domain experts and analyzed both numerical results and written feedback. The study produced practical guidance for writing clearer and more effective AI instructions.",
    tags: [
      "AI Assistants",
      "User Research",
      "Comparative Testing",
      "Web Platform Development",
    ],
  })

  Object.assign(entry(preset, "education", "education-1wwouvp"), {
    title: "MSc ARTIFICIAL INTELLIGENCE SYSTEMS",
    description:
      "Advanced study of artificial intelligence, with a focus on systems that understand or generate images and on the principles used to build, train and evaluate reliable AI solutions.",
    tags: [
      "Artificial Intelligence",
      "Image Analysis",
      "Generative AI",
      "Language Technology",
      "Signal Analysis",
    ],
  })

  Object.assign(entry(preset, "education", "education-1q6jl3k"), {
    title: "BSc COMPUTER SCIENCE",
    tags: [
      "Computer Science",
      "Software Development",
      "Problem Solving",
      "Computer Networks",
    ],
  })

  const skills = tagsSection(preset, "skills")
  skills.title = "Core Skills"
  skills.data.groups = [
    {
      category: "AI & Image Systems",
      items: [
        "Artificial Intelligence",
        "Image Recognition",
        "Generative AI",
        "Synthetic Data",
        "Model Improvement",
        "Responsible Testing",
      ],
    },
    {
      category: "Research & Analysis",
      items: [
        "Experiment Design",
        "Performance Evaluation",
        "Data Analysis",
        "Research Prototyping",
        "Technical Documentation",
      ],
    },
    {
      category: "Software Development",
      items: ["Python", "Go", "TypeScript", "JavaScript", "C"],
    },
    {
      category: "Platforms & Delivery",
      items: [
        "Cloud Services",
        "Containers",
        "Web APIs",
        "Databases",
        "Version Control",
      ],
    },
  ]

  const projects = logSection(preset, "projects")
  projects.title = "Selected AI & Software Projects"

  Object.assign(entry(preset, "projects", "project-15lhany"), {
    title: "IMPROVING IMAGE RECOGNITION WITH FEW EXAMPLES",
    subtitle: "Artificial Intelligence / Image Recognition",
    description:
      "Tested ways to help an AI image-recognition system perform well on both familiar and previously unseen categories when only a small amount of training data is available. Designed controlled comparisons of several improvement strategies and measured their effect on accuracy and balance across the two groups.",
    tags: [
      "Image Recognition",
      "Learning from Limited Data",
      "Known classes: 79.01%",
      "New classes: 75.46%",
      "Balanced score: 77.20%",
    ],
  })

  Object.assign(entry(preset, "projects", "project-15g4zj3"), {
    title: "IDENTIFYING MANIPULATED IMAGES WITH AI",
    subtitle: "Artificial Intelligence / Image Integrity",
    description:
      "Built an experimental system to detect altered images and identify which regions were manipulated. Compared several AI detectors and deliberately stressed them with difficult inputs to understand whether their reactions could reveal useful signs of image tampering.",
    tags: [
      "Image Integrity",
      "Manipulation Detection",
      "AI Reliability",
      "Performance Evaluation",
    ],
  })

  Object.assign(entry(preset, "projects", "project-1usyyss"), {
    title: "RESTORING MISSING AUDIO WITH AI",
    subtitle: "Generative Artificial Intelligence",
    description:
      "Exploring ways to reconstruct missing parts of a music recording using only that same recording as training material. Comparing several AI approaches to determine which can reproduce the missing audio most convincingly under this unusually limited-data constraint.",
    tags: [
      "Generative AI",
      "Audio Restoration",
      "Learning from Limited Data",
      "Comparative Testing",
    ],
  })

  Object.assign(entry(preset, "projects", "project-126znq9"), {
    title: "SIMULATING ANTIBIOTIC RESISTANCE",
    subtitle: "Artificial Intelligence / Scientific Simulation",
    description:
      "Developed a two-dimensional simulation showing how different bacterial populations grow and adapt under antibiotic treatment. The model represents factors such as resistance, protective communities, information exchange between bacteria and environmental conditions, allowing different treatment strategies to be compared.",
    tags: [
      "Scientific Simulation",
      "Artificial Intelligence",
      "Antibiotic Resistance",
      "Experimental Evaluation",
    ],
  })

  return cvPresetSchema.parse(preset)
}

function technicalItalian(source: CvPreset): CvPreset {
  const preset = createVariant(source, {
    id: IT_TECHNICAL_ID,
    name: "Tecnico IT",
    targetCountry: "Italy",
    documentLanguage: "it",
  })

  preset.content.title = "INGEGNERE DI COMPUTER VISION E MACHINE LEARNING"
  preset.content.location = "Cuneo, Italia"
  preset.regionalOptions.personalFields = []
  if (preset.content.profileExtras) {
    preset.content.profileExtras.nationality = "Italiana"
  }

  const profile = textSection(preset, "profile")
  profile.title = "Profilo"
  profile.data.content =
    "Studente del corso di laurea magistrale in Artificial Intelligence Systems presso l'Università di Trento, con specializzazione in computer vision, deep learning e modelli generativi. Esperienza di ricerca nella generazione di immagini infrarosse sintetiche mediante modelli di diffusione e flow matching, affiancata da attività pratiche sull'adattamento di CLIP, sulla localizzazione di manipolazioni nelle immagini e sulla robustezza avversariale. Mi interessa trasformare la ricerca più recente in implementazioni funzionanti, progettare esperimenti controllati e valutare approcci alternativi. La mia esperienza più ampia nell'ingegneria del software mi permette di affrontare i problemi di machine learning come sistemi end-to-end, non come modelli isolati."

  const experience = logSection(preset, "experience")
  experience.title = "Esperienza professionale"

  Object.assign(entry(preset, "experience", "experience-16xo1vt"), {
    title: "TIROCINANTE DI RICERCA — COMPUTER VISION E IA GENERATIVA",
    subtitle: "École de technologie supérieure (ÉTS) — Montréal, Canada",
    description:
      "Ricerca sulla generazione di dati sintetici per immagini infrarosse mediante approcci generativi moderni, tra cui modelli di diffusione e flow matching. Addestramento e fine-tuning di modelli generativi per ampliare dataset di immagini infrarosse e studio della loro applicazione alla computer vision. L'attività comprende sperimentazione con metodi allo stato dell'arte, valutazione dei modelli e utilizzo di dati d'immagine specialistici provenienti da contesti reali.",
    tags: [
      "Computer Vision",
      "PyTorch",
      "IA generativa",
      "Modelli di diffusione",
      "Flow Matching",
      "Addestramento e fine-tuning",
    ],
  })

  Object.assign(entry(preset, "experience", "experience-17l0h73"), {
    title: "CONSULENTE SOFTWARE E IOT",
    description:
      "Progettazione e sviluppo di soluzioni software, web e IoT per applicazioni reali. Tra i lavori recenti, un sistema IoT per applicazioni portuali che integra MQTT, Zigbee, HTTP/REST e componenti embedded. Il ruolo comprende progettazione software, implementazione e integrazione tra le diverse componenti del sistema.",
    tags: [
      "Ingegneria del software",
      "IoT",
      "MQTT",
      "Zigbee",
      "API REST",
      "Firmware",
    ],
  })

  Object.assign(entry(preset, "experience", "1790106809352-oclg1op"), {
    title: "TIROCINANTE DI RICERCA — ANALISI DI SYSTEM E USER PROMPT",
    subtitle: "Università degli Studi di Torino",
    description:
      "Ricerca sulle strategie di system prompting per modelli linguistici di grandi dimensioni in ambiti quali programmazione, formazione, sintesi e creazione di contenuti. Progettazione e sviluppo di una piattaforma full-stack di valutazione con Next.js, React, LangChain, Ollama e modelli linguistici locali. Organizzazione di test comparativi con esperti di dominio, analisi di feedback quantitativi e qualitativi e definizione di linee guida pratiche per progettare system prompt più efficaci.",
    tags: ["Prompt Engineering", "LLM", "LangChain", "Next.js"],
  })

  const education = logSection(preset, "education")
  education.title = "Formazione"

  Object.assign(entry(preset, "education", "education-1wwouvp"), {
    title: "LAUREA MAGISTRALE IN ARTIFICIAL INTELLIGENCE SYSTEMS",
    subtitle: "Università di Trento",
    description:
      "Formazione avanzata in machine learning e intelligenza artificiale, con particolare interesse per computer vision, modelli generativi e fondamenti teorici del deep learning moderno.",
    tags: [
      "Computer Vision",
      "Deep Learning",
      "Ingegneria dell'IA",
      "NLP",
      "Elaborazione dei segnali",
    ],
  })

  Object.assign(entry(preset, "education", "education-1q6jl3k"), {
    title: "LAUREA TRIENNALE IN INFORMATICA",
    subtitle: "Università degli Studi di Torino",
    tags: [
      "Informatica",
      "Ingegneria del software",
      "Algoritmi",
      "Reti di calcolatori",
    ],
  })

  const skills = tagsSection(preset, "skills")
  skills.title = "Competenze tecniche"
  skills.data.groups = [
    {
      category: "Computer Vision e ML",
      items: [
        "PyTorch",
        "Computer Vision",
        "Deep Learning",
        "CLIP",
        "IA generativa",
        "Modelli di diffusione",
        "Flow Matching",
        "Machine Learning avversariale",
        "Reinforcement Learning",
      ],
    },
    {
      category: "Workflow ML",
      items: [
        "Addestramento di modelli",
        "Fine-tuning",
        "Valutazione di modelli",
        "Studi di ablazione",
        "Data Augmentation",
        "Prototipazione di ricerca",
      ],
    },
    {
      category: "Programmazione",
      items: ["Python", "Go", "TypeScript", "JavaScript", "C"],
    },
    {
      category: "Ingegneria del software",
      items: ["Docker", "AWS", "Node.js", "API REST", "PostgreSQL", "Git"],
    },
  ]

  const languages = listSection(preset, "languages")
  languages.title = "Lingue"
  languages.data.items = [
    "Italiano — Madrelingua",
    "Inglese — B2 (certificazione Cambridge)",
    "Inglese — C1/C2 (autovalutazione)",
  ]

  const certifications = listSection(preset, "certs")
  certifications.title = "Certificazioni"
  certifications.data.items = ["Cambridge English — B2"]

  const projects = logSection(preset, "projects")
  projects.title = "Progetti selezionati di Computer Vision e Machine Learning"

  Object.assign(entry(preset, "projects", "project-15lhany"), {
    title: "ADATTAMENTO FEW-SHOT DI CLIP",
    subtitle: "Computer Vision / Modelli visione-linguaggio",
    dateStart: "COMPLETATO",
    description:
      "Studio di metodi per migliorare la generalizzazione di CLIP nella classificazione di classi note e non osservate, a partire dall'approccio CoCoOp. Progettazione e valutazione di metodi alternativi mediante esperimenti di ablazione, tra cui distillazione con divergenza KL, generalizzazione avversariale di dominio con clustering e data augmentation.",
    tags: [
      "CLIP",
      "CoCoOp",
      "Few-Shot Learning",
      "Classi note: 79,01%",
      "Classi non osservate: 75,46%",
      "Media armonica: 77,20%",
    ],
  })

  Object.assign(entry(preset, "projects", "project-15g4zj3"), {
    title: "RILEVAMENTO DI MANIPOLAZIONI TRAMITE SENSIBILITÀ AVVERSARIALE",
    subtitle: "Computer Vision / Machine Learning avversariale",
    dateStart: "COMPLETATO",
    description:
      "Sviluppo di un framework sperimentale per rilevare e localizzare manipolazioni nelle immagini sfruttando vulnerabilità e sensibilità avversariale dei rilevatori di immagini artificiali basati su IA. Valutazione di diversi modelli di rilevamento e strategie di attacco avversariale per studiare come la sensibilità del modello possa fornire segnali utili alla localizzazione delle manipolazioni.",
    tags: [
      "Computer Vision",
      "Localizzazione di manipolazioni",
      "Machine Learning avversariale",
      "Valutazione di modelli",
    ],
  })

  Object.assign(entry(preset, "projects", "project-1usyyss"), {
    title: "INPAINTING AUDIO CON OVERFITTING",
    subtitle: "IA generativa",
    dateStart: "IN CORSO",
    description:
      "Studio di approcci generativi per ricostruire regioni mancanti di un segnale audio musicale con un vincolo estremo di apprendimento da un singolo campione: il sistema può essere addestrato esclusivamente sulla traccia audio di destinazione. Gli esperimenti includono masked autoencoder, modelli di diffusione e addestramento avversariale.",
    tags: [
      "IA generativa",
      "Modelli di diffusione",
      "Masked Autoencoder",
      "Addestramento avversariale",
    ],
  })

  Object.assign(entry(preset, "projects", "project-126znq9"), {
    title: "SIMULAZIONE MICROBICA DI ANTIBIOTICI CON REINFORCEMENT LEARNING",
    subtitle: "Machine Learning / Simulazione",
    dateStart: "COMPLETATO",
    description:
      "Sviluppo di una simulazione bidimensionale agent-based di popolazioni batteriche eterogenee che evolvono sotto stress antibiotico. Il sistema modella crescita, resistenza, formazione di biofilm, quorum sensing, trasferimento genico orizzontale e campi ambientali per studiare l'adattamento emergente in diversi regimi antibiotici.",
    tags: [
      "Reinforcement Learning",
      "Simulazione agent-based",
      "Valutazione sperimentale",
    ],
  })

  return cvPresetSchema.parse(preset)
}

function recruiterItalian(source: CvPreset): CvPreset {
  const preset = createVariant(source, {
    id: IT_RECRUITER_ID,
    name: "Recruiter friendly IT",
    targetCountry: "Italy",
    documentLanguage: "it",
  })

  preset.content.title = "INGEGNERE IA E SOFTWARE"
  preset.content.location = "Cuneo, Italia"
  preset.regionalOptions.personalFields = []
  if (preset.content.profileExtras) {
    preset.content.profileExtras.nationality = "Italiana"
  }

  const profile = textSection(preset, "profile")
  profile.title = "Profilo"
  profile.data.content =
    "Studente del corso di laurea magistrale in Artificial Intelligence Systems presso l'Università di Trento. Progetto e valuto sistemi di intelligenza artificiale che analizzano e generano immagini. La mia ricerca comprende la creazione di immagini infrarosse realistiche per ampliare dataset limitati, il miglioramento di modelli di riconoscimento visivo e l'individuazione di immagini manipolate. Ho inoltre esperienza pratica nello sviluppo software e nei sistemi di dispositivi connessi, che mi permette di trasformare idee di ricerca in soluzioni complete e affidabili. Lavoro in modo metodico, confronto approcci alternativi e comunico i risultati con chiarezza."

  const experience = logSection(preset, "experience")
  experience.title = "Esperienza professionale"

  Object.assign(entry(preset, "experience", "experience-16xo1vt"), {
    title: "TIROCINANTE DI RICERCA — IA E TECNOLOGIE PER LE IMMAGINI",
    subtitle: "École de technologie supérieure (ÉTS) — Montréal, Canada",
    description:
      "Sviluppo di metodi per creare immagini infrarosse realistiche con l'intelligenza artificiale, così da mettere a disposizione dataset più ampi e diversificati. Addestro, adatto e confronto diversi modelli, valuto la qualità dei risultati e verifico come le immagini generate possano supportare attività di analisi visiva. Il lavoro unisce ricerca, sperimentazione strutturata e dati specialistici provenienti da contesti reali.",
    tags: [
      "Intelligenza artificiale",
      "Analisi delle immagini",
      "Dati sintetici",
      "Addestramento di modelli",
      "Progettazione di esperimenti",
      "Valutazione dei risultati",
    ],
  })

  Object.assign(entry(preset, "experience", "experience-17l0h73"), {
    title: "CONSULENTE SOFTWARE E DISPOSITIVI CONNESSI",
    description:
      "Progettazione e sviluppo di software, strumenti web e sistemi di dispositivi connessi per applicazioni aziendali concrete. Un progetto recente ha supportato operazioni portuali collegando sensori, piccoli dispositivi elettronici e servizi web in un unico sistema. Ho contribuito alla pianificazione, allo sviluppo e all'integrazione, coordinando le diverse componenti tecniche fino alla realizzazione di una soluzione funzionante.",
    tags: [
      "Sviluppo software",
      "Dispositivi connessi",
      "Integrazione di sistemi",
      "Servizi web",
      "Sistemi embedded",
    ],
  })

  Object.assign(entry(preset, "experience", "1790106809352-oclg1op"), {
    title: "TIROCINANTE DI RICERCA — ISTRUZIONI PER ASSISTENTI IA",
    subtitle: "Università degli Studi di Torino",
    description:
      "Studio dell'effetto delle istruzioni sulle prestazioni degli assistenti di intelligenza artificiale in ambiti quali sviluppo software, formazione, sintesi e creazione di contenuti. Ho realizzato una piattaforma web per confrontare diversi approcci, organizzato valutazioni con esperti di dominio e analizzato risultati numerici e feedback scritti. Lo studio ha prodotto indicazioni pratiche per formulare istruzioni più chiare ed efficaci.",
    tags: [
      "Assistenti IA",
      "Ricerca con utenti",
      "Test comparativi",
      "Sviluppo di piattaforme web",
    ],
  })

  const education = logSection(preset, "education")
  education.title = "Formazione"

  Object.assign(entry(preset, "education", "education-1wwouvp"), {
    title: "LAUREA MAGISTRALE IN ARTIFICIAL INTELLIGENCE SYSTEMS",
    subtitle: "Università di Trento",
    description:
      "Formazione avanzata in intelligenza artificiale, con particolare attenzione ai sistemi che comprendono o generano immagini e ai principi necessari per progettare, addestrare e valutare soluzioni IA affidabili.",
    tags: [
      "Intelligenza artificiale",
      "Analisi delle immagini",
      "IA generativa",
      "Tecnologie del linguaggio",
      "Analisi dei segnali",
    ],
  })

  Object.assign(entry(preset, "education", "education-1q6jl3k"), {
    title: "LAUREA TRIENNALE IN INFORMATICA",
    subtitle: "Università degli Studi di Torino",
    tags: [
      "Informatica",
      "Sviluppo software",
      "Problem solving",
      "Reti di calcolatori",
    ],
  })

  const skills = tagsSection(preset, "skills")
  skills.title = "Competenze principali"
  skills.data.groups = [
    {
      category: "IA e sistemi per le immagini",
      items: [
        "Intelligenza artificiale",
        "Riconoscimento di immagini",
        "IA generativa",
        "Dati sintetici",
        "Miglioramento di modelli",
        "Test di affidabilità",
      ],
    },
    {
      category: "Ricerca e analisi",
      items: [
        "Progettazione di esperimenti",
        "Valutazione delle prestazioni",
        "Analisi dei dati",
        "Prototipazione",
        "Documentazione tecnica",
      ],
    },
    {
      category: "Sviluppo software",
      items: ["Python", "Go", "TypeScript", "JavaScript", "C"],
    },
    {
      category: "Piattaforme e rilascio",
      items: [
        "Servizi cloud",
        "Container",
        "API web",
        "Database",
        "Controllo di versione",
      ],
    },
  ]

  const languages = listSection(preset, "languages")
  languages.title = "Lingue"
  languages.data.items = [
    "Italiano — Madrelingua",
    "Inglese — B2 (certificazione Cambridge)",
    "Inglese — C1/C2 (autovalutazione)",
  ]

  const certifications = listSection(preset, "certs")
  certifications.title = "Certificazioni"
  certifications.data.items = ["Cambridge English — B2"]

  const projects = logSection(preset, "projects")
  projects.title = "Progetti selezionati di IA e software"

  Object.assign(entry(preset, "projects", "project-15lhany"), {
    title: "MIGLIORAMENTO DEL RICONOSCIMENTO VISIVO CON POCHI ESEMPI",
    subtitle: "Intelligenza artificiale / Riconoscimento di immagini",
    dateStart: "COMPLETATO",
    description:
      "Valutazione di metodi per aiutare un sistema di riconoscimento visivo a funzionare bene sia su categorie note sia su categorie mai viste, disponendo di pochi dati di addestramento. Ho progettato confronti controllati tra diverse strategie di miglioramento e misurato il loro effetto sull'accuratezza e sull'equilibrio tra i due gruppi.",
    tags: [
      "Riconoscimento di immagini",
      "Apprendimento con pochi dati",
      "Categorie note: 79,01%",
      "Nuove categorie: 75,46%",
      "Punteggio bilanciato: 77,20%",
    ],
  })

  Object.assign(entry(preset, "projects", "project-15g4zj3"), {
    title: "INDIVIDUAZIONE DI IMMAGINI MANIPOLATE CON L'IA",
    subtitle: "Intelligenza artificiale / Integrità delle immagini",
    dateStart: "COMPLETATO",
    description:
      "Realizzazione di un sistema sperimentale per rilevare immagini alterate e individuare le aree manipolate. Ho confrontato diversi rilevatori basati su intelligenza artificiale e li ho messi intenzionalmente alla prova con input difficili, per capire se le loro reazioni potessero rivelare segnali utili di manomissione.",
    tags: [
      "Integrità delle immagini",
      "Rilevamento di manipolazioni",
      "Affidabilità dell'IA",
      "Valutazione delle prestazioni",
    ],
  })

  Object.assign(entry(preset, "projects", "project-1usyyss"), {
    title: "RICOSTRUZIONE DI AUDIO MANCANTE CON L'IA",
    subtitle: "Intelligenza artificiale generativa",
    dateStart: "IN CORSO",
    description:
      "Studio di metodi per ricostruire parti mancanti di una registrazione musicale utilizzando come materiale di addestramento soltanto la registrazione stessa. Confronto diversi approcci di intelligenza artificiale per determinare quale riesca a riprodurre l'audio mancante in modo più convincente nonostante la quantità estremamente limitata di dati.",
    tags: [
      "IA generativa",
      "Restauro audio",
      "Apprendimento con pochi dati",
      "Test comparativi",
    ],
  })

  Object.assign(entry(preset, "projects", "project-126znq9"), {
    title: "SIMULAZIONE DELLA RESISTENZA AGLI ANTIBIOTICI",
    subtitle: "Intelligenza artificiale / Simulazione scientifica",
    dateStart: "COMPLETATO",
    description:
      "Sviluppo di una simulazione bidimensionale che mostra come diverse popolazioni batteriche crescono e si adattano durante un trattamento antibiotico. Il modello rappresenta fattori quali resistenza, comunità protettive, scambio di informazioni tra batteri e condizioni ambientali, permettendo di confrontare diverse strategie di trattamento.",
    tags: [
      "Simulazione scientifica",
      "Intelligenza artificiale",
      "Resistenza agli antibiotici",
      "Valutazione sperimentale",
    ],
  })

  return cvPresetSchema.parse(preset)
}

async function main() {
  const apply = process.argv.includes("--apply")
  const uri = process.env.MONGODB_ATLAS_URI
  if (!uri) throw new Error("MONGODB_ATLAS_URI is not set")

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB || undefined)
    const collection = db.collection<{ _id: string } & Document>(CONTENT_HUB_COLLECTION)
    const raw = await collection.findOne({ _id: CONTENT_HUB_ID })
    if (!raw) throw new Error("Content hub not found")

    const hub = contentHubDocumentSchema.parse(
      hydrateStoredContentHub(raw as Record<string, unknown>),
    ) as ContentHubDocument
    const source = hub.publishedPresets.find((preset) => preset.id === SOURCE_PRESET_ID)
    if (!source) throw new Error("Published source CV not found")

    const variants = [
      recruiterEnglish(source),
      technicalItalian(source),
      recruiterItalian(source),
    ]

    let next = clone(hub)
    for (const variant of variants) {
      if (!next.presets.some((preset) => preset.id === variant.id)) {
        const sourceConfig = next.presets.find((preset) => preset.id === SOURCE_PRESET_ID)
        if (!sourceConfig) throw new Error("Draft source CV not found")
        next.presets.push({
          ...clone(sourceConfig),
          id: variant.id,
          name: variant.name,
          targetCountry: variant.targetCountry,
          documentLanguage: variant.documentLanguage,
          visible: true,
        })
      }
      const drafts = materializeCvPresets(next).filter((preset) => preset.id !== variant.id)
      next = applyEditorOperations(next, [
        {
          type: "replace-presets",
          presets: [...drafts, variant],
          activePresetId: variant.id,
        },
        { type: "publish-cv", presetId: variant.id },
      ])
    }
    next.revision = hub.revision + 1
    next.updatedAt = new Date().toISOString()

    const referenceErrors = validateHubReferences(next)
    if (referenceErrors.length > 0) {
      throw new Error(`Invalid references: ${referenceErrors.join(", ")}`)
    }
    const validated = contentHubDocumentSchema.parse(next) as ContentHubDocument

    const report = {
      status: apply ? "applied" : "dry-run",
      source: { id: source.id, name: source.name },
      fromRevision: hub.revision,
      toRevision: validated.revision,
      created: variants.map((preset) => ({
        id: preset.id,
        name: preset.name,
        locale: preset.documentLanguage,
        visible: preset.visible,
      })),
      publicCvCount: validated.publishedPresets.filter((preset) => preset.visible).length,
    }

    if (apply) {
      const backupId = `${CONTENT_HUB_ID}-before-cv-variants-${Date.now()}`
      await db.collection<{ _id: string } & Document>("content_hub_backups").insertOne({
        ...raw,
        _id: backupId,
        backedUpAt: new Date().toISOString(),
        reason: "Before creating English and Italian technical/recruiter CV variants",
      })
      const result = await collection.replaceOne(
        { _id: CONTENT_HUB_ID, revision: hub.revision },
        validated as ContentHubDocument & Document,
        { ignoreUndefined: true },
      )
      if (result.modifiedCount !== 1) {
        throw new Error("Content hub changed during the update; no CV variants were written")
      }
      Object.assign(report, { backupId })
    }

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
