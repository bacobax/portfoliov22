"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";

export type TourBubblePosition = "left" | "right";

export type TourStep = {
  target: string;
  eyebrow: string;
  title: string;
  message: string;
  talkDuration: number;
  travelDuration: number;
  focus: number;
  bubble: TourBubblePosition;
  action?: "experience" | "projects";
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "top",
    eyebrow: "Spawn point",
    title: "Meet Francesco.",
    message:
      "AI engineer, full-stack builder, and the human whose work I’m about to speed-run. Keep your hands inside the browser.",
    talkDuration: 3600,
    travelDuration: 5200,
    focus: 0.42,
    bubble: "left",
  },
  {
    target: "about",
    eyebrow: "Character lore",
    title: "Five chapters. One builder.",
    message:
      "Five quick chapters connect research instincts to things that actually run. I’ll skim the rail—you watch the story change underneath us.",
    talkDuration: 3700,
    travelDuration: 4600,
    focus: 0.28,
    bubble: "left",
  },
  {
    target: "experience",
    eyebrow: "Field log",
    title: "Real systems, real teams.",
    message:
      "I’ll switch the active record for you. Each stop pairs the role with the tools that actually did the work.",
    talkDuration: 3800,
    travelDuration: 4300,
    focus: 0.42,
    bubble: "left",
    action: "experience",
  },
  {
    target: "ai-coding",
    eyebrow: "Co-op mode",
    title: "AI-assisted, human-owned.",
    message:
      "Claude Code and Codex shorten the loop. Architecture, judgment, validation, and the final quality bar still belong to Francesco.",
    talkDuration: 3400,
    travelDuration: 3300,
    focus: 0.35,
    bubble: "left",
  },
  {
    target: "projects",
    eyebrow: "Inventory opened",
    title: "Things that shipped.",
    message:
      "Watch the category switch. These are working projects—not decorative case-study cards. Pick any one when you take the wheel.",
    talkDuration: 4200,
    travelDuration: 5400,
    focus: 0.34,
    bubble: "left",
    action: "projects",
  },
  {
    target: "contact",
    eyebrow: "Tour complete",
    title: "Your turn to drive.",
    message:
      "That’s the speed-run. Explore any section, interrogate me with semantic search, open the CV, or say hello to Francesco.",
    talkDuration: 0,
    travelDuration: 0,
    focus: 0.34,
    bubble: "right",
  },
];

type TourWelcomeProps = {
  onStart: () => void;
  onSkip: () => void;
};

export function TourWelcome({ onStart, onSkip }: TourWelcomeProps) {
  return (
    <section
      className="tour-welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-welcome-title"
    >
      <div className="tour-welcome-grain" aria-hidden="true" />
      <header className="tour-welcome-head">
        <span className="mono">( choose your driver )</span>
        <span className="tour-live mono"><i /> portfolio online</span>
      </header>

      <div className="tour-welcome-copy">
        <h1 id="tour-welcome-title">
          This portfolio
          <br />
          has a pulse.
        </h1>
        <p>
          Meet Mote, the particle puppet. He can take you on a forty-second
          speed-run, hooking each section and hauling it into view—or you can
          explore at your own pace.
        </p>
      </div>

      <div className="tour-welcome-mascot-label" aria-hidden="true">
        <span>Mote</span>
        <small>the curious particle</small>
      </div>

      <div className="tour-choice-panel">
        <div className="tour-choice-meta mono">
          <span>01 / guided</span>
          <span>~ 00:40</span>
        </div>
        <button className="tour-start" type="button" onClick={onStart} autoFocus>
          <span>Let Mote drive</span>
          <span aria-hidden="true">→</span>
        </button>
        <button className="tour-skip mono" type="button" onClick={onSkip}>
          Skip · explore yourself <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

type GuidedTourHudProps = {
  stepIndex: number;
  progress: number;
  paused: boolean;
  traveling: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onExit: () => void;
  onReplay: () => void;
};

export function GuidedTourHud({
  stepIndex,
  progress,
  paused,
  traveling,
  onPrevious,
  onNext,
  onTogglePause,
  onExit,
  onReplay,
}: GuidedTourHudProps) {
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <aside className="guided-tour" aria-label="Guided portfolio tour">
      <div className="tour-topbar">
        <div className="tour-status mono">
          <span className="tour-status-dot" />
          Mote / {isLast ? "complete" : paused ? "waiting" : traveling ? "hook engaged" : "talking"}
        </div>
        <div className="tour-map" aria-label={`Stop ${stepIndex + 1} of ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((item, index) => (
            <i
              key={item.target}
              className={index === stepIndex ? "active" : index < stepIndex ? "passed" : ""}
            />
          ))}
        </div>
        <button type="button" className="tour-exit" onClick={onExit}>
          Exit tour <X aria-hidden="true" />
        </button>
      </div>

      <div
        className={`tour-speech tour-speech-${step.bubble} ${traveling ? "tour-speech-travelling" : ""}`}
        aria-live="polite"
        aria-hidden={traveling || undefined}
        key={step.target}
      >
        <span className="tour-speech-kicker mono">{step.eyebrow}</span>
        <strong>{step.title}</strong>
        <p>{step.message}</p>
        <span className="tour-speech-tail" aria-hidden="true" />
      </div>

      <div className="tour-controller">
        <div className="tour-progress" aria-hidden="true">
          <i style={{ transform: `scaleX(${isLast ? 1 : progress})` }} />
        </div>
        <button
          type="button"
          onClick={onPrevious}
          disabled={stepIndex === 0}
          aria-label="Previous tour stop"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        {isLast ? (
          <button type="button" className="tour-replay" onClick={onReplay}>
            <RotateCcw aria-hidden="true" /> Replay
          </button>
        ) : (
          <button
            type="button"
            className="tour-pause"
            onClick={onTogglePause}
            aria-label={paused ? "Resume guided tour" : "Pause guided tour"}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        {isLast ? (
          <button type="button" className="tour-finish" onClick={onExit}>
            Explore freely <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button type="button" onClick={onNext} aria-label="Next tour stop">
            <ChevronRight aria-hidden="true" />
          </button>
        )}
        <span className="tour-counter mono">
          {String(stepIndex + 1).padStart(2, "0")} / {String(TOUR_STEPS.length).padStart(2, "0")}
        </span>
      </div>
    </aside>
  );
}
