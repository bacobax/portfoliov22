"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PanelKind = "orbit" | "flow" | "review" | "areas" | "proof";
type AreaMode = "theory" | "practice";

type Chapter = {
  n: string;
  knob: number;
  kick: string;
  h: string;
  p: string;
  panel: PanelKind;
};

const STORY: Chapter[] = [
  {
    n: "01",
    knob: 12,
    kick: "( chapter 01 · the student )",
    h: "University of Trento",
    p: "A master's in Artificial Intelligence Systems — where problem-solving gets formal, and communication gets sharpened by seminar rooms and whiteboards.",
    panel: "orbit",
  },
  {
    n: "02",
    knob: 85,
    kick: "( chapter 02 · the builder )",
    h: "Systems, not just models",
    p: "Years of designing and building AI end to end — data in, a model in the middle, and something actually running on the other side.",
    panel: "flow",
  },
  {
    n: "03",
    knob: 35,
    kick: "( chapter 03 · the critic )",
    h: "Read. Question. Improve.",
    p: "Critical thinking as a habit: take a state-of-the-art result, find the patches that don't hold, and ask how it could be pushed further.",
    panel: "review",
  },
  {
    n: "04",
    knob: 50,
    kick: "( chapter 04 · the range )",
    h: "Four favourite problems",
    p: "Reinforcement learning, audio & music signal processing, image processing, and generative AI with images. Flip the toggle — every one has both faces.",
    panel: "areas",
  },
  {
    n: "05",
    knob: 50,
    kick: "( chapter 05 · the duality )",
    h: "Theory that ships",
    p: "The theoretical intuitions behind SoTA matter to me as much as the deploy: derive it on paper first, then make it run.",
    panel: "proof",
  },
];

const AREAS: Record<AreaMode, Array<[string, string, string]>> = {
  theory: [
    ["reinforcement learning", "policy gradients · bandits", "reading"],
    ["audio & music", "STFT · source models", "reading"],
    ["image processing", "inverse problems", "reading"],
    ["generative ai", "diffusion · flow matching", "deriving"],
  ],
  practice: [
    ["reinforcement learning", "agents that learn control", "training"],
    ["audio & music", "inpainting · chord-net", "shipped"],
    ["image processing", "forgery-net", "shipped"],
    ["generative ai", "IR synthesis @ ÉTS", "live"],
  ],
};

const PROOF_LINES = [
  '$ paper --read "flow-matching"',
  '→ deriving the objective… <span class="ok">done</span>',
  '→ implementing from scratch… <span class="ok">pass</span>',
  "→ shipping to prod",
];

