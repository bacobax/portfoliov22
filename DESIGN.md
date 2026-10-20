---
name: Francesco Bassignana Portfolio
description: Research-first AI and full-stack engineer, typeset like a printed lab notebook.
colors:
  paper: "#a2b6dc"
  paper-soft: "#adbede"
  signal: "#bad1fd"
  volt-fallback: "#f4ee62"
  periwinkle-fallback: "#aba6f1"
  ink: "#101014"
  ink-2: "#1b1b22"
  cream: "#f4f1e8"
  night: "#0a0a0e"
  night-2: "#121219"
  rule-light: "rgba(16,16,20,.22)"
  rule-dark: "rgba(171,166,241,.22)"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "clamp(3.35rem, 7vw, 7.25rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "clamp(2.3rem, 6.4vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline-thin:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "clamp(2.3rem, 6.4vw, 5.4rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "clamp(1.7rem, 3.6vw, 3rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, 'Helvetica Neue', sans-serif"
    fontSize: "clamp(1rem, 1.15vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(.66rem, .8vw, .78rem)"
    fontWeight: 400
    letterSpacing: "0.18em"
rounded:
  sm: "8px"
  md: "12px"
  hud: "16px"
  panel: "18px"
  stage: "28px"
  pill: "99px"
spacing:
  gutter: "clamp(20px, 5vw, 76px)"
  section: "clamp(78px, 11vh, 132px)"
  container: "1480px"
  grid-gap: "clamp(28px, 5vw, 80px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: ".85em 1.5em"
    height: "48px"
  button-primary-on-night:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: ".85em 1.5em"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: ".85em 1.5em"
  button-ghost-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
    height: "34px"
  media-frame:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
  ink-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "clamp(18px, 2.4vw, 30px)"
  floating-hud:
    backgroundColor: "rgba(13,13,18,.9)"
    textColor: "{colors.cream}"
    rounded: "{rounded.hud}"
    padding: "7px"
---

# Design System: Francesco Bassignana Portfolio

## Overview

**Creative North Star: "The Lab Notebook, Printed"**

Research rigour set like an editorial print piece. The page is a single tinted paper field, ruled by hairlines into columns and rows the way a lab notebook is ruled, with heavy, tightly tracked grotesk headlines doing the talking and small uppercase mono annotations labelling everything else: indices (`01`, `02`), section kickers, dates, tool names. It reads as something a careful researcher wrote down and then had typeset, not as a SaaS landing page.

The rhythm alternates between daylight and a dark working room. Paper sections (hero, capabilities, about) hold identity and reading; when the visitor scrolls into Work, AI Workflow, Experience, or Contact the whole site crossfades (0.7s) to near-black night, and the paper colour becomes the type colour. Density is generous: large section padding, wide gutters, few elements per row, and long measures capped at 36 to 52ch. The only living things are the particle systems (the hero formation blob, the eyed puppet mascot, the Claude Code / Codex morph) and one signal colour.

The paper hue is not fixed. The editor chooses a theme colour; the system blends it 14% toward ink so the field reads as a deepened surface rather than a pastel. Every surface, rule, and accent must keep working whatever hue lands there.

**Key Characteristics:**
- One tinted paper field that swaps wholesale to night for dark sections; no per-card colour.
- Archivo 800 at very large sizes with negative tracking; IBM Plex Mono uppercase for every label.
- Hairline rules (1px) build the grid; 1.5px rules mark emphasis (proof rail, ticker, ghost buttons).
- Fully rounded ink pills for actions; 18px rounded dark frames for media and panels.
- Particle motion and a single signal dot are the only ornament.

## Colors

A user-tinted paper and ink pair with a near-black night room, plus one signal colour used as a dot, not a fill.

### Primary
- **Notebook Paper** (`paper`): the page field in light sections and the type colour in dark sections. Derived at runtime as `color-mix(theme 86%, #0d0d12)`; the value in the frontmatter is the current production theme (hsl 219 94% 86%). Light mode (`editorial-soft`) blends 92% toward `#101014` with cream `#f4f1e8` as fallback.
- **Paper Wash** (`paper-soft`): paper lifted 13% toward cream. Used for the large tour start button and other soft fills that sit on ink.

### Secondary
- **Signal** (`signal`): the live accent, set to the same hue as the theme colour. Appears as small dots (tool key, tour status, pill blip), the progress bar fill, the duality knob, and the underline behind flipping words. Never a large fill.
- **Volt Fallback** (`volt-fallback`): the electric yellow accent used when no theme is set, and still hard-coded in some glows and gradients (e.g. `rgba(244,238,98,.3)` halos, the featured project mark gradient).
- **Periwinkle Fallback** (`periwinkle-fallback`): the original paper hue, still the base of the dark-section rule colour and of several decorative gradients.

### Neutral
- **Notebook Ink** (`ink`): body and headline type on paper, primary button fill, panel and tag fill.
- **Ink Two** (`ink-2`): secondary dark surface.
- **Cream** (`cream`): type on ink panels and buttons, the light half of tags.
- **Night** (`night`): the dark-section field and the background of media frames and the hero morph stage.
- **Night Two** (`night-2`): background of procedural project previews.
- **Light Rule** (`rule-light`) and **Dark Rule** (`rule-dark`): all hairlines, switched by section tone.

### Named Rules
**The One Field Rule.** The background belongs to the whole site, not to a section or card. Dark sections are declared with `data-editorial-theme="dark"`, and the site swaps `--bg`, `--fg`, and `--rule` together. Never paint a section its own background.

**The Signal Dot Rule.** The signal colour appears at dot, line, or underline scale only (5 to 15px dots, 2 to 6px bars, a 0.09em underline). If it covers an area larger than a button, it is wrong.

**The Any-Hue Rule.** The paper hue is editor-chosen. Never hard-code a new colour that only works with periwinkle or blue; derive from `--paper`, `--ink`, `--fg`, `--bg`, and `--rule`.

## Typography

**Display Font:** Archivo (with system-ui, Helvetica Neue)
**Body Font:** Archivo, the same family at 400
**Label/Mono Font:** IBM Plex Mono (with ui-monospace, Menlo)

**Character:** A single heavy grotesk carries both shout and speech, while the mono adds the notebook's handwriting: precise, uppercase, widely tracked marginalia. The contrast between 800-weight headlines and 0.7rem tracked mono is the whole voice.

### Hierarchy
- **Display** (800, clamp(3.35rem, 7vw, 7.25rem), 0.88): the hero headline only, max 9.6ch wide, balanced wrapping. Contact headline and footer wordmark run in the same register (up to 15rem for the wordmark).
- **Headline** (800, clamp(2.3rem, 6.4vw, 5.4rem), 1.0): section h2s. Often split: a bold statement followed by a `.thin` 300-weight clause ("I use AI agents throughout development. *I remain responsible for the result.*").
- **Title** (800, clamp(1.7rem, 3.6vw, 3rem), ~1.0, -0.025 to -0.04em): project names, roles, workflow steps, capability groups.
- **Body** (400, clamp(1rem, 1.15vw, 1.15rem), 1.55): paragraphs capped at 36 to 52ch. Lead copy steps up to 1.18 to 1.24rem.
- **Label** (400 to 500, clamp(.66rem, .8vw, .78rem), 0.18em, uppercase): section kickers, indices, dates, tags, nav links, tool names. Usually at 55 to 72% opacity.

### Named Rules
**The Marginalia Rule.** Anything that is metadata (index numbers, dates, categories, statuses, counts, tool names) is set in uppercase IBM Plex Mono with wide tracking. Anything that is a claim or a name is set in Archivo.

**The Tight Heavy Rule.** Headlines at 800 always carry negative tracking (-0.02em to -0.055em) and line-height at or below 1.0. Never set a large Archivo headline at default tracking.

## Layout

A 1480px container with fluid gutters (`clamp(20px, 5vw, 76px)`). Sections are separated by generous vertical padding (`clamp(78px, 11vh, 132px)`) and a full-width hairline at the top of each section.

The dominant grid is asymmetric: 8fr headline against 4fr supporting copy (section intros, hero), or 7fr against 5fr (hero with morph stage, about with education). Content lists are hairline-ruled grids: 3 columns for featured projects and capabilities, 4 for workflow steps, a 3-column 70px / 4fr / 5fr row for experience. Cells are divided by 1px vertical rules, not gaps.

Responsive behaviour: at 1080px, three-column grids become two with the third item spanning; at 820px, intros and the hero stack to one column and the section progress rail moves to the right edge; at 760px, the WebGL particle layer and mascot hitbox are hidden; at 560px, every grid collapses to one column and primary buttons go full width. A fixed left-edge section progress rail (dashes widening toward the active section) indicates position on desktop.

Motion is part of the layout grammar: one easing (`cubic-bezier(.22,1,.36,1)`), 0.3s for hovers, 0.45 to 0.55s for reveals, 0.7s for the site tone swap. `prefers-reduced-motion` collapses all animation to near-zero.

## Elevation & Depth

The system is flat. Depth comes from tonal swaps (paper to ink panel, paper to night section) and from hairline rules, not from shadow. The few shadows that exist are ambient and very soft, with large negative spread so they read as a faint pool beneath dark objects: under media frames and the hero morph stage (`0 36px 80px -52px rgba(13,13,18,.75)`), under ink panels (`0 24px 60px -30px rgba(16,16,20,.5)`), and under floating HUDs (utility dock, tour bars, `0 14px 46px rgba(0,0,0,.24)`), which also use a 12 to 14px backdrop blur over 88 to 92% night.

### Named Rules
**The Flat Notebook Rule.** Surfaces on the paper are flat. A shadow is only allowed beneath a dark object (media, panel, HUD) and must be soft, dark, and negatively spread. Never use a shadow to separate light content from light content; use a rule.

## Shapes

Two shape families. Actions and tokens are fully rounded pills (99px): buttons, tags, chips, tool badges, tab toggles, status pills. Containers are rounded rectangles: 18px for media frames, panels, and project tab groups, 28px for the hero morph stage, 16px for floating HUDs and speech bubbles, 12px for small KPI tiles, 8px for tooltips. Content blocks on the paper (project cells, experience rows, capability groups) have no radius and no border box at all: they are defined by the hairlines around them. Circles appear for icon buttons (52px) and step numbers.

## Components

### Buttons
Confident and tactile.
- **Shape:** fully rounded pill (99px), min-height 48px in the hero.
- **Primary:** ink fill, cream text, 600 weight, 0.95rem, padding .85em 1.5em. On night sections it inverts to paper fill and ink text.
- **Ghost:** transparent with a 1.5px current-colour border; fills with the foreground colour on hover.
- **Hover / Focus:** lifts 2px (`translateY(-2px)`, 0.3s) and a trailing arrow nudges 4px right. Focus is a 2px current-colour outline at 4px offset.
- **Small:** padding .65em 1.2em, 0.85rem, used in the nav ("CV").

### Chips / Tags
- **Style:** pill, 1px border in foreground colour (or rule colour on dark), transparent fill, IBM Plex Mono 0.64 to 0.7rem uppercase with light tracking, min-height 32 to 34px.
- **Variants:** experience tags use the rule colour for the border; capability tags use full foreground. The draggable toolkit tags alternate ink fill, cream fill, and outlined.

### Cards / Containers
- **Project cells:** no box. A hairline-ruled cell holding an 18px-rounded 4:3 night media frame (images slightly desaturated: `saturate(.78) contrast(1.04)`), a mono index, an Archivo title, a ruled metric row, and pill links.
- **Ink panels:** ink fill, cream text, 18px radius, ambient shadow, mono header row with a dot row whose first dot is the signal colour.
- **Background / Border / Padding:** see tokens; internal padding scales with `clamp(20px, 2.5vw, 34px)`.

### Navigation
- **Top nav:** transparent over the hero; on scroll it becomes 82% of the current background with a 12px blur and a 1px rule beneath. Brand wordmark in Archivo 800 lowercase ("francesco" with a superscript mark). Links in mono 0.78rem, 0.14em tracking, with an underline that draws in from the left on hover.
- **Mobile:** a "MENU" mono toggle opens a full-screen ink overlay with huge Archivo 800 links separated by dark rules.
- **Section progress rail:** fixed left dashes, the active one widest and most opaque; hover reveals a blurred mono label.

### Floating utility dock
A bottom-right night HUD (16px radius, 18% cream border, blur, ambient shadow) holding icon buttons for theme colour, light/dark, and editor. It hides during the guided tour and when the mobile menu is open.

### Particle entities (signature)
The hero formation blob (eyeless, morphs into particle text) and the puppet mascot (small, two eyes, travels between sections, opens semantic search) are drawn on a fixed WebGL layer above the content. They are always two separate bodies on every screen size. On viewports up to 760px the WebGL layer is hidden; without WebGL a CSS dotted-circle mascot is the fallback.

### Guided tour HUD
Night bars (top status bar with a chapter dot map, bottom controller with a signal-coloured progress line) and speech bubbles anchored to the mascot, using the floating HUD treatment.

## Do's and Don'ts

### Do:
- **Do** derive every colour from `--paper`, `--ink`, `--cream`, `--night`, `--fg`, `--bg`, `--rule`, and `--volt` so the editor-chosen hue keeps working.
- **Do** mark a new dark section with `data-editorial-theme="dark"` and let the site swap tone, rather than giving the section its own background.
- **Do** set metadata in uppercase IBM Plex Mono at 0.6 to 0.78rem with 0.06 to 0.18em tracking, at reduced opacity.
- **Do** build content grids from 1px hairlines between cells; reserve 1.5px rules for emphasis.
- **Do** use the single easing `cubic-bezier(.22,1,.36,1)` and respect `prefers-reduced-motion`.
- **Do** keep the formation blob and the eyed puppet as separate entities everywhere.

### Don't:
- **Don't** add drop shadows to light content on the paper, or use shadows to separate cards; depth is tonal.
- **Don't** fill large areas with the signal or volt colour; it lives at dot and line scale.
- **Don't** introduce a third typeface or set large Archivo headlines without negative tracking.
- **Don't** box content in bordered cards on the paper; use ruled cells.
- **Don't** give the formation blob eyes or attach the search hitbox to it.
