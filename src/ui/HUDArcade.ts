// HUDArcade — arcade HUD overlay (DOM layer above the WebGL canvas).
//
// NOTE on render order: this HUD is a DOM overlay (z-index above canvas#game).
// The CRT PostProcess (scanlines + chromatic aberration) runs INSIDE the WebGL
// present() pass on the framebuffer, so it cannot reach DOM pixels. To keep the
// HUD visually integrated with the CRT look we apply a lightweight CSS scanline
// overlay + glow here instead. Truly compositing the HUD under PostFX would
// require rendering it into the WebGL pipeline (out of scope for this pass).

import { HUD_FX_EFFECTS, loadHudFxLabState, type HudFxEffectId, type HudFxEventId, type HudFxLabState } from "../dev/HudFxLabState";
import { setHudFxPreviewHandler } from "../dev/HudFxPreviewBridge";
import { createGenericHudFxController } from "./HudGenericFx";

type HudRefs = {
  layer: HTMLDivElement;
  panel: HTMLDivElement;
  lives: HTMLDivElement;
  energySegments: HTMLDivElement[];
  wave: HTMLDivElement;
  score: HTMLDivElement;
  w1: HTMLCanvasElement;
  w2: HTMLCanvasElement;
  w1Level: HTMLDivElement;
  w2Level: HTMLDivElement;
  bomb: HTMLDivElement;
  cdFill: HTMLDivElement;
  pause: HTMLDivElement;
  gameOver: HTMLDivElement;
  title: HTMLDivElement;
};

type W2State = { active?: boolean; charge01?: number };

type WeaponSlotHudLike = { level?: number; maxLevel?: number; weaponId?: string; displayName?: string };
type WeaponSnapshotHudLike = { slots?: { w1?: WeaponSlotHudLike; w2?: WeaponSlotHudLike } };

type PlayerLike = {
  energy?: number;
  energyMax?: number;
  bombs?: number;
  weapon?: "W1" | "W2";
  w2?: W2State;
  weapons?: WeaponSnapshotHudLike;
};

type SessionLike = {
  score?: number;
  lives?: number;
  wave?: number;
  gameOver?: boolean;
};

type HudMode = "PLAY" | "TITLE" | "GAME_OVER";

// --- Fonts ----------------------------------------------------------------
const LABEL_FONT = "'Orbitron', sans-serif";
const EDGE_INSET_X = 7;
const EDGE_INSET_Y = 6;
const LABEL_FONT_SIZE = 10;
const WEAPON_TEXT_SIZE = 10;

// --- Palette --------------------------------------------------------------
const COL_CYAN = "#00ffee";

export type HudWeaponLevels = { w1Level: number; w2Level: number; w1Label: string; w2Label: string };
export type HudWeaponPresentationSnapshot = {
  w1: { weaponId: string; level: number };
  w2: { weaponId: string; level: number };
};
export type HudWeaponChangedSlots = { w1: boolean; w2: boolean };
export type HudWeaponSnapTarget = "w1" | "w2" | "both";

export function isHudScoreIncrease(previousScore: number | undefined, currentScore: number): boolean {
  return previousScore !== undefined && currentScore > previousScore;
}

export function normalizeHudWave(value: unknown): number {
  const wave = Number(value ?? 0);
  return Number.isFinite(wave) ? Math.max(0, Math.floor(wave)) : 0;
}

export function isHudWaveIncrease(previousWave: number | undefined, currentWave: number): boolean {
  return previousWave !== undefined && currentWave > previousWave;
}

export function isHudEnergyDecrease(previousEnergy: number | undefined, currentEnergy: number): boolean {
  return previousEnergy !== undefined && currentEnergy < previousEnergy;
}

export type HudEnergyResetContext = {
  scoreReset?: boolean;
  livesChanged?: boolean;
};

export function isHudEnergyHeal(
  previousEnergy: number | undefined,
  currentEnergy: number,
  resetContext: HudEnergyResetContext = {},
): boolean {
  return previousEnergy !== undefined
    && previousEnergy > 0
    && currentEnergy > previousEnergy
    && !resetContext.scoreReset
    && !resetContext.livesChanged;
}

export function normalizeHudBombCount(value: unknown): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function isHudBombChange(
  previousBombs: number | undefined,
  currentBombs: number,
  resetContext: HudEnergyResetContext = {},
): boolean {
  return previousBombs !== undefined
    && currentBombs !== previousBombs
    && !resetContext.scoreReset
    && !resetContext.livesChanged;
}