/* deterministic pseudo-random generator shared with the mock */
const mulberry = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function PanelHead({ label }: { label: string }) {
  return (
    <div className="p-head">
      <span>{label}</span>
      <span className="dotrow">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function OrbitPanel() {
  return (
    <div className="panel">
      <PanelHead label="curriculum · orbiting a core" />
      <div className="st-fig" aria-hidden="true">
        <div className="pv-inner pv-meridian">
          <div
            className="orb"
            style={{ width: "56%", aspectRatio: "1", animationDuration: "14s" }}
          >
            <i />
          </div>
          <div
            className="orb"
            style={{
              width: "80%",
              aspectRatio: "1",
              animationDuration: "22s",
              animationDirection: "reverse",
            }}
          >
            <i />
          </div>
          <div
            className="orb"
            style={{ width: "34%", aspectRatio: "1", animationDuration: "9s" }}
          >
            <i />
          </div>
          <div className="core" />
        </div>
      </div>
      <div className="p-foot">
        <span>problem-solving</span>
        <span>communication</span>
      </div>
    </div>
  );
}

function FlowPanel() {
  return (
    <div className="panel pipe">
      <PanelHead label="ai systems · idea → running" />
      <svg
        viewBox="0 0 460 240"
        role="img"
        aria-label="Data flows into a model, through evaluation, and out as a shipped system"
      >
        <rect className="nd" x="10" y="98" width="84" height="44" rx="8" />
        <text x="30" y="124">
          data
        </text>
        <rect className="nd" x="150" y="34" width="96" height="42" rx="8" />
        <text x="170" y="60">
          model
        </text>
        <rect className="nd" x="150" y="164" width="96" height="42" rx="8" />
        <text x="176" y="190">
          eval
        </text>
        <rect
          className="nd nd-hot"
          x="368"
          y="98"
          width="80"
          height="44"
          rx="8"
        />
        <text x="388" y="124">
          ship
        </text>
        <path className="wire" d="M94 120 C 122 120 122 55 150 55" />
        <path className="wire" d="M94 120 C 122 120 122 185 150 185" />
        <path className="wire" d="M246 55 C 300 55 320 100 368 114" />
        <path className="wire" d="M246 185 C 300 185 320 140 368 126" />
        <circle className="pulse" r="4">
          <animateMotion
            dur="2.6s"
            repeatCount="indefinite"
            path="M94 120 C 122 120 122 55 150 55 L246 55 C 300 55 320 100 368 114"
          />
        </circle>
        <circle className="pulse" r="4">
          <animateMotion
            dur="3.4s"
            begin="1s"
            repeatCount="indefinite"
            path="M94 120 C 122 120 122 185 150 185 L246 185 C 300 185 320 140 368 126"
          />
        </circle>
      </svg>
      <div className="p-foot">
        <span>design · build · evaluate</span>
        <span>repeat</span>
      </div>
    </div>
  );
}

const REVIEW_CELLS = (() => {
  const random = mulberry(73);
  return Array.from({ length: 24 }, (_, index) => ({
    hot: index === 8 || index === 13 || index === 19,
    left: 6 + (index % 6) * 15,
    top: 8 + Math.floor(index / 6) * 22,
    delay: (random() * 2).toFixed(2),
  }));
})();

function ReviewPanel() {
  const [hotCells, setHotCells] = useState<Set<number>>(
    () => new Set(REVIEW_CELLS.flatMap((cell, i) => (cell.hot ? [i] : []))),
  );

  const toggle = (index: number) =>
    setHotCells((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="panel">
      <PanelHead label="sota · under review" />
      <div className="st-fig">
        <div className="pv-inner pv-forge">
          {REVIEW_CELLS.map((cell, index) => (
            <button
              type="button"
              key={index}
              className={`cell ${hotCells.has(index) ? "hot" : ""}`}
              aria-pressed={hotCells.has(index)}
              aria-label={`Patch ${index + 1}${hotCells.has(index) ? " — weak spot" : ""}`}
              style={{
                left: `${cell.left}%`,
                top: `${cell.top}%`,
                width: "12%",
                height: "16%",
                animationDelay: `${cell.delay}s`,
              }}
              onClick={() => toggle(index)}
            />
          ))}
        </div>
      </div>
      <div className="p-foot">
        <span>click the patches</span>
        <span>weak spots: {hotCells.size}</span>
      </div>
    </div>
  );
}

function AreasPanel() {
  const [mode, setMode] = useState<AreaMode>("theory");

  return (
    <div className="panel saas">
      <PanelHead label="research areas · two faces" />
      <div className="toggle" role="group" aria-label="Theory or practice view">
        {(["theory", "practice"] as const).map((candidate) => (
          <button
            type="button"
            key={candidate}
            aria-pressed={mode === candidate}
            onClick={() => setMode(candidate)}
          >
            {candidate === "theory" ? "Theory" : "Practice"}
          </button>
        ))}
      </div>
      <div className="rows st-rows" aria-live="polite">
        {AREAS[mode].map((row) => (
          <div key={row[0]}>
            <span>{row[0]}</span>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
          </div>
        ))}
      </div>
      <div className="p-foot">
        <span>RL · audio · image · generative</span>
        <span>mode: {mode}</span>
      </div>
    </div>
  );
}

function ProofPanel({
  armed,
  instant,
}: {
  /** starts typing when true; when undefined the panel arms itself on visibility */
  armed?: boolean;
  instant?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const run = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const term = termRef.current;
    const bar = barRef.current;
    if (!term) return;

    if (instant) {
      term.innerHTML = PROOF_LINES.join("<br>");
      if (bar) bar.style.width = "100%";
      return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let out = "";
    const type = () => {
      if (!termRef.current) return;
      if (lineIndex >= PROOF_LINES.length) {
        term.innerHTML = `${out}<span class="caret"></span>`;
        if (bar) bar.style.width = "92%";
        return;
      }
      const plain = PROOF_LINES[lineIndex].replace(/<[^>]+>/g, "");
      charIndex += 1;
      const partial = plain.slice(0, charIndex);
      term.innerHTML = `${out}${charIndex >= plain.length ? PROOF_LINES[lineIndex] : partial}<span class="caret"></span>`;
      if (bar)
        bar.style.width = `${Math.round(((lineIndex + charIndex / plain.length) / PROOF_LINES.length) * 92)}%`;
      if (charIndex >= plain.length) {
        out += `${PROOF_LINES[lineIndex]}<br>`;
        lineIndex += 1;
        charIndex = 0;
        window.setTimeout(type, 320);
      } else {
        window.setTimeout(type, 26);
      }
    };
    type();
  }, [instant]);

  useEffect(() => {
    if (armed) run();
  }, [armed, run]);

  useEffect(() => {
    if (armed !== undefined) return;
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [armed, run]);

  return (
    <div className="panel deploy" ref={rootRef}>
      <PanelHead label="duality · paper → prod" />
      <div className="term" aria-live="off" ref={termRef} />
      <div className="bar" aria-hidden="true">
        <i ref={barRef} />
      </div>
      <div className="dstats">
        <span>
          intuition <b>solid</b>
        </span>
        <span>
          runtime <b>live</b>
        </span>
        <span>
          gap <b>closing</b>
        </span>
      </div>
    </div>
  );
}

function ChapterPanel({
  kind,
  proofArmed,
  instant,
}: {
  kind: PanelKind;
  proofArmed?: boolean;
  instant?: boolean;
}) {
  switch (kind) {
    case "orbit":
      return <OrbitPanel />;
    case "flow":
      return <FlowPanel />;
    case "review":
      return <ReviewPanel />;
    case "areas":
      return <AreasPanel />;
    case "proof":
      return <ProofPanel armed={proofArmed} instant={instant} />;
  }
}

function Duality({
  knob,
  hint,
}: {
  knob: number;
  hint?: string;
}) {
  const theoryOn = knob <= 45 || (knob > 45 && knob < 55);
  const practiceOn = knob >= 55 || (knob > 45 && knob < 55);
  return (
    <div className="duality" aria-hidden="true">
      <b className={theoryOn ? "on" : ""}>Theory</b>
      <span className="dtrack">
        <i className="dknob" style={{ left: `${knob}%` }} />
      </span>
      <b className={practiceOn ? "on" : ""}>Practice</b>
      {hint && <span className="dhint">{hint}</span>}
    </div>
  );
}

export function AboutStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const copyParRefs = useRef<Array<HTMLDivElement | null>>([]);
  const numRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const vizParRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);
  const [proofArmed, setProofArmed] = useState(false);
  const [staticStory, setStaticStory] = useState(false);

  const chapterCount = STORY.length;

  useEffect(() => {
    setStaticStory(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  /* pinned engine + parallax (mock: story frame loop) */
  useEffect(() => {
    if (staticStory) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ticking = false;
    let activeIndex = -1;

    const frame = () => {
      ticking = false;
      if (window.matchMedia("(max-width:960px)").matches) return;
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(
        0.9999,
        Math.max(0, -rect.top / total),
      );
      const index = Math.min(
        chapterCount - 1,
        Math.floor(progress * chapterCount),
      );
      if (index !== activeIndex) {
        activeIndex = index;
        setActive(index);
        if (STORY[index].panel === "proof") setProofArmed(true);
      }
      const chapterProgress = progress * chapterCount - index;
      const drift = 0.5 - chapterProgress;
      const copyPar = copyParRefs.current[index];
      const num = numRefs.current[index];
      const vizPar = vizParRefs.current[index];
      if (copyPar)
        copyPar.style.transform = `translateY(${(drift * 56).toFixed(1)}px)`;
      if (num)
        num.style.transform = `translateY(${(drift * 170).toFixed(1)}px)`;
      if (vizPar) {
        const scale =
          0.965 +
          0.035 *
            Math.sin(Math.min(1, Math.max(0, chapterProgress)) * Math.PI);
        vizPar.style.transform = `translateY(${(-drift * 104).toFixed(1)}px) scale(${scale.toFixed(3)})`;
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(frame);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapterCount, staticStory]);

  const knob = STORY[active].knob;

  return (
    <div
      className={`story-wrap ${staticStory ? "story-static" : ""}`}
      ref={wrapRef}
    >
      <div className="story-sticky">
        <Duality knob={knob} hint="scroll to read" />
        <div className="story-grid">
          <div className="story-copy-stack">
            {STORY.map((chapter, index) => (
              <div
                className={`st-copy ${active === index ? "active" : ""}`}
                key={chapter.n}
              >
                <span
                  className="st-num st-pnum"
                  aria-hidden="true"
                  ref={(node) => {
                    numRefs.current[index] = node;
                  }}
                >
                  {chapter.n}
                </span>
                <div
                  className="st-par"
                  ref={(node) => {
                    copyParRefs.current[index] = node;
                  }}
                >
                  <span className="st-kick mono">{chapter.kick}</span>
                  <h3>{chapter.h}</h3>
                  <p>{chapter.p}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="story-viz-stack">
            {STORY.map((chapter, index) => (
              <div
                className={`st-viz ${active === index ? "active" : ""}`}
                key={chapter.n}
              >
                <div
                  className="st-par"
                  ref={(node) => {
                    vizParRefs.current[index] = node;
                  }}
                >
                  <ChapterPanel
                    kind={chapter.panel}
                    proofArmed={
                      chapter.panel === "proof" ? proofArmed : undefined
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* stacked version: mobile + reduced motion */}
      <div className="story-stack">
        {STORY.map((chapter) => (
          <div className="st-mod" key={chapter.n}>
            <div className="st-copy">
              <div className="st-par">
                <span className="st-kick mono">{chapter.kick}</span>
                <h3>{chapter.h}</h3>
                <p>{chapter.p}</p>
              </div>
            </div>
            <Duality knob={chapter.knob} />
            <div className="st-viz">
              <div className="st-par">
                <ChapterPanel kind={chapter.panel} instant={staticStory} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
