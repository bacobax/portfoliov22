# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: tech recruiters and hiring managers** screening candidates for AI engineering and full-stack engineering roles. They arrive with limited time, skim to judge fit, and success means they open the CV or get in touch.

**Secondary: Francesco, as the sole editor**, who signs in to edit portfolio content (content hub, inline editing), and to build, tailor, and export CVs for specific applications.

## Product Purpose

Francesco Bassignana's personal portfolio and career toolkit.

- **Public portfolio** (`/`, `/projects/[categoryId]/[projectSlug]`): shows who Francesco is, what they have built, their experience and education, and how they work, so a recruiter can decide quickly to pursue the profile.
- **CV system** (`/cv`, `/cv/edit`, `/cv/tailor`): private, versioned CV documents generated from the same canonical content, with regional layouts on screen and an ATS-friendly text-first PDF export, plus AI-assisted tailoring to a job.

Success: a recruiter understands the research-to-production profile within the first screens and acts (CV, contact); Francesco can produce an accurate, tailored, ATS-safe CV from one source of truth.

## Positioning

Research first, shipping proven. A master's student in Artificial Intelligence Systems (University of Trento) who understands and derives the theory behind state-of-the-art work and then builds systems that actually run, end to end, from data and evaluation to deployment. Research interests: reinforcement learning, audio and music signal processing, image processing, and generative AI for images.

Supporting proof, not the headline: Francesco uses AI coding agents (Claude Code, Codex) throughout development for planning, implementation, debugging, and review, while architecture, judgment, validation, and the final quality bar stay Francesco's.

## Operating Context

- Recruiters skim on desktop and mobile. Entry points include the hero, a five-chapter guided tour, semantic search over the content, and direct links to the CV.
- Public sections: hero, About (story), Capabilities, Work (featured plus all projects by category), AI Workflow (Inspect, Plan, Build, Verify), Experience, Contact.
- Editor workflow: password session, content hub drawer, inline editable text, project/education forms, image and document uploads via Cloudinary, content stored in MongoDB.
- CV workflow: CV JSON documents versioned in MongoDB Atlas, edited in the UI or via `npm run cv` (pull, validate, push, publish). Drafts stay private until published. See `docs/cv-agent-workflow.md`.

## Capabilities and Constraints

- Next.js 15 (App Router), React 19, Tailwind 4, Radix/shadcn UI, deployed on Vercel.
- Light and dark theme modes with editor-configurable theme colours.
- Semantic search runs on precomputed embeddings (`public/semantic/embeddings.json`, built by `npm run build:embeddings`).
- AI rewrite and CV tailoring endpoints use Google GenAI.
- CV PDF export must stay ATS-safe: one semantic column, authored section order, visible link text, a system font, at least 10.5 pt body and 12 mm margins, no photos or decorative styling in the PDF. No content is truncated to hit a page count.
- Content is editable at runtime; any surface must survive real, variable-length content, not only the defaults.

## Brand Commitments

- Name: Francesco Bassignana.
- Voice: precise, plain-spoken copy in content sections ("I build AI systems and full-stack software."; "I use AI agents throughout development. I remain responsible for the result."). Playful personality is intentional and stays in the guided tour and the mascot (e.g. "speed-run", "Keep your hands inside the browser").
- Particle identity: the hero **formation blob** (eyeless, morphs into particle text) and the **puppet** mascot (small, with two eyes, travels between sections, opens semantic search) are two separate entities on every screen size. Never merge them, never give the formation eyes.

## Evidence on Hand

- Real profile, projects, experience, education, and contact data live in MongoDB via the content hub, not in the repo.
- `lib/default-content.ts` holds **placeholder** fallbacks (e.g. "TechCorp Industries", "StartupXYZ", 10M+ requests/day). These are not real claims and must never be presented or extended as fact.
- About story copy in `components/portfolio/about-story.tsx`; guided tour copy in `components/portfolio/guided-tour.tsx`.
- No testimonials, client logos, press, or third-party metrics exist. Do not fabricate any.

## Product Principles

1. **Recruiter time is the budget.** The research-to-production profile and the path to the CV or contact must be legible fast.
2. **Research first, proof by running systems.** Lead with depth of understanding, back it with things that work.
3. **Own the result.** AI assistance is shown openly, always paired with Francesco's accountability for quality.
4. **One source of truth.** Portfolio and CV derive from the same canonical content; never duplicate or diverge it.
5. **Personality with discipline.** Play lives in the tour and mascot; content sections stay exact and factual.