export function createHudScorePopController(scoreNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      activeAnimation?.cancel();
      activeAnimation = scoreNode.animate([
        { transform: "scale(1, 1)", filter: "brightness(1)", textShadow: `0 0 8px ${COL_CYAN}`, offset: 0 },
        {
          transform: `scale(${1 + 0.4 * amount}, ${1 + 0.25 * amount})`,
          filter: `brightness(${1 + 0.8 * amount})`,
          textShadow: `0 0 ${8 + 10 * amount}px ${COL_CYAN}`,
          offset: 0.3,
        },
        {
          transform: `scale(${1 - 0.05 * amount}, ${1 + 0.08 * amount})`,
          filter: `brightness(${1 + 0.15 * amount})`,
          textShadow: `0 0 ${8 + 2 * amount}px ${COL_CYAN}`,
          offset: 0.6,
        },
        { transform: "scale(1, 1)", filter: "brightness(1)", textShadow: `0 0 8px ${COL_CYAN}`, offset: 1 },
      ], { duration: 140 + 140 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudWavePopController(waveNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      activeAnimation?.cancel();
      activeAnimation = waveNode.animate([
        { transform: "scale(1, 1)", offset: 0 },
        { transform: `scale(${1 + 0.38 * amount}, ${1 + 0.28 * amount})`, offset: 0.24 },
        { transform: `scale(${1 - 0.06 * amount}, ${1 + 0.1 * amount})`, offset: 0.52 },
        { transform: `scale(${1 + 0.04 * amount}, ${1 - 0.02 * amount})`, offset: 0.75 },
        { transform: "scale(1, 1)", offset: 1 },
      ], { duration: 150 + 140 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudWaveFlashController(waveNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      const baseline = "brightness(1) saturate(1) drop-shadow(0 0 0px rgba(255,255,255,0)) drop-shadow(0 0 0px rgba(70,225,255,0))";
      const peak = amount === 0 ? baseline : `brightness(${1 + 1.6 * amount}) saturate(${1 + 0.4 * amount}) drop-shadow(0 0 ${4 * amount}px rgba(255,255,255,${amount})) drop-shadow(0 0 ${10 * amount}px rgba(70,225,255,${0.9 * amount}))`;
      const secondary = amount === 0 ? baseline : `brightness(${1 + 0.45 * amount}) saturate(${1 + 0.2 * amount}) drop-shadow(0 0 ${6 * amount}px rgba(70,225,255,${0.7 * amount}))`;
      activeAnimation?.cancel();
      activeAnimation = waveNode.animate([
        { filter: baseline, offset: 0 },
        { filter: peak, offset: 0.2 },
        { filter: secondary, offset: 0.52 },
        { filter: baseline, offset: 1 },
      ], { duration: 140 + 100 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudEnergyShakeController(energyNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      const x = 6 * amount;
      const y = 3 * amount;
      activeAnimation?.cancel();
      activeAnimation = energyNode.animate([
        { transform: "translate(0px, 0px)", offset: 0 },
        { transform: `translate(${-x}px, ${y}px)`, offset: 0.15 },
        { transform: `translate(${x}px, ${-y}px)`, offset: 0.3 },
        { transform: `translate(${-0.7 * x}px, ${-0.5 * y}px)`, offset: 0.45 },
        { transform: `translate(${0.6 * x}px, ${0.5 * y}px)`, offset: 0.6 },
        { transform: `translate(${-0.25 * x}px, 0px)`, offset: 0.78 },
        { transform: "translate(0px, 0px)", offset: 1 },
      ], { duration: 120 + 100 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudEnergyFlashController(energyNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number, variant: "hit" | "heal" = "hit"): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      const baseline = "brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))";
      activeAnimation?.cancel();
      activeAnimation = variant === "heal"
        ? energyNode.animate([
          { filter: baseline, offset: 0 },
          {
            filter: `brightness(${1 + 1.8 * amount}) saturate(${1 + 0.6 * amount}) drop-shadow(0 0 ${4 * amount}px rgba(235,255,248,${amount})) drop-shadow(0 0 ${11 * amount}px rgba(80,255,225,${0.85 * amount}))`,
            offset: 0.2,
          },
          {
            filter: `brightness(${1 + 0.5 * amount}) saturate(${1 + 0.3 * amount}) drop-shadow(0 0 ${6 * amount}px rgba(80,255,238,${0.65 * amount}))`,
            offset: 0.53,
          },
          { filter: baseline, offset: 1 },
        ], { duration: 140 + 110 * amount, easing: "ease-out" })
        : energyNode.animate([
          { filter: baseline, offset: 0 },
          {
            filter: `brightness(${1 + 1.1 * amount}) drop-shadow(0 0 ${7 * amount}px rgba(180,255,255,${0.9 * amount}))`,
            offset: 0.25,
          },
          {
            filter: `brightness(${1 + 0.3 * amount}) drop-shadow(0 0 ${3 * amount}px rgba(0,255,238,${0.45 * amount}))`,
            offset: 0.6,
          },
          { filter: baseline, offset: 1 },
        ], { duration: 90 + 90 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudWeaponSnapController(nodes: {
  w1: Pick<HTMLElement, "animate">;
  w2: Pick<HTMLElement, "animate">;
}) {
  let w1Animation: Animation | undefined;
  let w2Animation: Animation | undefined;

  const triggerSlot = (intensity: number, slot: "w1" | "w2"): Animation => {
    const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
    const activeAnimation = slot === "w1" ? w1Animation : w2Animation;
    activeAnimation?.cancel();
    const animation = nodes[slot].animate([
      { transform: "translateY(0px) scale(1, 1)", offset: 0 },
      { transform: `translateY(${-3 * amount}px) scale(${1 + 0.18 * amount}, ${1 - 0.08 * amount})`, offset: 0.2 },
      { transform: `translateY(${1.5 * amount}px) scale(${1 - 0.04 * amount}, ${1 + 0.08 * amount})`, offset: 0.42 },
      { transform: `translateY(${-0.5 * amount}px) scale(${1 + 0.03 * amount}, 1)`, offset: 0.7 },
      { transform: "translateY(0px) scale(1, 1)", offset: 1 },
    ], { duration: 110 + 70 * amount, easing: "ease-out" });
    if (slot === "w1") w1Animation = animation;
    else w2Animation = animation;
    return animation;
  };

  return {
    trigger(intensity: number, target: HudWeaponSnapTarget): Animation[] {
      if (target === "both") return [triggerSlot(intensity, "w1"), triggerSlot(intensity, "w2")];
      return [triggerSlot(intensity, target)];
    },
  };
}

export function createHudBombSnapController(bombNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      activeAnimation?.cancel();
      activeAnimation = bombNode.animate([
        { transform: "translateY(0px) scale(1, 1)", offset: 0 },
        { transform: `translateY(${-3.5 * amount}px) scale(${1 + 0.22 * amount}, ${1 - 0.1 * amount})`, offset: 0.18 },
        { transform: `translateY(${1.5 * amount}px) scale(${1 - 0.05 * amount}, ${1 + 0.1 * amount})`, offset: 0.4 },
        { transform: `translateY(${-0.5 * amount}px) scale(${1 + 0.03 * amount}, 1)`, offset: 0.68 },
        { transform: "translateY(0px) scale(1, 1)", offset: 1 },
      ], { duration: 120 + 80 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

export function createHudBombFlashController(bombNode: Pick<HTMLElement, "animate">) {
  let activeAnimation: Animation | undefined;
  return {
    trigger(intensity: number): Animation {
      const amount = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
      const baseline = "brightness(1) saturate(1) drop-shadow(0 0 0px rgba(255,244,190,0)) drop-shadow(0 0 0px rgba(255,102,0,0))";
      activeAnimation?.cancel();
      activeAnimation = bombNode.animate([
        { filter: baseline, offset: 0 },
        {
          filter: `brightness(${1 + 1.7 * amount}) saturate(${1 + 0.5 * amount}) drop-shadow(0 0 ${4 * amount}px rgba(255,244,190,${amount})) drop-shadow(0 0 ${10 * amount}px rgba(255,102,0,${0.9 * amount}))`,
          offset: 0.2,
        },
        {
          filter: `brightness(${1 + 0.5 * amount}) saturate(${1 + 0.2 * amount}) drop-shadow(0 0 ${6 * amount}px rgba(255,102,0,${0.7 * amount}))`,
          offset: 0.52,
        },
        { filter: baseline, offset: 1 },
      ], { duration: 140 + 100 * amount, easing: "ease-out" });
      return activeAnimation;
    },
  };
}

type HudEffectTrigger = { trigger(intensity: number): Animation };

export function triggerHudHitEffects(
  hit: ReturnType<typeof loadHudFxLabState>["events"]["hit"],
  energyShake: HudEffectTrigger,
  energyFlash: HudEffectTrigger,
): void {
  if (hit.shake.enabled) energyShake.trigger(hit.shake.intensity);
  if (hit.flash.enabled) energyFlash.trigger(hit.flash.intensity);
}

export function triggerHudBombEffects(
  bomb: ReturnType<typeof loadHudFxLabState>["events"]["bomb"],
  bombSnap: HudEffectTrigger,
  bombFlash: HudEffectTrigger,
): void {
  if (bomb.snap.enabled) bombSnap.trigger(bomb.snap.intensity);
  if (bomb.flash.enabled) bombFlash.trigger(bomb.flash.intensity);
}

export function triggerHudWaveEffects(
  wave: ReturnType<typeof loadHudFxLabState>["events"]["wave"],
  wavePop: HudEffectTrigger,
  waveFlash: HudEffectTrigger,
): void {
  if (wave.pop.enabled) wavePop.trigger(wave.pop.intensity);
  if (wave.flash.enabled) waveFlash.trigger(wave.flash.intensity);
}

function readHudLevel(slot: WeaponSlotHudLike | undefined): number {
  const n = Number(slot?.level ?? 1);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
}

function readHudWeaponLabel(slot: WeaponSlotHudLike | undefined, fallback: string): string {
  const name = String(slot?.displayName ?? "").trim();
  if (name) return name.toUpperCase().replace(/ GUN$/, "");
  const id = String(slot?.weaponId ?? "");
  if (id === "w1.spread") return "SPREAD";
  if (id === "w1.basic") return "BOLT";
  if (id === "w2.laser") return "LASER";
  return fallback;
}

export function getHudWeaponLevels(p: Pick<PlayerLike, "weapons">): HudWeaponLevels {
  return {
    w1Level: readHudLevel(p.weapons?.slots?.w1),
    w2Level: readHudLevel(p.weapons?.slots?.w2),
    w1Label: readHudWeaponLabel(p.weapons?.slots?.w1, "BOLT"),
    w2Label: readHudWeaponLabel(p.weapons?.slots?.w2, "LASER"),
  };
}

export function getHudWeaponPresentationSnapshot(p: Pick<PlayerLike, "weapons">): HudWeaponPresentationSnapshot {
  return {
    w1: { weaponId: String(p.weapons?.slots?.w1?.weaponId ?? ""), level: readHudLevel(p.weapons?.slots?.w1) },
    w2: { weaponId: String(p.weapons?.slots?.w2?.weaponId ?? ""), level: readHudLevel(p.weapons?.slots?.w2) },
  };
}

export function detectHudWeaponChanges(
  previous: HudWeaponPresentationSnapshot | undefined,
  current: HudWeaponPresentationSnapshot,
): HudWeaponChangedSlots {
  if (!previous) return { w1: false, w2: false };
  return {
    w1: current.w1.weaponId !== previous.w1.weaponId || current.w1.level > previous.w1.level,
    w2: current.w2.weaponId !== previous.w2.weaponId || current.w2.level > previous.w2.level,
  };
}

function mkChild(parent: HTMLElement, id: string, css: string): HTMLDivElement {
  const d = document.createElement("div");
  d.id = id;
  d.style.cssText = css;
  parent.appendChild(d);
  return d;
}

// --- Weapon icons ---------------------------------------------------------
// PNG loader with cache; returns null until the image has loaded (callers fall
// back to canvas drawing on the first frame, then use the PNG once cached).
const _iconCache: Record<string, HTMLImageElement> = {};
const _iconTried: Record<string, boolean> = {};

function loadWeaponIcon(name: string): HTMLImageElement | null {
  if (_iconCache[name]) return _iconCache[name];
  // Only kick off one request per name (avoids per-frame spam on missing PNGs).
  if (_iconTried[name]) return null;
  _iconTried[name] = true;
  const img = new Image();
  img.src = `/ui/${name}`;
  img.onload = () => { _iconCache[name] = img; };
  return null; // první frame = canvas fallback, pak PNG
}

function drawW1(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const png = loadWeaponIcon("icon-w1.png");
  if (png && png.complete) {
    ctx.globalAlpha = active ? 1.0 : 0.35;
    ctx.drawImage(png, 1, 1, w - 2, h - 2);
    ctx.globalAlpha = 1;
    return;
  }
  // cyan elongated laser bolt with glow
  ctx.globalAlpha = active ? 1 : 0.4;
  ctx.save();
  ctx.shadowColor = COL_CYAN;
  ctx.shadowBlur = active ? 8 : 2;
  ctx.fillStyle = COL_CYAN;
  const by = h / 2 - 2;
  ctx.fillRect(2, by, w - 8, 4);
  // bright tip
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(w - 8, by, 4, 4);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawW2(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  active: boolean,
  phase: number,
): void {
  ctx.clearRect(0, 0, w, h);
  const png = loadWeaponIcon("icon-w2.png");
  if (png && png.complete) {
    ctx.globalAlpha = active ? 1.0 : 0.35;
    ctx.drawImage(png, 1, 1, w - 2, h - 2);
    ctx.globalAlpha = 1;
    return;
  }
  // rainbow wavy beam
  ctx.globalAlpha = active ? 1 : 0.4;
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.shadowBlur = active ? 6 : 0;
  const cy = h / 2;
  const amp = h * 0.22;
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const x0 = 2 + ((w - 4) * i) / steps;
    const x1 = 2 + ((w - 4) * (i + 1)) / steps;
    const hue = ((i / steps) * 360 + phase * 60) % 360;
    const y0 = cy + Math.sin(i * 0.9 + phase) * amp;
    const y1 = cy + Math.sin((i + 1) * 0.9 + phase) * amp;
    const c = `hsl(${hue},100%,60%)`;
    ctx.strokeStyle = c;
    ctx.shadowColor = c;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function createHUDArcade(root: HTMLElement) {
  let mode: HudMode = "PLAY";
  let iconPhase = 0;
  let previousScore: number | undefined;
  let previousEnergy: number | undefined;
  let previousLives: number | undefined;
  let previousBombs: number | undefined;
  let previousWave: number | undefined;
  let previousWeaponSnapshot: HudWeaponPresentationSnapshot | undefined;

  // one-time keyframes/styles for the CRT-ish HUD overlay + rainbow cooldown
  if (!document.getElementById("hudArcadeStyles")) {
    const st = document.createElement("style");
    st.id = "hudArcadeStyles";
    st.textContent = `
      @keyframes hudRainbow { 0%{background-position:0% 0} 100%{background-position:200% 0} }
      #hudScan {
        position:absolute; inset:0; pointer-events:none; z-index:2;
        background:repeating-linear-gradient(
          to bottom, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px,
          transparent 1px, transparent 3px);
        mix-blend-mode:multiply; opacity:0.5;
      }`;
    document.head.appendChild(st);
  }

  // HUD layer positioned to match the PRESENT rect (CSS px)
  const layer = document.createElement("div");
  layer.id = "hudLayer";
  layer.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;z-index:10001;" +
    "pointer-events:none;overflow:hidden;color:white;" +
    `font-family:${LABEL_FONT};text-shadow:0 0 6px rgba(0,255,238,0.35),0 2px 0 rgba(0,0,0,0.7);`;
  root.appendChild(layer);

  // ---- HUD blocks container (toggled by mode) ----
  const panel = mkChild(layer, "hudPanel", "position:absolute;inset:0;z-index:3;");

  // ===== ENERGY block (top-left) =====
  const energyBlock = mkChild(panel, "hudEnergyBlock", `position:absolute;left:${EDGE_INSET_X}px;top:${EDGE_INSET_Y}px;`);
  energyBlock.className = "hud-block hud-energy-block";
  const energyLabel = mkChild(energyBlock, "hudEnergyLabel", `font-size:${LABEL_FONT_SIZE}px;letter-spacing:1.5px;color:${COL_CYAN};`);
  energyLabel.className = "hud-label hud-energy-label";
  energyLabel.textContent = "ENERGY";
  const energy = mkChild(
    energyBlock,
    "hudEnergy",
    "display:flex;gap:2px;margin-top:4px;line-height:normal;",
  );
  energy.className = "hud-energy-segments";
  const energySegments = Array.from({ length: 6 }, (_, index) => {
    const segment = mkChild(energy, `hudEnergySegment${index + 1}`, "width:14px;height:11px;border:1px solid rgba(0,255,238,0.4);");
    segment.className = "hud-energy-segment";
    segment.dataset.segment = String(index + 1);
    return segment;
  });
  const energyShake = createHudEnergyShakeController(energy);
  const energyFlash = createHudEnergyFlashController(energy);
  const lives = mkChild(
    energyBlock,
    "hudLives",
    "display:flex;gap:5px;margin-top:6px;",
  );
  lives.className = "hud-lives";

  // ===== SCORE block (top-right) =====
  const scoreBlock = mkChild(panel, "hudScoreBlock", `position:absolute;right:${EDGE_INSET_X}px;top:${EDGE_INSET_Y}px;text-align:right;`);
  scoreBlock.className = "hud-block hud-score-block";
  const scoreLabel = mkChild(scoreBlock, "hudScoreLabel", `font-size:${LABEL_FONT_SIZE}px;letter-spacing:1.5px;color:${COL_CYAN};`);
  scoreLabel.className = "hud-label hud-score-label";
  scoreLabel.textContent = "SCORE";
  const score = mkChild(
    scoreBlock,
    "hudScore",
    "margin-top:2px;line-height:normal;" +
      "font-family:'Share Tech Mono',monospace;font-size:19px;letter-spacing:2px;" +
      `color:#ffffff;text-shadow:0 0 8px ${COL_CYAN};`,
  );
  score.className = "hud-value hud-score-value";
  score.style.transformOrigin = "right center";
  const scorePop = createHudScorePopController(score);

  // ===== WAVE block (top-center) =====
  const waveBlock = mkChild(
    panel,
    "hudWaveBlock",
    `position:absolute;left:50%;top:${EDGE_INSET_Y}px;transform:translateX(-50%);text-align:center;`,
  );
  waveBlock.className = "hud-block hud-wave-block";
  const waveLabel = mkChild(waveBlock, "hudWaveLabel", `font-size:${LABEL_FONT_SIZE}px;letter-spacing:1.5px;color:${COL_CYAN};`);
  waveLabel.className = "hud-label hud-wave-label";
  waveLabel.textContent = "WAVE";
  const wave = mkChild(
    waveBlock,
    "hudWave",
    "margin-top:2px;line-height:normal;" +
      `font-family:${LABEL_FONT};font-size:13px;font-weight:700;` +
      `color:#ffffff;text-shadow:0 0 6px ${COL_CYAN};`,
  );
  wave.className = "hud-value hud-wave-value";
  wave.style.transformOrigin = "center center";
  const wavePop = createHudWavePopController(wave);
  const waveFlash = createHudWaveFlashController(wave);

  // ===== WEAPON block (bottom-left) =====
  const weaponBlock = mkChild(panel, "hudWeaponBlock", `position:absolute;left:${EDGE_INSET_X}px;bottom:${EDGE_INSET_Y}px;display:flex;align-items:center;gap:14px;`);
  weaponBlock.className = "hud-weapon-block";

  function mkWeaponGroup(id: string, className: string, labelText: string): HTMLDivElement {
    const group = mkChild(weaponBlock, id, "display:flex;align-items:center;gap:6px;line-height:normal;");
    group.className = className;
    const label = mkChild(group, `${id}Label`, `font-size:${WEAPON_TEXT_SIZE}px;font-weight:700;color:${COL_CYAN};`);
    label.className = "hud-weapon-label";
    label.textContent = labelText;
    return group;
  }
  const w1Group = mkWeaponGroup("hudW1Group", "hud-weapon-group hud-w1-group", "W1");
  const w2Group = mkWeaponGroup("hudW2Group", "hud-weapon-group hud-w2-group", "W2");
  const bombGroup = mkWeaponGroup("hudBombGroup", "hud-weapon-group hud-bomb-group", "B");
  w1Group.style.transformOrigin = "center center";
  w2Group.style.transformOrigin = "center center";
  bombGroup.style.transformOrigin = "center center";
  const weaponSnap = createHudWeaponSnapController({ w1: w1Group, w2: w2Group });
  const bombSnap = createHudBombSnapController(bombGroup);
  const bombFlash = createHudBombFlashController(bombGroup);
  const generic = {
    score: createGenericHudFxController(score),
    energy: createGenericHudFxController(energy),
    wave: createGenericHudFxController(wave),
    w1: createGenericHudFxController(w1Group),
    w2: createGenericHudFxController(w2Group),
    bomb: createGenericHudFxController(bombGroup),
  };
  type TargetId = keyof typeof generic;
  const targetsFor = (eventId: HudFxEventId, weaponTarget: HudWeaponSnapTarget = "both"): TargetId[] => {
    if (eventId === "score") return ["score"];
    if (eventId === "hit" || eventId === "heal") return ["energy"];
    if (eventId === "wave") return ["wave"];
    if (eventId === "bomb") return ["bomb"];
    return weaponTarget === "both" ? ["w1", "w2"] : [weaponTarget];
  };
  const isSpecialized = (eventId: HudFxEventId, effectId: HudFxEffectId): boolean =>
    (eventId === "score" && effectId === "pop")
    || (eventId === "hit" && (effectId === "shake" || effectId === "flash"))
    || (eventId === "heal" && effectId === "flash")
    || (eventId === "wave" && (effectId === "pop" || effectId === "flash"))
    || (eventId === "weapon" && effectId === "snap")
    || (eventId === "bomb" && (effectId === "snap" || effectId === "flash"));
  const triggerSpecialized = (eventId: HudFxEventId, effectId: HudFxEffectId, intensity: number, weaponTarget: HudWeaponSnapTarget): void => {
    if (eventId === "score" && effectId === "pop") scorePop.trigger(intensity);
    else if (eventId === "hit" && effectId === "shake") energyShake.trigger(intensity);
    else if (eventId === "hit" && effectId === "flash") energyFlash.trigger(intensity);
    else if (eventId === "heal" && effectId === "flash") energyFlash.trigger(intensity, "heal");
    else if (eventId === "wave" && effectId === "pop") wavePop.trigger(intensity);
    else if (eventId === "wave" && effectId === "flash") waveFlash.trigger(intensity);
    else if (eventId === "weapon" && effectId === "snap") weaponSnap.trigger(intensity, weaponTarget);
    else if (eventId === "bomb" && effectId === "snap") bombSnap.trigger(intensity);
    else if (eventId === "bomb" && effectId === "flash") bombFlash.trigger(intensity);
  };
  const dispatchHudFx = (eventId: HudFxEventId, settings: HudFxLabState["events"][HudFxEventId], weaponTarget: HudWeaponSnapTarget = "both"): void => {
    for (const effectId of HUD_FX_EFFECTS) {
      const setting = settings[effectId];
      if (!setting.enabled) continue;
      if (isSpecialized(eventId, effectId)) triggerSpecialized(eventId, effectId, setting.intensity, weaponTarget);
      else for (const target of targetsFor(eventId, weaponTarget)) generic[target].trigger(effectId, setting.intensity);
    }
  };
  setHudFxPreviewHandler((request) => {
    const previewSettings = Object.fromEntries(HUD_FX_EFFECTS.map((id) => [id, { enabled: id === request.effectId, intensity: request.intensity }])) as HudFxLabState["events"][HudFxEventId];
    dispatchHudFx(request.eventId, previewSettings);
  });

  function mkIconCanvas(parent: HTMLElement, id: string): HTMLCanvasElement {
    const wrap = mkChild(parent, id + "Wrap", "line-height:0;");
    const c = document.createElement("canvas");
    c.id = id;
    c.width = 28;
    c.height = 14;
    c.style.cssText = "width:17px;height:9px;display:block;";
    wrap.appendChild(c);
    return c;
  }
  const w1 = mkIconCanvas(w1Group, "hudW1");
  const w2 = mkIconCanvas(w2Group, "hudW2");

  const weaponLevelCss =
    "line-height:normal;white-space:nowrap;" +
    `font-family:'Share Tech Mono',monospace;font-size:${WEAPON_TEXT_SIZE}px;letter-spacing:1px;` +
    `color:#ffffff;text-shadow:0 0 5px ${COL_CYAN};`;
  const w1Level = mkChild(w1Group, "hudW1Level", weaponLevelCss);
  const w2Level = mkChild(w2Group, "hudW2Level", weaponLevelCss);

  const cdTrack = mkChild(
    w2Group,
    "hudCdTrack",
    "width:29px;height:4px;" +
      "background:rgba(255,255,255,0.12);border-radius:1px;overflow:hidden;",
  );
  cdTrack.className = "hud-cooldown-track";
  const cdFill = mkChild(
    cdTrack,
    "hudCdFill",
    `height:100%;width:0%;background:${COL_CYAN};box-shadow:0 0 4px ${COL_CYAN};transition:width 0.1s linear;`,
  );
  cdFill.className = "hud-cooldown-fill";

  const bomb = mkChild(
    bombGroup,
    "hudBomb",
    "display:flex;align-items:center;gap:4px;line-height:normal;",
  );

  // ---- CRT scanline overlay over the HUD ----
  mkChild(layer, "hudScan", "");

  // ---- Overlays (PAUSE / TITLE / GAME OVER) preserved ----
  const pause = mkChild(
    layer,
    "hudPause",
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;" +
      `font-family:${LABEL_FONT};font-weight:700;font-size:32px;letter-spacing:4px;display:none;`,
  );
  pause.textContent = "PAUSED";

  const title = mkChild(
    layer,
    "hudTitle",
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;" +
      `text-align:center;font-family:${LABEL_FONT};font-weight:700;font-size:22px;` +
      "letter-spacing:3px;line-height:1.6;display:none;white-space:pre;",
  );
  title.textContent = "CAPTAIN MEOW\n\nPRESS ENTER";

  const gameOver = mkChild(
    layer,
    "hudGameOver",
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;" +
      `text-align:center;font-family:${LABEL_FONT};font-weight:700;font-size:30px;` +
      "letter-spacing:3px;line-height:1.5;display:none;white-space:pre;",
  );
  gameOver.textContent = "GAME OVER\nTry again? Y/N";

  const refs: HudRefs = {
    layer, panel, lives, energySegments, wave, score, w1, w2, w1Level, w2Level, bomb, cdFill, pause, gameOver, title,
  };

  function applyMode() {
    refs.title.style.display = mode === "TITLE" ? "block" : "none";
    refs.gameOver.style.display = mode === "GAME_OVER" ? "block" : "none";
    refs.panel.style.display = mode === "PLAY" ? "flex" : "none";
  }
  applyMode();

  // lives as ship PNG icons; bright+glow = alive, dimmed/grayscale = lost. Max 3.
  function renderLives(n: number) {
    const shipSrc = "/ui/ship_icon.png";
    const lifeCount = Math.max(0, Math.min(3, n | 0));
    let livesHtml = "";
    for (let i = 0; i < 3; i++) {
      const alive = i < lifeCount;
      livesHtml += `<img src="${shipSrc}" onerror="this.style.display='none'"
        style="height:19px;width:auto;display:block;
        filter:${alive
          ? "brightness(1) drop-shadow(0 0 2px #00ffee)"
          : "brightness(0.2) grayscale(1)"};">`;
    }
    refs.lives.innerHTML = livesHtml;
  }

  // W2 cooldown fill color by charge; rainbow while firing.
  function renderCooldown(active: boolean, c01: number) {
    const pct = Math.max(0, Math.min(1, c01)) * 100;
    refs.cdFill.style.width = `${pct}%`;
    if (active) {
      refs.cdFill.style.background =
        "linear-gradient(90deg,#ff0040,#ffaa00,#00ffee,#3366ff,#ff00ff,#ff0040)";
      refs.cdFill.style.backgroundSize = "200% 100%";
      refs.cdFill.style.animation = "hudRainbow 0.8s linear infinite";
    } else {
      refs.cdFill.style.animation = "none";
      refs.cdFill.style.backgroundSize = "100% 100%";
      const col = c01 >= 0.6 ? COL_CYAN : c01 >= 0.2 ? "#ffaa00" : "#ff2266";
      refs.cdFill.style.background = col;
    }
  }

  return {
    // called from main with gfx.getPresentRect() (CSS px)
    setRect: (x: number, y: number, w: number, h: number) => {
      refs.layer.style.left = `${x}px`;
      refs.layer.style.top = `${y}px`;
      refs.layer.style.width = `${w}px`;
      refs.layer.style.height = `${h}px`;
    },

    setPaused: (on: boolean) => {
      refs.pause.style.display = on ? "block" : "none";
    },

    setMode: (m: HudMode) => {
      mode = m;
      applyMode();
    },

    update: (p: PlayerLike, s: SessionLike, waveText?: string) => {
      const currentLives = (s.lives ?? 0) | 0;
      const livesChanged = previousLives !== undefined && currentLives !== previousLives;
      renderLives(currentLives);

      // wave / score numbers drawn into their pre-styled overlay divs
      const currentWave = normalizeHudWave(s.wave);
      refs.wave.textContent = waveText ?? String((s.wave ?? 0) | 0).padStart(2, "0");
      if (isHudWaveIncrease(previousWave, currentWave)) {
        const waveFx = loadHudFxLabState(localStorage).events.wave;
        dispatchHudFx("wave", waveFx);
      }
      previousWave = currentWave;
      const currentScore = Number(s.score ?? 0);
      refs.score.textContent = String(Math.floor(currentScore)).padStart(6, "0");
      const scoreReset = previousScore !== undefined && currentScore < previousScore;
      if (isHudScoreIncrease(previousScore, currentScore)) {
        const scoreFx = loadHudFxLabState(localStorage).events.score;
        dispatchHudFx("score", scoreFx);
      }
      previousScore = currentScore;

      // Energy segments are persistent DOM primitives; updates only change state.
      const energyVal = p.energy ?? 0;
      const energyMax = p.energyMax ?? 5;
      const energyRatio = energyMax > 0 ? energyVal / energyMax : 0;
      const totalSegs = 6;
      const filledSegs = Math.round(energyRatio * totalSegs);
      for (let i = 0; i < refs.energySegments.length; i++) {
        const filled = i < filledSegs;
        const segment = refs.energySegments[i];
        segment.dataset.filled = String(filled);
        segment.style.background = filled ? COL_CYAN : "rgba(0,255,238,0.12)";
        segment.style.boxShadow = filled ? `0 0 4px ${COL_CYAN}` : "none";
      }
      if (isHudEnergyDecrease(previousEnergy, energyVal)) {
        const hit = loadHudFxLabState(localStorage).events.hit;
        dispatchHudFx("hit", hit);
      } else if (isHudEnergyHeal(previousEnergy, energyVal, {
        scoreReset,
        livesChanged,
      })) {
        const heal = loadHudFxLabState(localStorage).events.heal;
        dispatchHudFx("heal", heal);
      }
      previousEnergy = energyVal;
      previousLives = currentLives;

      const currentWeaponSnapshot = getHudWeaponPresentationSnapshot(p);

      // weapon icons (animated)
      iconPhase += 0.15;
      const activeW = p.weapon ?? "W1";
      const ctx1 = refs.w1.getContext("2d");
      const ctx2 = refs.w2.getContext("2d");
      if (ctx1) drawW1(ctx1, 14, 7, activeW === "W1");
      if (ctx2) drawW2(ctx2, 14, 7, activeW === "W2", iconPhase);

      const weaponLevels = getHudWeaponLevels(p);
      refs.w1Level.textContent = `${weaponLevels.w1Label} LVL ${weaponLevels.w1Level}`;
      refs.w2Level.textContent = `LVL ${weaponLevels.w2Level}`;

      const changedWeaponSlots = detectHudWeaponChanges(previousWeaponSnapshot, currentWeaponSnapshot);
      if (changedWeaponSlots.w1 || changedWeaponSlots.w2) {
        const weaponFx = loadHudFxLabState(localStorage).events.weapon;
        const target = changedWeaponSlots.w1 && changedWeaponSlots.w2 ? "both" : changedWeaponSlots.w1 ? "w1" : "w2";
        dispatchHudFx("weapon", weaponFx, target);
      }
      previousWeaponSnapshot = currentWeaponSnapshot;

      // bomb: PNG icon + count (icon degrades to count-only if PNG missing)
      const b = normalizeHudBombCount(p.bombs);
      refs.bomb.innerHTML =
        `<img src="/ui/icon-bomb.png" onerror="this.style.display='none'"
          style="height:14px;width:auto;display:block;filter:drop-shadow(0 0 2px #ff6600);` +
        `opacity:${b > 0 ? 1 : 0.25};">` +
        `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#ff6600;` +
        `text-shadow:0 0 4px #ff6600;">×${b}</span>`;
      if (isHudBombChange(previousBombs, b, { scoreReset, livesChanged })) {
        const bomb = loadHudFxLabState(localStorage).events.bomb;
        dispatchHudFx("bomb", bomb);
      }
      previousBombs = b;

      // W2 cooldown bar
      const w2s = p.w2 ?? {};
      renderCooldown(!!w2s.active, Number(w2s.charge01 ?? 1));

      // auto-switch to GAME_OVER if session says so
      if (s.gameOver) {
        if (mode !== "GAME_OVER") { mode = "GAME_OVER"; applyMode(); }
      } else if (mode === "GAME_OVER") {
        mode = "PLAY";
        applyMode();
      }
    },
  };
}
