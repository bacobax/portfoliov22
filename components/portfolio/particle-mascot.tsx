"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
};

type TextPoint = { x: number; y: number; z: number };
type ParticleWord = { label: string; points: TextPoint[] };

type MascotAnchor = { x: number; y: number; s: number; w: number };
type AnchorElement = { element: HTMLElement; config: MascotAnchor };

const DEFAULT_ANCHOR: MascotAnchor = { x: 0.52, y: 0.05, s: 1, w: 1 };
const FORMATION_ANCHOR = { x: 0.62, y: 0.05 };

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

const INK = { r: 16, g: 16, b: 20 };
const PAPER = { r: 171, g: 166, b: 241 };
const PARTICLE_WORDS = [
  "AI",
  "COMPUTER\nVISION",
  "NATURAL\nLANGUAGE",
  "FULL\nSTACK",
];

type ParticleMascotProps = {
  /** invoked when the puppet is clicked, with its current viewport centre */
  onActivate?: (origin: { x: number; y: number }) => void;
  /** holds the puppet in its semantic-search pose while the dialog is open */
  searchOpen?: boolean;
};

export function ParticleMascot({
  onActivate,
  searchOpen = false,
}: ParticleMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitboxRef = useRef<HTMLButtonElement>(null);
  const onActivateRef = useRef(onActivate);
  const searchOpenRef = useRef(searchOpen);
  onActivateRef.current = onActivate;
  searchOpenRef.current = searchOpen;

  useEffect(() => {
    const canvas = canvasRef.current;
    const hitbox = hitboxRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const pointCount = window.matchMedia("(max-width: 760px)").matches
      ? 2200
      : 5200;
    const points: Point[] = Array.from({ length: pointCount }, (_, index) => {
      const fraction = (index + 0.5) / pointCount;
      const phi = Math.acos(1 - 2 * fraction);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
        size: 0.55 + ((index * 29) % 100) / 105,
        phase: ((index * 47) % 360) * (Math.PI / 180),
      };
    });
    let particleWords: ParticleWord[] = [];

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    let frame = 0;
    let anchors: AnchorElement[] = [];
    let logoStages: HTMLElement[] = [];
    let anchorRefreshAt = 0;

    /* smoothly tweened presentation state, mirroring the mock's render loop */
    const state = { ...DEFAULT_ANCHOR };
    const mascot = {
      x: width * 0.5,
      y: height * 0.5,
      scale: DEFAULT_ANCHOR.s,
      rotX: 0,
      rotY: 0,
      wobble: 1,
      alpha: 0.95,
    };
    const pointer = { x: 0, y: 0 }; // normalized -1..1
    const pointerPx = { x: -9999, y: -9999 };
    let previousScrollY = window.scrollY;
    let velocity = 0;
    let colorMix = 0;
    let surfaceDark = false;
    let surfaceFrame = 0;
    let initialised = false;
    let clickKick = 0; // excitement burst when the puppet is clicked
    let animationStartedAt: number | null = null;
    const clickTarget = { x: mascot.x, y: mascot.y };

    const buildParticleWords = () => {
      const mask = document.createElement("canvas");
      mask.width = 960;
      mask.height = 420;
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      particleWords = PARTICLE_WORDS.map((label) => {
        const lines = label.split("\n");
        const maxFontSize = lines.length > 1 ? 144 : 245;
        let fontSize = maxFontSize;
        maskContext.font = `900 ${fontSize}px Archivo, Arial Black, sans-serif`;
        while (
          Math.max(
            ...lines.map((line) => maskContext.measureText(line).width),
          ) > 850 &&
          fontSize > 50
        ) {
          fontSize -= 4;
          maskContext.font = `900 ${fontSize}px Archivo, Arial Black, sans-serif`;
        }

        maskContext.clearRect(0, 0, mask.width, mask.height);
        maskContext.fillStyle = "#fff";
        maskContext.textAlign = "center";
        maskContext.textBaseline = "middle";
        const lineHeight = fontSize * 0.94;
        const firstY = mask.height / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, index) => {
          maskContext.fillText(
            line,
            mask.width / 2,
            firstY + index * lineHeight,
          );
        });

        const pixels = maskContext.getImageData(0, 0, mask.width, mask.height);
        const candidates: Array<{ x: number; y: number }> = [];
        const step = pointCount > 1500 ? 3 : 4;
        for (let y = 0; y < mask.height; y += step) {
          for (let x = 0; x < mask.width; x += step) {
            if (pixels.data[(y * mask.width + x) * 4 + 3] > 80) {
              candidates.push({ x, y });
            }
          }
        }

        const textPoints = points.map((_, index) => {
          const source = candidates[
            (index * 1543 + (index % 17) * 43) % candidates.length
          ] ?? { x: mask.width / 2, y: mask.height / 2 };
          return {
            x: ((source.x - mask.width / 2) / mask.width) * 3.9,
            y: ((source.y - mask.height / 2) / mask.height) * 2.1,
            z: (((index * 73) % 101) / 100 - 0.5) * 0.12,
          };
        });

        return { label, points: textPoints };
      });
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      anchorRefreshAt = 0;
      buildParticleWords();
    };

    const refreshAnchors = (time: number) => {
      if (time < anchorRefreshAt) return;
      anchorRefreshAt = time + 1200;
      anchors = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mascot]"),
      ).flatMap((element) => {
        try {
          const config = JSON.parse(
            element.dataset.mascot || "null",
          ) as MascotAnchor | null;
          return config ? [{ element, config }] : [];
        } catch {
          return [];
        }
      });
      logoStages = Array.from(
        document.querySelectorAll<HTMLElement>(".ai-morph-stage"),
      );
    };

    /* interpolate mascot state between section anchors (mock: sampleAnchors) */
    const sampleAnchors = () => {
      if (!anchors.length) return;
      const middle = window.scrollY + height * 0.5;
      let current = anchors[0];
      let next = anchors[0];
      let progress = 0;
      for (let index = 0; index < anchors.length; index += 1) {
        const candidate = anchors[index];
        const candidateMiddle =
          candidate.element.offsetTop + candidate.element.offsetHeight * 0.5;
        if (middle >= candidateMiddle) {
          current = candidate;
          next = anchors[index + 1] ?? candidate;
          const nextMiddle =
            next.element.offsetTop + next.element.offsetHeight * 0.5;
          progress =
            nextMiddle === candidateMiddle
              ? 0
              : clamp(
                  (middle - candidateMiddle) / (nextMiddle - candidateMiddle),
                );
        }
      }
      const eased = smoothstep(progress);
      state.x = lerp(current.config.x, next.config.x, eased);
      state.y = lerp(current.config.y, next.config.y, eased);
      state.s = lerp(current.config.s, next.config.s, eased);
      state.w = lerp(current.config.w, next.config.w, eased);
    };

    /* strongest on-screen AI logo puppet fades the mascot out (mock: logoPresence) */
    const logoPresence = () => {
      let strongest = 0;
      for (const stage of logoStages) {
        const rect = stage.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > height) continue;
        const visible = Math.min(rect.bottom, height) - Math.max(rect.top, 0);
        strongest = Math.max(
          strongest,
          clamp(visible / Math.min(rect.height || 1, height * 0.72)),
        );
      }
      return strongest;
    };

    const isDarkSurface = (x: number, y: number) => {
      const stack = document.elementsFromPoint(
        clamp(x, 0, width - 1),
        clamp(y, 0, height - 1),
      );

      for (const element of stack) {
        if (element === canvas || element.closest(".utility-dock")) continue;
        const color = window.getComputedStyle(element).backgroundColor;
        const match = color.match(
          /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/,
        );
        if (!match || (match[4] !== undefined && Number(match[4]) < 0.08)) {
          continue;
        }

        const red = Number(match[1]) / 255;
        const green = Number(match[2]) / 255;
        const blue = Number(match[3]) / 255;
        return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 0.46;
      }

      return (
        document
          .querySelector(".editorial-site")
          ?.classList.contains("editorial-dark") ?? false
      );
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      refreshAnchors(time);
      sampleAnchors();

      const mobile = width <= 760;
      const inSearchPose = searchOpenRef.current;
      const heroRect = anchors[0]?.element.getBoundingClientRect();
      const inCover = Boolean(
        heroRect &&
        heroRect.top < height * 0.3 &&
        heroRect.bottom > height * 0.28,
      );
      if (
        !reducedMotion &&
        time > 0 &&
        inCover &&
        animationStartedAt === null
      ) {
        animationStartedAt = time;
      }
      const seconds =
        reducedMotion || animationStartedAt === null
          ? 0
          : (time - animationStartedAt) / 1000;
      const ease = reducedMotion ? 1 : inSearchPose ? 0.11 : 0.06;

      /* px-per-world-unit factor so motion amplitudes match the mock's camera */
      const unit = Math.min(width, height * 1.15) * 0.155;

      let ax = state.x;
      let ay = state.y;
      if (mobile) {
        ax = state.x * 0.72;
        ay = 0.52 + state.y * 0.22;
      }

      /* float bob + pointer-follow, both eased like the mock's render loop */
      const bob = Math.sin(seconds * 0.8) * 0.12 * unit;
      let targetX =
        width * 0.5 + ax * 0.86 * (width * 0.5) + pointer.x * 0.78 * unit;
      let targetY =
        height * 0.5 -
        ay * 0.8 * (height * 0.5) +
        bob -
        pointer.y * 0.68 * unit;
      let targetScale = mobile ? 0.48 : 0.36;

      /* The puppet keeps one small scale everywhere; anchors only move it. */

      /* Mobile hero: the single-column layout leaves the eyebrow + huge title
         right where the anchored blob would land, so on small screens we park
         it in the empty band between the nav and the eyebrow instead of letting
         it overlap the text. */
      if (mobile && inCover && !inSearchPose) {
        targetX = width * 0.5;
        targetY = height * 0.2;
        targetScale = 0.44;
      }

      /* Search pose from the reference: the puppet clears the modal and
         settles in the upper-left corner while remaining fully animated. */
      if (inSearchPose) {
        targetX = Math.min(126, Math.max(92, width * 0.085));
        targetY = Math.min(112, Math.max(84, height * 0.11));
        targetScale = mobile ? 0.46 : 0.5;
      }
      if (!initialised) {
        mascot.x = targetX;
        mascot.y = targetY;
        mascot.scale = targetScale;
        initialised = true;
      }
      mascot.x = lerp(mascot.x, targetX, ease);
      mascot.y = lerp(mascot.y, targetY, ease);
      mascot.scale = lerp(
        mascot.scale,
        targetScale,
        reducedMotion ? 1 : inSearchPose ? 0.12 : 0.07,
      );
      const rotationSpeed = inCover && !inSearchPose ? 0.16 : 0.34;
      const autonomousYaw =
        seconds * rotationSpeed +
        Math.sin(seconds * 0.17) * 0.7 +
        Math.sin(seconds * 0.071) * 0.28;
      const autonomousPitch =
        Math.sin(seconds * 0.13) * 0.48 + Math.cos(seconds * 0.083) * 0.2;
      mascot.rotY = lerp(mascot.rotY, autonomousYaw + pointer.x * 0.5, 0.035);
      mascot.rotX = lerp(
        mascot.rotX,
        autonomousPitch + pointer.y * 0.32,
        0.035,
      );

      velocity += (Math.abs(window.scrollY - previousScrollY) - velocity) * 0.1;
      previousScrollY = window.scrollY;

      clickKick *= 0.94;
      const wobbleTarget =
        (inCover && !inSearchPose ? state.w : 0.045) +
        Math.min(velocity * (inCover ? 0.012 : 0.0015), inCover ? 1.4 : 0.08) +
        clickKick * (inCover ? 1.8 : 0.18);
      mascot.wobble = lerp(mascot.wobble, wobbleTarget, 0.08);

      const presence = reducedMotion || inSearchPose ? 0 : logoPresence();
      const alphaTarget = inSearchPose
        ? 0.98
        : (mobile ? 0.55 : 0.95) * (1 - presence * 0.94);
      mascot.alpha = lerp(mascot.alpha, alphaTarget, 0.08);

      const radius = unit * mascot.scale;
      const centerX = mascot.x;
      const centerY = mascot.y;
      /* The wide word-morphing formation ("AI", "COMPUTER VISION", …) needs
         desktop room; on phones it collides with the eyebrow and title, so we
         drop it there and keep only the compact eyed blob in the top band. */
      const showFormation = inCover && !inSearchPose && !mobile;
      const puppetRadius = radius;
      const puppetCenterX = centerX;
      const puppetCenterY = centerY;
      const formationAx = mobile
        ? FORMATION_ANCHOR.x * 0.72
        : FORMATION_ANCHOR.x;
      const formationAy = mobile
        ? 0.52 + FORMATION_ANCHOR.y * 0.22
        : FORMATION_ANCHOR.y;
      const formationCenterX = width * 0.5 + formationAx * 0.86 * (width * 0.5);
      const formationCenterY =
        (heroRect?.top ?? 0) +
        height * 0.5 -
        formationAy * 0.8 * (height * 0.5);
      const formationRadius = unit * (mobile ? 0.62 : 1);
      const formationAlpha = heroRect
        ? smoothstep(clamp(heroRect.bottom / (height * 0.55)))
        : 0;
      clickTarget.x = puppetCenterX;
      clickTarget.y = puppetCenterY;

      /* Cover choreography: spend most of the cycle as the original blob,
         then resolve into one crisp particle phrase and breathe back out. */
      const wordCycle = 10.8;
      const wordPhase = seconds % wordCycle;
      const wordIndex = Math.floor(seconds / wordCycle) % PARTICLE_WORDS.length;
      let textMorph = 0;
      if (showFormation && !reducedMotion) {
        if (wordPhase >= 3 && wordPhase < 4.35) {
          textMorph = smoothstep((wordPhase - 3) / 1.35);
        } else if (wordPhase >= 4.35 && wordPhase < 7.35) {
          textMorph = 1;
        } else if (wordPhase >= 7.35 && wordPhase < 8.7) {
          textMorph = 1 - smoothstep((wordPhase - 7.35) / 1.35);
        }
      }
      const activeWord = particleWords[wordIndex];

      surfaceFrame += 1;
      if (surfaceFrame % 4 === 0) {
        surfaceDark = isDarkSurface(puppetCenterX, puppetCenterY);
      }
      colorMix +=
        ((surfaceDark ? 1 : 0) - colorMix) * (reducedMotion ? 1 : 0.08);
      const particleRed = Math.round(lerp(INK.r, PAPER.r, colorMix));
      const particleGreen = Math.round(lerp(INK.g, PAPER.g, colorMix));
      const particleBlue = Math.round(lerp(INK.b, PAPER.b, colorMix));
      context.fillStyle = `rgb(${particleRed}, ${particleGreen}, ${particleBlue})`;

      const cosY = Math.cos(mascot.rotY);
      const sinY = Math.sin(mascot.rotY);
      const cosX = Math.cos(mascot.rotX);
      const sinX = Math.sin(mascot.rotX);
      const formationYaw =
        seconds * 0.16 +
        Math.sin(seconds * 0.17) * 0.7 +
        Math.sin(seconds * 0.071) * 0.28;
      const formationPitch =
        Math.sin(seconds * 0.13) * 0.48 + Math.cos(seconds * 0.083) * 0.2;
      const formationCosY = Math.cos(formationYaw);
      const formationSinY = Math.sin(formationYaw);
      const formationCosX = Math.cos(formationPitch);
      const formationSinX = Math.sin(formationPitch);

      if (mascot.alpha > 0.02) {
        if (showFormation) {
          for (
            let pointIndex = 0;
            pointIndex < points.length;
            pointIndex += 1
          ) {
            const point = points[pointIndex];
            const noise =
              Math.sin(point.x * 3.1 + seconds * 0.9) *
              Math.sin(point.y * 3.7 - seconds * 0.7) *
              Math.sin(point.z * 2.6 + seconds * 1.1);
            const ripple = Math.sin(point.y * 7 + seconds * 1.6) * 0.35;
            const wobble =
              1 +
              (noise * 0.22 + ripple * 0.08) * DEFAULT_ANCHOR.w +
              (point.phase % 0.02);

            const rx = point.x * formationCosY - point.z * formationSinY;
            const rz0 = point.x * formationSinY + point.z * formationCosY;
            const ry = point.y * formationCosX - rz0 * formationSinX;
            const rz = point.y * formationSinX + rz0 * formationCosX;

            const perspective = 0.82 + (rz + 1) * 0.13;
            const blobX =
              formationCenterX + rx * formationRadius * wobble * perspective;
            const blobY =
              formationCenterY + ry * formationRadius * wobble * perspective;
            const textPoint = activeWord?.points[pointIndex];
            const textYaw = Math.sin(seconds * 0.23) * 0.12;
            const textCos = Math.cos(textYaw);
            const textSin = Math.sin(textYaw);
            const textX3 = textPoint
              ? textPoint.x * textCos - textPoint.z * textSin
              : 0;
            const textZ3 = textPoint
              ? textPoint.x * textSin + textPoint.z * textCos
              : 0;
            const textPerspective = 0.94 + textZ3 * 0.08;
            const textX =
              formationCenterX + textX3 * formationRadius * textPerspective;
            const textY =
              formationCenterY + (textPoint?.y ?? 0) * formationRadius;
            const x = lerp(blobX, textX, textMorph);
            const y = lerp(blobY, textY, textMorph);

            const size = Math.max(
              0.5,
              point.size *
                lerp(perspective, textPerspective * 1.22, textMorph) *
                (mobile ? 0.78 : 1.08),
            );
            context.globalAlpha =
              lerp(0.5 + (rz + 1) * 0.22, 0.92, textMorph) *
              mascot.alpha *
              formationAlpha;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
          }
        }

        /* The puppet is always its own small, tightly packed sphere. */
        const puppetPointStep = mobile ? 2 : 3;
        for (
          let pointIndex = 0;
          pointIndex < points.length;
          pointIndex += puppetPointStep
        ) {
          const point = points[pointIndex];
          const rx = point.x * cosY - point.z * sinY;
          const rz0 = point.x * sinY + point.z * cosY;
          const ry = point.y * cosX - rz0 * sinX;
          const rz = point.y * sinX + rz0 * cosX;
          const perspective = 0.84 + (rz + 1) * 0.12;
          context.globalAlpha = (0.5 + (rz + 1) * 0.22) * mascot.alpha;
          context.beginPath();
          context.arc(
            puppetCenterX + rx * puppetRadius * perspective,
            puppetCenterY + ry * puppetRadius * perspective,
            Math.max(0.48, point.size * perspective * (mobile ? 0.76 : 0.9)),
            0,
            Math.PI * 2,
          );
          context.fill();
        }

        /* The two-eye face remains legible while the particle shell rotates. */
        const blink =
          !reducedMotion &&
          (Math.sin(seconds * 0.5) > 0.998 || Math.sin(seconds * 0.31) > 0.999)
            ? 0.08
            : 1;
        const eyeRadius = Math.max(5.5, puppetRadius * 0.22);
        for (const eyeOffset of [-0.27, 0.27]) {
          const eyeX =
            puppetCenterX +
            eyeOffset * puppetRadius +
            pointer.x * puppetRadius * 0.045;
          const eyeY =
            puppetCenterY -
            puppetRadius * 0.18 +
            pointer.y * puppetRadius * 0.035;
          context.globalAlpha = mascot.alpha;
          context.fillStyle = "#f4f1e8";
          context.beginPath();
          context.ellipse(
            eyeX,
            eyeY,
            eyeRadius,
            eyeRadius * blink,
            0,
            0,
            Math.PI * 2,
          );
          context.fill();

          const dx = pointerPx.x - eyeX;
          const dy = pointerPx.y - eyeY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const pupilOffset = eyeRadius * 0.28;
          const pupilRadius = eyeRadius * 0.42 * (1 + clickKick * 0.45);
          context.fillStyle = "#101014";
          context.beginPath();
          context.ellipse(
            eyeX + (dx / distance) * pupilOffset,
            eyeY + (dy / distance) * pupilOffset,
            pupilRadius,
            pupilRadius * blink,
            0,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
        context.fillStyle = `rgb(${particleRed}, ${particleGreen}, ${particleBlue})`;
      }

      /* keep the click target glued to the puppet */
      if (hitbox) {
        const hitRadius = puppetRadius * 0.95;
        const usable =
          !searchOpenRef.current && mascot.alpha > 0.25 && hitRadius > 16;
        hitbox.style.width = `${hitRadius * 2}px`;
        hitbox.style.height = `${hitRadius * 2}px`;
        hitbox.style.transform = `translate(${(puppetCenterX - hitRadius).toFixed(1)}px, ${(puppetCenterY - hitRadius).toFixed(1)}px)`;
        hitbox.style.pointerEvents = usable ? "auto" : "none";
      }

      context.globalAlpha = 1;
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerPx.x = event.clientX;
      pointerPx.y = event.clientY;
      pointer.x = (event.clientX / width - 0.5) * 2;
      pointer.y = (event.clientY / height - 0.5) * 2;
    };

    /* reduced motion: re-render a static frame on scroll so it stays placed */
    let staticTimer: number | null = null;
    const onScroll = () => {
      if (!reducedMotion || staticTimer !== null) return;
      staticTimer = window.setTimeout(() => {
        staticTimer = null;
        draw(0);
      }, 120);
    };

    const onHitboxClick = () => {
      clickKick = 1;
      onActivateRef.current?.({ x: clickTarget.x, y: clickTarget.y });
      if (reducedMotion) draw(0);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    hitbox?.addEventListener("click", onHitboxClick);
    draw(0);

    return () => {
      window.cancelAnimationFrame(frame);
      if (staticTimer !== null) window.clearTimeout(staticTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      hitbox?.removeEventListener("click", onHitboxClick);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="gl"
        className={searchOpen ? "semantic-search-open" : undefined}
        aria-hidden="true"
      />
      <button
        ref={hitboxRef}
        type="button"
        className="mascot-hitbox"
        aria-label="Search the portfolio"
        title="Search the portfolio"
      />
    </>
  );
}
