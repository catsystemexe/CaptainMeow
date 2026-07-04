import type { EventBus } from "../engine/core/EventBus";
import { EventType, type CMEventMap } from "../engine/core/events";
import type { WorldState } from "../game/data/WorldState";
import { ENEMY_DEFS } from "../game/defs/EnemyDefs";
import { CONTENT } from "../game/content/CONTENT";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";
import { FsmPreviewSession } from "./FsmPreviewSession";
import { EnemyBehaviorPresets } from "../game/enemies/EnemyBehaviorPresets";
import { getFsmDebugSnapshot, type FsmDebugSnapshot } from "../game/enemies/fsm";
import { ENEMY_GROUP_COHESION_IDS, ENEMY_GROUP_FORMATION_IDS, ENEMY_GROUP_PARAM_LIMITS, normalizeEnemyGroupParams, normalizeGroupFormationStartAngle } from "../game/enemies/EnemyGroups";
import type { CohesionId, FormationId } from "../game/enemies/EnemyGroups";

export const DEV_SUMMONER_PANEL_ID = "dev-summoner";
export const FSM_PRESET_EDITOR_ID = "ds-fsm-preset-editor";
export const ENEMY_LAB_DEBUG_PANEL_ID = "ds-enemy-lab-debug";
const EMPTY_ENEMY_LAB = "No FSM enemy selected/spawned.";
type MovementClassId = "dumb" | "smart";
type SpawnMode = "enemy" | "group";
type EnemyLabMode = "simple" | "smart" | "fsm";

type MovementGroups = Record<MovementClassId, Record<string, string[]>>;
type RetainedFsmInspectionStatus = "live" | "ended";
type RetainedFsmInspectionEndReason = "despawned" | "removed";

export interface RetainedFsmInspection {
  readonly graph: readonly unknown[];
  readonly runtime: FsmDebugSnapshot;
  readonly status: RetainedFsmInspectionStatus;
  readonly endReason?: RetainedFsmInspectionEndReason;
  readonly typeId?: string;
  readonly hpLabel?: string;
  readonly position?: ReturnType<typeof getEnemyPositionDebug>;
}

type CompactSelectOption = { value: string; label: string; disabled?: boolean };

export function createDevSummonerPanelStyle(): string {
  return [
    "position:fixed", "top:8px", "right:8px", "z-index:9999",
    "background:rgba(0,0,0,0.75)", "border:1px solid #444",
    "color:#eee", "font:12px monospace", "padding:3px",
    "border-radius:2px", "display:flex", "flex-direction:column", "gap:5px",
    "width:220px",
    "min-width:220px",
    "max-width:220px",
    "max-height:calc(100vh - 16px)",
    "box-sizing:border-box",
    "overflow-x:hidden",
    "overflow-y:auto",
  ].join(";");
}

export function groupFormationSelectOptions(): Array<{ value: FormationId; label: string }> {
  const formationLabel = (id: FormationId) => id === "line.horizontal" ? "Line"
    : id === "wedge" ? "Wedge"
      : id === "column.vertical" ? "Column"
        : id === "arc.forward" ? "Arc"
          : "Ring";
  return ENEMY_GROUP_FORMATION_IDS.map((id) => ({ value: id, label: formationLabel(id) }));
}

const CONTROL_HEIGHT_PX = 26;
const CONTROL_RADIUS_PX = 2;
const CONTROL_FONT = "12px monospace";
const CONTROL_BG = "#111";
const CONTROL_BORDER = "1px solid rgba(255,255,255,0.24)";
const LABEL_WEIGHT = "800";

function applyControlBaseStyle(el: HTMLElement): void {
  el.style.boxSizing = "border-box";
  el.style.minHeight = `${CONTROL_HEIGHT_PX}px`;
  el.style.font = CONTROL_FONT;
  el.style.color = "#eee";
  el.style.background = CONTROL_BG;
  el.style.border = CONTROL_BORDER;
  el.style.borderRadius = `${CONTROL_RADIUS_PX}px`;
}

function applyNativeSelectStyle(select: HTMLSelectElement): void {
  applyControlBaseStyle(select);
  select.style.width = "100%";
  select.style.minWidth = "0";
  select.style.padding = "2px 18px 2px 5px";
  select.style.cursor = "pointer";
  select.style.appearance = "none";
  select.style.setProperty("-webkit-appearance", "none");
  select.style.textOverflow = "ellipsis";
  select.style.overflow = "hidden";
  select.style.whiteSpace = "nowrap";
}

function applyValueInputStyle(input: HTMLInputElement): void {
  applyControlBaseStyle(input);
  input.style.width = "52px";
  input.style.padding = "2px 4px";
  input.style.textAlign = "center";
  input.style.appearance = "textfield";
  input.style.setProperty("-webkit-appearance", "none");
}

function applyLabelTextStyle(el: HTMLElement, prominence: "primary" | "secondary" = "primary"): void {
  el.style.fontFamily = "monospace";
  el.style.fontSize = "12px";
  el.style.fontWeight = LABEL_WEIGHT;
  el.style.color = prominence === "primary" ? "#f2f2f2" : "#d7d7d7";
  el.style.opacity = prominence === "primary" ? "0.98" : "0.88";
  el.style.lineHeight = "1.05";
  el.style.whiteSpace = "nowrap";
}

function applyInlineStepperButtonStyle(button: HTMLButtonElement): void {
  button.style.cssText = [
    "font:12px monospace",
    "min-width:24px",
    "min-height:26px",
    "padding:0 5px",
    "border:0",
    "border-radius:2px",
    "background:transparent",
    "color:#ddd",
    "cursor:pointer",
    "box-sizing:border-box",
  ].join(";");
}

function createSectionGap(): HTMLDivElement {
  const gap = document.createElement("div");
  gap.style.cssText = "height:4px;min-height:4px;";
  gap.setAttribute("aria-hidden", "true");
  return gap;
}

const KNOWN_PRIMITIVE_ORDER = ["straight", "diagonal", "sine", "zigzag", "loop", "track", "align", "evade", "range", "orbit", "invaders", "none"] as const;
const KNOWN_PRIMITIVE_INDEX = new Map<string, number>(KNOWN_PRIMITIVE_ORDER.map((id, index) => [id, index]));

function formatNum(value: unknown, digits = 0): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "?";
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}



function describeResolvedCondition(condition: any): string {
  if (!condition) return "none";
  if (condition.type === "screenXBelow") return `screenX < ${formatNum(condition.params?.x)}`;
  if (condition.type === "timeInState") return `timeInState ≥ ${formatNum(condition.params?.seconds)}s`;
  if (condition.type === "hpBelow") return `hp < ${formatNum(Number(condition.params?.ratio) * 100)}%`;
  if (condition.type === "offscreen") return `offscreen ${String(condition.params?.side ?? "?")}`;
  if (condition.type === "distanceToPlayer") return `distance ${String(condition.params?.op ?? "?")} ${formatNum(condition.params?.px)}`;
  return String(condition.type ?? "unknown");
}

function describeNextTransition(state: any): string {
  const transitions = state?.transitions;
  if (!Array.isArray(transitions) || transitions.length === 0) return "none";
  return transitions.map((t: any) => describeResolvedCondition(t?.condition)).join(" | ");
}

function describeStateMovement(state: any): string {
  const base = state?.movement?.base;
  if (base?.type === "movementPreset") return String(base.params?.presetId ?? "none");
  return String(base?.type ?? "none");
}

function describeStateAttack(state: any): string {
  const combat = state?.combat;
  if (combat?.mode === "profile") return String(combat.profileId ?? "none");
  return String(combat?.mode ?? "disabled");
}

function renderFsmGraphView(runtime: FsmDebugSnapshot, states: readonly any[]): string {
  if (!states.length) return `<div><b>FSM Graph</b><br>none</div>`;

  const blocks: string[] = [`<div style="margin-top:6px;font-weight:bold;font-size:12px;">FSM Preset ${esc(runtime.presetId)}</div>`];

  states.forEach((state, index) => {
    const active = index === runtime.stateIndex;
    const title = `${active ? "▶ " : ""}${esc(state?.label || state?.id || index)}`;

    blocks.push(`<div style="margin-top:3px;padding:3px 5px;background:rgba(255,255,255,0.08);border-radius:3px;font-size:11px;line-height:1.15;">
<div style="font-weight:bold;background:rgba(255,255,255,0.10);padding:1px 3px;margin:-1px -3px 2px -3px;border-radius:2px;">${title}</div>
<div><b>id:</b> ${esc(state?.id ?? index)}</div>
<div><b>mov:</b> ${esc(describeStateMovement(state))}</div>
<div><b>atk:</b> ${esc(describeStateAttack(state))}</div>
<div><b>next:</b> ${esc(describeNextTransition(state))}</div>
</div>`);
  });

  return blocks.join("");
}

function getEnemyHpLabel(enemy: any): string {
  const hp = Number(enemy?.hp?.value ?? enemy?.hp ?? 0);
  const maxHp = Number(enemy?.hp?.max ?? enemy?.maxHp ?? hp);
  return `${formatNum(hp)} / ${formatNum(maxHp)}`;
}

function getEnemyPositionDebug(enemy: any, scrollX: number) {
  const worldX = Number(enemy?.pos?.x ?? 0);
  const worldY = Number(enemy?.pos?.y ?? 0);
  return {
    screenX: worldX - scrollX,
    screenY: worldY,
    worldX,
    worldY,
  };
}

function getFsmRuntimeDebug(enemy: any): FsmDebugSnapshot | null {
  return getFsmDebugSnapshot(enemy);
}

function cloneFsmRuntimeDebug(runtime: FsmDebugSnapshot): FsmDebugSnapshot {
  return Object.freeze({
    ...runtime,
    modifierTypes: Object.freeze([...runtime.modifierTypes]),
  });
}

function cloneFsmGraphViewStates(states: readonly unknown[]): readonly unknown[] {
  return Object.freeze(states.map((state: any) => Object.freeze({
    id: state?.id,
    label: state?.label,
    movement: state?.movement ? Object.freeze({
      base: state.movement.base ? Object.freeze({
        type: state.movement.base.type,
        params: Object.freeze({ ...(state.movement.base.params ?? {}) }),
      }) : undefined,
      modifiers: Object.freeze([...(state.movement.modifiers ?? [])].map((modifier: any) => Object.freeze({
        type: modifier?.type,
        params: Object.freeze({ ...(modifier?.params ?? {}) }),
      }))),
    }) : undefined,
    combat: state?.combat ? Object.freeze({ ...state.combat }) : undefined,
    transitions: Object.freeze([...(state?.transitions ?? [])].map((transition: any) => Object.freeze({
      condition: transition?.condition ? Object.freeze({
        type: transition.condition.type,
        params: Object.freeze({ ...(transition.condition.params ?? {}) }),
      }) : undefined,
      targetStateIndex: transition?.targetStateIndex,
      targetStateId: transition?.targetStateId,
    }))),
  })));
}

export function createLiveFsmInspection(enemy: any, scrollX = 0): RetainedFsmInspection | null {
  const runtime = getFsmRuntimeDebug(enemy);
  const states = enemy?.fsm?.preset?.states;
  if (!runtime || !Array.isArray(states)) return null;
  return Object.freeze({
    graph: cloneFsmGraphViewStates(states),
    runtime: cloneFsmRuntimeDebug(runtime),
    status: "live" as const,
    typeId: typeof enemy?.typeId === "string" ? enemy.typeId : undefined,
    hpLabel: getEnemyHpLabel(enemy),
    position: Object.freeze(getEnemyPositionDebug(enemy, scrollX)),
  });
}

export function endFsmInspection(previous: RetainedFsmInspection | null, endReason: RetainedFsmInspectionEndReason = "removed"): RetainedFsmInspection | null {
  if (!previous) return null;
  return Object.freeze({
    ...previous,
    status: "ended" as const,
    endReason,
    runtime: cloneFsmRuntimeDebug(previous.runtime),
    graph: cloneFsmGraphViewStates(previous.graph),
    position: previous.position ? Object.freeze({ ...previous.position }) : undefined,
  });
}

function createSelectLabel(text: string, prominence: "primary" | "secondary" = "primary"): HTMLLabelElement {
  const label = document.createElement("label");
  label.style.cssText = "display:flex;flex-direction:column;gap:2px;min-width:0;";
  const span = document.createElement("span");
  span.textContent = text;
  applyLabelTextStyle(span, prominence);
  label.appendChild(span);
  return label;
}

function appendOption(select: HTMLSelectElement, value: string, text = value, disabled = false): void {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  opt.disabled = disabled;
  select.appendChild(opt);
}

function formatPrimitiveLabel(primitive: string): string {
  if (primitive === "none") return "Hold";
  if (primitive === "loop") return "Loop";
  if (primitive === "track") return "Track";
  if (primitive === "align") return "Align";
  if (primitive === "evade") return "Evade";
  if (primitive === "range") return "Range";
  if (primitive === "orbit") return "Orbit";
  return primitive;
}

function sortPrimitiveIds(primitives: string[]): string[] {
  return [...primitives].sort((a, b) => {
    const ai = KNOWN_PRIMITIVE_INDEX.get(a);
    const bi = KNOWN_PRIMITIVE_INDEX.get(b);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function createCompactSelect(id: string): {
  root: HTMLDivElement;
  button: HTMLButtonElement;
  value: string;
  disabled: boolean;
  setOptions(options: CompactSelectOption[], nextValue?: string): void;
  addEventListener(type: "change", listener: () => void): void;
  destroy(): void;
} {
  const root = document.createElement("div");
  root.id = id;
  root.style.cssText = "position:relative;width:100%;";

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.style.cssText = [
    "width:100%",
    "box-sizing:border-box",
    "text-align:left",
    "font:12px monospace",
    "min-height:26px",
    "padding:2px 18px 2px 5px",
    "background:#111",
    "color:#eee",
    "border:1px solid rgba(255,255,255,0.24)",
    "border-radius:2px",
    "cursor:pointer",
  ].join(";");
  root.appendChild(button);

  const list = document.createElement("div");
  list.setAttribute("role", "listbox");
  list.style.cssText = [
    "display:none",
    "position:absolute",
    "left:0",
    "right:0",
    "top:100%",
    "z-index:10000",
    "max-height:132px",
    "overflow:auto",
    "background:#111",
    "border:1px solid #666",
    "border-radius:2px",
    "box-shadow:0 3px 8px rgba(0,0,0,0.45)",
  ].join(";");
  root.appendChild(list);

  let options: CompactSelectOption[] = [];
  let value = "";
  const listeners: Array<() => void> = [];

  const close = () => {
    list.style.display = "none";
    button.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    if (button.disabled) return;
    list.style.display = "block";
    button.setAttribute("aria-expanded", "true");
  };
  const selectedLabel = () => options.find((option) => option.value === value)?.label ?? "(none)";

  const choose = (nextValue: string) => {
    if (value === nextValue) {
      close();
      return;
    }
    value = nextValue;
    button.textContent = selectedLabel();
    close();
    for (const listener of listeners) listener();
  };

  const renderOptions = () => {
    list.replaceChildren();
    for (const option of options) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.value === value));
      item.disabled = !!option.disabled;
      item.textContent = option.label;
      item.style.cssText = [
        "display:block",
        "width:100%",
        "box-sizing:border-box",
        "text-align:left",
        "font:12px monospace",
        "min-height:26px",
        "padding:3px 5px",
        "background:" + (option.value === value ? "#26384f" : "#111"),
        "color:#eee",
        "border:0",
        "cursor:pointer",
      ].join(";");
      item.addEventListener("click", () => choose(option.value));
      list.appendChild(item);
    }
  };

  button.addEventListener("click", () => {
    if (list.style.display === "none") open();
    else close();
  });
  button.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      close();
      return;
    }
    if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp" && ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    if (ev.key === "Enter" || ev.key === " ") {
      open();
      return;
    }
    const enabled = options.filter((option) => !option.disabled);
    if (!enabled.length) return;
    const currentIndex = Math.max(0, enabled.findIndex((option) => option.value === value));
    const delta = ev.key === "ArrowDown" ? 1 : -1;
    choose(enabled[(currentIndex + delta + enabled.length) % enabled.length].value);
  });
  const handleDocumentClick = (ev: MouseEvent) => {
    if (!root.contains(ev.target as Node)) close();
  };
  document.addEventListener("click", handleDocumentClick);

  return {
    root,
    button,
    get value() { return value; },
    get disabled() { return button.disabled; },
    set disabled(next: boolean) { button.disabled = next; },
    setOptions(nextOptions: CompactSelectOption[], nextValue?: string) {
      options = nextOptions;
      value = nextValue && options.some((option) => option.value === nextValue) ? nextValue : (options.find((option) => !option.disabled)?.value ?? options[0]?.value ?? "");
      button.disabled = options.length === 0 || options.every((option) => option.disabled);
      button.textContent = selectedLabel();
      renderOptions();
      close();
    },
    addEventListener(_type: "change", listener: () => void) {
      listeners.push(listener);
    },
    destroy() {
      document.removeEventListener("click", handleDocumentClick);
    },
  };
}

export function getPrimitiveFromPresetId(presetId: string): string {
  const parts = presetId.split(".");
  return presetId.startsWith("smart.") ? (parts[1] || presetId) : (parts[0] || presetId);
}


export function createDevSummonerSpawnPayload(input: {
  typeId: string;
  spawnX: number;
  spawnY: number;
  behaviorPresetId?: string;
  fsmPresetId?: string;
  devManualSpawnId: number;
}) {
  return {
    typeId: input.typeId,
    spawn: { x: input.spawnX, y: input.spawnY },
    ...(input.behaviorPresetId ? { behaviorPresetId: input.behaviorPresetId } : {}),
    ...(input.fsmPresetId ? { fsmPresetId: input.fsmPresetId } : {}),
    devManualSpawnId: input.devManualSpawnId,
  };
}

export function normalizeGroupCount(value: unknown): number {
  const raw = Number(value);
  const n = Number.isFinite(raw) ? Math.floor(raw) : 5;
  return Math.min(10, Math.max(2, n));
}

export function stepGroupCount(value: unknown, delta: -1 | 1): number {
  return normalizeGroupCount(normalizeGroupCount(value) + delta);
}

type GroupParamKey = "spacing" | "depth" | "radius" | "angle" | "startAngle" | "response" | "maxCatchupSpeed";

export function normalizeGroupStepperValue(key: GroupParamKey, value: unknown, cohesionId: CohesionId = "rigid"): number {
  const params = normalizeEnemyGroupParams({
    formation: {
      spacing: key === "spacing" ? Number(value) : undefined,
      depth: key === "depth" ? Number(value) : undefined,
      radius: key === "radius" ? Number(value) : undefined,
      angle: key === "angle" ? Number(value) : undefined,
      startAngle: key === "startAngle" ? Number(value) : undefined,
    },
    cohesion: {
      response: key === "response" ? Number(value) : undefined,
      maxCatchupSpeed: key === "maxCatchupSpeed" ? Number(value) : undefined,
    },
  }, cohesionId);
  if (key === "spacing") return params.formation.spacing;
  if (key === "depth") return params.formation.depth;
  if (key === "radius") return params.formation.radius;
  if (key === "angle") return params.formation.angle;
  if (key === "startAngle") return params.formation.startAngle;
  if (key === "response") return params.cohesion.response;
  return params.cohesion.maxCatchupSpeed;
}

export function stepGroupParamValue(key: GroupParamKey, value: unknown, delta: -1 | 1, cohesionId: CohesionId = "rigid"): number {
  const limits = key === "spacing" ? ENEMY_GROUP_PARAM_LIMITS.formation.spacing
    : key === "depth" ? ENEMY_GROUP_PARAM_LIMITS.formation.depth
      : key === "radius" ? ENEMY_GROUP_PARAM_LIMITS.formation.radius
        : key === "angle" ? ENEMY_GROUP_PARAM_LIMITS.formation.angle
          : key === "startAngle" ? { min: 0, max: 359, default: 0, step: 15 }
          : key === "response" ? ENEMY_GROUP_PARAM_LIMITS.cohesion.response
            : ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed;
  if (key === "startAngle") return normalizeGroupFormationStartAngle(normalizeGroupStepperValue(key, value, cohesionId) + delta * limits.step);
  return normalizeGroupStepperValue(key, normalizeGroupStepperValue(key, value, cohesionId) + delta * limits.step, cohesionId);
}

function isValidEnemyTypeId(typeId: string): boolean {
  return !!ENEMY_DEFS[typeId];
}

function isValidFormationId(id: string): id is FormationId {
  return (ENEMY_GROUP_FORMATION_IDS as readonly string[]).includes(id);
}

function isValidCohesionId(id: string): id is CohesionId {
  return (ENEMY_GROUP_COHESION_IDS as readonly string[]).includes(id);
}

function isValidMovementPresetId(id: string): boolean {
  return !!EnemyBehaviorPresets[id];
}

export function createDevSummonerGroupSpawnPayload(input: {
  enemyTypeId: string;
  count: unknown;
  anchorX: number;
  anchorY: number;
  formationId: string;
  movementPresetId: string;
  cohesionId: string;
  fsmPresetId?: string;
  params?: CMEventMap[typeof EventType.SPAWN_ENEMY_GROUP]["params"];
}): CMEventMap[typeof EventType.SPAWN_ENEMY_GROUP] | null {
  if (!isValidEnemyTypeId(input.enemyTypeId)) return null;
  if (!isValidFormationId(input.formationId)) return null;
  if (!isValidCohesionId(input.cohesionId)) return null;
  if (!isValidMovementPresetId(input.movementPresetId)) return null;
  if (!Number.isFinite(input.anchorX) || !Number.isFinite(input.anchorY)) return null;
  const params = normalizeEnemyGroupParams(input.params, input.cohesionId);
  return {
    enemyTypeId: input.enemyTypeId,
    count: normalizeGroupCount(input.count),
    anchor: { x: input.anchorX, y: input.anchorY },
    formationId: input.formationId,
    movementPresetId: input.movementPresetId,
    cohesionId: input.cohesionId,
    ...(input.fsmPresetId ? { fsmPresetId: input.fsmPresetId } : {}),
    params,
  };
}

export function buildMovementGroups(): MovementGroups {
  const groups: MovementGroups = { dumb: {}, smart: {} };

  for (const presetId of Object.keys(EnemyBehaviorPresets)) {
    const movementClass: MovementClassId = presetId.startsWith("smart.") ? "smart" : "dumb";
    const primitive = getPrimitiveFromPresetId(presetId);
    groups[movementClass][primitive] ??= [];
    groups[movementClass][primitive].push(presetId);
  }

  for (const classGroups of Object.values(groups)) {
    for (const presets of Object.values(classGroups)) presets.sort();
  }

  return groups;
}

export class DevSummoner {
  private panel: HTMLElement | null = null;
  private latestManualSpawnId = 0;
  private refreshTimer: number | null = null;
  private retainedFsmInspection: RetainedFsmInspection | null = null;
  private readonly cleanupHandlers: Array<() => void> = [];

  constructor(
    private bus: EventBus<CMEventMap>,
    private world: WorldState,
    private logicW: number,
    private logicH: number,
  ) {}

  init(): void {
    if (this.panel) return;
    const panel = document.createElement("div");
    panel.id = DEV_SUMMONER_PANEL_ID;
    panel.style.cssText = createDevSummonerPanelStyle();

    const title = document.createElement("pre");
    title.textContent = "Enemy Lab\n────────────";
    title.style.cssText = "font-weight:bold;letter-spacing:1px;margin:0 0 2px 0;";
    panel.appendChild(title);

    let enemyLabMode: EnemyLabMode = "simple";

    const labModeRow = document.createElement("div");
    labModeRow.id = "ds-enemy-lab-mode-row";
    labModeRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;";
    panel.appendChild(labModeRow);
    const styleLabModeButton = (button: HTMLButtonElement, active: boolean) => {
      button.style.cssText = [
        "font:12px monospace",
        "min-height:26px",
        "padding:2px 4px",
        "border:1px solid rgba(255,255,255,0.28)",
        "background:" + (active ? "#365173" : "#111"),
        "color:" + (active ? "#fff" : "#bbb"),
        "cursor:pointer",
        "box-sizing:border-box",
        "font-weight:" + (active ? "800" : "400"),
      ].join(";");
    };
    const simpleModeButton = document.createElement("button");
    const smartModeButton = document.createElement("button");
    const fsmModeButton = document.createElement("button");
    for (const [button, text] of [[simpleModeButton, "SIMPLE"], [smartModeButton, "SMART"], [fsmModeButton, "FSM"]] as const) {
      button.type = "button";
      button.textContent = text;
      labModeRow.appendChild(button);
    }

    const simpleLabSection = document.createElement("div");
    simpleLabSection.id = "ds-simple-lab-section";
    simpleLabSection.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    const smartLabSection = document.createElement("div");
    smartLabSection.id = "ds-smart-lab-section";
    smartLabSection.style.cssText = "display:none;flex-direction:column;gap:6px;";
    const fsmLabSection = document.createElement("div");
    fsmLabSection.id = "ds-fsm-lab-section";
    fsmLabSection.style.cssText = "display:none;flex-direction:column;gap:6px;";
    panel.appendChild(simpleLabSection);
    panel.appendChild(smartLabSection);
    panel.appendChild(fsmLabSection);

    const simpleLabTitle = document.createElement("div");
    simpleLabTitle.textContent = "SIMPLE LAB";
    simpleLabTitle.style.cssText = "font-weight:800;opacity:0.95;";
    simpleLabSection.appendChild(simpleLabTitle);
    const smartLabTitle = document.createElement("div");
    smartLabTitle.textContent = "SMART LAB";
    smartLabTitle.style.cssText = "font-weight:800;opacity:0.95;";
    smartLabSection.appendChild(smartLabTitle);
    const fsmLabTitle = document.createElement("div");
    fsmLabTitle.textContent = "FSM LAB";
    fsmLabTitle.style.cssText = "font-weight:800;opacity:0.95;";
    fsmLabSection.appendChild(fsmLabTitle);

    const spawnSection = document.createElement("div");
    spawnSection.id = "ds-shared-spawn-section";
    spawnSection.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    simpleLabSection.appendChild(spawnSection);

    const spawnTitle = document.createElement("div");
    spawnTitle.textContent = "Spawn";
    spawnTitle.style.cssText = "font-weight:800;opacity:0.95;";
    spawnSection.appendChild(spawnTitle);

    const modeRow = document.createElement("div");
    modeRow.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:center;";
    const modeLabel = document.createElement("span");
    modeLabel.textContent = "Spawn Mode";
    applyLabelTextStyle(modeLabel);
    const modeSegment = document.createElement("div");
    modeSegment.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:0;min-width:0;";
    const enemyModeButton = document.createElement("button");
    const groupModeButton = document.createElement("button");
    modeSegment.appendChild(enemyModeButton);
    modeSegment.appendChild(groupModeButton);
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSegment);
    spawnSection.appendChild(modeRow);

    let spawnMode: SpawnMode = "enemy";
    const styleSegmentButton = (button: HTMLButtonElement, active: boolean, disabled = false) => {
      button.style.cssText = [
        "font:12px monospace",
        "min-height:26px",
        "padding:2px 6px",
        "border:1px solid rgba(255,255,255,0.24)",
        "background:" + (active ? "#26384f" : "#111"),
        "color:" + (disabled ? "#777" : active ? "#fff" : "#bbb"),
        "cursor:" + (disabled ? "not-allowed" : "pointer"),
        "box-sizing:border-box",
        "min-width:0",
      ].join(";");
    };

    const enemyControls = document.createElement("div");
    enemyControls.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    const groupControls = document.createElement("div");
    groupControls.style.cssText = "display:none;flex-direction:column;gap:6px;";
    spawnSection.appendChild(enemyControls);
    spawnSection.appendChild(groupControls);

    const enemySelect = document.createElement("select");
    enemySelect.id = "ds-enemy";
    for (const id of Object.keys(ENEMY_DEFS)) {
      const opt = document.createElement("option");
      opt.value = id; opt.textContent = id;
      enemySelect.appendChild(opt);
    }
    applyNativeSelectStyle(enemySelect);
    const enemyTypeRow = document.createElement("label");
    enemyTypeRow.style.cssText = "display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px;align-items:center;min-width:0;";
    const enemyTypeLabel = document.createElement("span");
    enemyTypeLabel.textContent = "Type";
    applyLabelTextStyle(enemyTypeLabel);
    enemyTypeRow.appendChild(enemyTypeLabel);
    enemyTypeRow.appendChild(enemySelect);
    enemyControls.appendChild(enemyTypeRow);
    enemyControls.appendChild(createSectionGap());

    const groupTypeRow = document.createElement("div");
    groupTypeRow.style.cssText = "display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px;align-items:center;min-width:0;";
    const groupTypeLabel = document.createElement("span");
    groupTypeLabel.textContent = "Type";
    applyLabelTextStyle(groupTypeLabel);
    const groupEnemySelect = document.createElement("select");
    groupEnemySelect.id = "ds-group-enemy";
    applyNativeSelectStyle(groupEnemySelect);
    for (const id of Object.keys(ENEMY_DEFS)) appendOption(groupEnemySelect, id);
    groupTypeRow.appendChild(groupTypeLabel);
    groupTypeRow.appendChild(groupEnemySelect);

    let groupCount = 5;
    const countSegment = document.createElement("div");
    countSegment.id = "ds-group-count";
    countSegment.setAttribute("role", "spinbutton");
    countSegment.setAttribute("aria-label", "Group count");
    countSegment.style.cssText = "display:grid;grid-template-columns:24px 22px 24px;gap:1px;align-items:center;align-self:end;min-width:72px;";
    const countDecButton = document.createElement("button");
    const countValue = document.createElement("span");
    const countIncButton = document.createElement("button");
    countDecButton.type = "button";
    countIncButton.type = "button";
    countDecButton.textContent = "−";
    countIncButton.textContent = "+";
    countDecButton.setAttribute("aria-label", "Decrease group count");
    countIncButton.setAttribute("aria-label", "Increase group count");
    countValue.textContent = String(groupCount);
    countValue.style.cssText = "display:flex;align-items:center;justify-content:center;color:#eee;min-height:26px;box-sizing:border-box;font-weight:800;";
    const styleCountButton = (button: HTMLButtonElement) => {
      applyInlineStepperButtonStyle(button);
    };
    const refreshGroupCount = () => {
      groupCount = normalizeGroupCount(groupCount);
      countValue.textContent = String(groupCount);
      countSegment.setAttribute("aria-valuemin", "2");
      countSegment.setAttribute("aria-valuemax", "10");
      countSegment.setAttribute("aria-valuenow", String(groupCount));
    };
    countDecButton.addEventListener("click", () => { groupCount = stepGroupCount(groupCount, -1); refreshGroupCount(); });
    countIncButton.addEventListener("click", () => { groupCount = stepGroupCount(groupCount, 1); refreshGroupCount(); });
    styleCountButton(countDecButton);
    styleCountButton(countIncButton);
    countSegment.appendChild(countDecButton);
    countSegment.appendChild(countValue);
    countSegment.appendChild(countIncButton);
    refreshGroupCount();
    groupTypeRow.appendChild(countSegment);
    groupControls.appendChild(groupTypeRow);
    groupControls.appendChild(createSectionGap());

    const groupOptionRow = document.createElement("div");
    groupOptionRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:end;";
    const makeCompactChoice = <T extends string>(label: string, options: ReadonlyArray<{ value: T; label: string }>, defaultValue: T) => {
      const wrap = createSelectLabel(label);
      const select = createCompactSelect(`ds-group-${label.toLowerCase()}`);
      select.setOptions([...options], defaultValue);
      this.cleanupHandlers.push(() => select.destroy());
      wrap.appendChild(select.root);
      return { wrap, get value() { return select.value as T; }, addEventListener(listener: () => void) { select.addEventListener("change", listener); } };
    };
    const makeSegmentedChoice = <T extends string>(label: string, ariaLabel: string, options: ReadonlyArray<{ value: T; label: string }>, defaultValue: T) => {
      let value = defaultValue;
      const listeners: Array<() => void> = [];
      const wrap = createSelectLabel(label);
      const segment = document.createElement("div");
      segment.setAttribute("role", "radiogroup");
      segment.setAttribute("aria-label", ariaLabel);
      segment.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:0;min-width:0;";
      const buttons = options.map((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.label;
        button.setAttribute("role", "radio");
        button.addEventListener("click", () => {
          value = option.value;
          refresh();
          for (const listener of listeners) listener();
        });
        segment.appendChild(button);
        if (index > 0) button.style.borderLeft = "0";
        button.style.borderRadius = index === 0 ? "2px 0 0 2px" : index === options.length - 1 ? "0 2px 2px 0" : "0";
        return { button, value: option.value };
      });
      const refresh = () => {
        buttons.forEach((option, index) => {
          const active = value === option.value;
          option.button.setAttribute("aria-checked", String(active));
          option.button.setAttribute("aria-pressed", String(active));
          styleSegmentButton(option.button, active);
          if (index > 0) option.button.style.borderLeft = "0";
          option.button.style.borderRadius = index === 0 ? "2px 0 0 2px" : index === buttons.length - 1 ? "0 2px 2px 0" : "0";
        });
      };
      refresh();
      wrap.appendChild(segment);
      return { wrap, get value() { return value; }, addEventListener(listener: () => void) { listeners.push(listener); } };
    };
    const formationChoice = makeCompactChoice<FormationId>("Form", groupFormationSelectOptions(), "line.horizontal");
    const wedgeFacingChoice = makeSegmentedChoice<"left" | "right">("Facing", "Wedge facing", [{ value: "left", label: "Left" }, { value: "right", label: "Right" }], "left");
    const arcFacingChoice = makeSegmentedChoice<"left" | "right">("Arc", "Arc direction", [{ value: "left", label: "Forward" }, { value: "right", label: "Backward" }], "left");
    const cohesionChoice = makeSegmentedChoice<CohesionId>("Coh", "Group cohesion", ENEMY_GROUP_COHESION_IDS.map((id) => ({ value: id, label: id === "rigid" ? "Rigid" : "Elastic" })), "rigid");
    const formationWrap = formationChoice.wrap;
    const cohesionWrap = cohesionChoice.wrap;
    groupOptionRow.appendChild(formationWrap);
    groupOptionRow.appendChild(cohesionWrap);
    groupControls.appendChild(groupOptionRow);

    const makeParamStepper = (label: string, key: GroupParamKey, defaultValue: number) => {
      let value = defaultValue;
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:grid;grid-template-columns:max-content minmax(0,1fr);gap:1px;align-items:center;min-width:0;";
      const labelNode = document.createElement("span");
      labelNode.textContent = label;
      applyLabelTextStyle(labelNode, "secondary");
      const segment = document.createElement("div");
      segment.setAttribute("role", "spinbutton");
      segment.setAttribute("aria-label", `Group ${label}`);
      segment.style.cssText = "display:grid;grid-template-columns:22px minmax(20px,1fr) 22px;gap:0;align-items:center;min-width:0;";
      const decButton = document.createElement("button");
      const valueLabel = document.createElement("span");
      const incButton = document.createElement("button");
      decButton.type = "button";
      incButton.type = "button";
      decButton.textContent = "−";
      incButton.textContent = "+";
      decButton.setAttribute("aria-label", `Decrease ${label}`);
      incButton.setAttribute("aria-label", `Increase ${label}`);
      valueLabel.style.cssText = "display:flex;align-items:center;justify-content:center;color:#eee;min-height:26px;box-sizing:border-box;font-weight:800;";
      styleCountButton(decButton);
      styleCountButton(incButton);
      decButton.style.minWidth = "22px";
      incButton.style.minWidth = "22px";
      const refresh = () => {
        value = normalizeGroupStepperValue(key, value, cohesionChoice.value);
        const limits = key === "spacing" ? ENEMY_GROUP_PARAM_LIMITS.formation.spacing
          : key === "depth" ? ENEMY_GROUP_PARAM_LIMITS.formation.depth
            : key === "radius" ? ENEMY_GROUP_PARAM_LIMITS.formation.radius
              : key === "angle" ? ENEMY_GROUP_PARAM_LIMITS.formation.angle
                : key === "response" ? ENEMY_GROUP_PARAM_LIMITS.cohesion.response
                  : ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed;
        valueLabel.textContent = String(value);
        segment.setAttribute("aria-valuemin", String(limits.min));
        segment.setAttribute("aria-valuemax", String(limits.max));
        segment.setAttribute("aria-valuenow", String(value));
      };
      decButton.addEventListener("click", () => { value = stepGroupParamValue(key, value, -1, cohesionChoice.value); refresh(); });
      incButton.addEventListener("click", () => { value = stepGroupParamValue(key, value, 1, cohesionChoice.value); refresh(); });
      segment.appendChild(decButton);
      segment.appendChild(valueLabel);
      segment.appendChild(incButton);
      wrap.appendChild(labelNode);
      wrap.appendChild(segment);
      refresh();
      return { wrap, refresh, get value() { return value; } };
    };

    const spacingStepper = makeParamStepper("Space", "spacing", ENEMY_GROUP_PARAM_LIMITS.formation.spacing.default);
    const depthStepper = makeParamStepper("Depth", "depth", ENEMY_GROUP_PARAM_LIMITS.formation.depth.default);
    const radiusStepper = makeParamStepper("Radius", "radius", ENEMY_GROUP_PARAM_LIMITS.formation.radius.default);
    const angleStepper = makeParamStepper("Angle", "angle", ENEMY_GROUP_PARAM_LIMITS.formation.angle.default);
    const startAngleStepper = makeParamStepper("Start", "startAngle", 0);
    const responseStepper = makeParamStepper("Tight", "response", ENEMY_GROUP_PARAM_LIMITS.cohesion.response.default);
    const catchStepper = makeParamStepper("Catch", "maxCatchupSpeed", ENEMY_GROUP_PARAM_LIMITS.cohesion.maxCatchupSpeed.rigidDefault);
    const paramRow1 = document.createElement("div");
    paramRow1.style.cssText = "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;align-items:center;min-width:0;";
    paramRow1.appendChild(wedgeFacingChoice.wrap);
    paramRow1.appendChild(arcFacingChoice.wrap);
    paramRow1.appendChild(spacingStepper.wrap);
    paramRow1.appendChild(depthStepper.wrap);
    paramRow1.appendChild(radiusStepper.wrap);
    paramRow1.appendChild(angleStepper.wrap);
    paramRow1.appendChild(startAngleStepper.wrap);
    groupControls.appendChild(paramRow1);
    const paramRow2 = document.createElement("div");
    paramRow2.style.cssText = "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;align-items:center;min-width:0;";
    paramRow2.appendChild(responseStepper.wrap);
    paramRow2.appendChild(catchStepper.wrap);
    groupControls.appendChild(paramRow2);
    groupControls.appendChild(createSectionGap());
    const setStepperVisible = (wrap: HTMLElement, visible: boolean) => {
      wrap.style.display = visible ? "grid" : "none";
      wrap.setAttribute("aria-hidden", String(!visible));
      for (const el of Array.from(wrap.querySelectorAll("button,input,select"))) {
        (el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).tabIndex = visible ? 0 : -1;
      }
    };
    const refreshGroupParamVisibility = () => {
      const formation = formationChoice.value;
      setStepperVisible(wedgeFacingChoice.wrap, formation === "wedge");
      setStepperVisible(arcFacingChoice.wrap, formation === "arc.forward");
      setStepperVisible(spacingStepper.wrap, formation === "line.horizontal" || formation === "wedge" || formation === "column.vertical");
      setStepperVisible(depthStepper.wrap, formation === "wedge");
      setStepperVisible(radiusStepper.wrap, formation === "arc.forward" || formation === "ring");
      setStepperVisible(angleStepper.wrap, formation === "arc.forward");
      setStepperVisible(startAngleStepper.wrap, formation === "ring");
      spacingStepper.refresh();
      depthStepper.refresh();
      radiusStepper.refresh();
      angleStepper.refresh();
      startAngleStepper.refresh();
      responseStepper.refresh();
      catchStepper.refresh();
    };
    formationChoice.addEventListener(refreshGroupParamVisibility);
    cohesionChoice.addEventListener(refreshGroupParamVisibility);
    refreshGroupParamVisibility();

    const movementGroups = buildMovementGroups();
    const makeMovementControls = (prefix: string, labelText: string, primitiveLabel = "Primitive") => {
      const primitiveSelect = createCompactSelect(`${prefix}-movement-primitive`);
      const presetSelect = createCompactSelect(`${prefix}-movement-preset`);
      this.cleanupHandlers.push(() => primitiveSelect.destroy(), () => presetSelect.destroy());
      const movementClassRow = document.createElement("div");
      movementClassRow.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:center;";
      const movementClassLabel = document.createElement("span");
      movementClassLabel.textContent = labelText;
      applyLabelTextStyle(movementClassLabel);
      const movementClassSegment = document.createElement("div");
      movementClassSegment.id = `${prefix}-movement-class`;
      movementClassSegment.setAttribute("role", "radiogroup");
      movementClassSegment.setAttribute("aria-label", labelText);
      movementClassSegment.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:0;min-width:0;";
      const dumbButton = document.createElement("button");
      const smartButton = document.createElement("button");
      let movementClass: MovementClassId = "dumb";
      const rememberedMovement = new Map<MovementClassId, { primitive: string; preset: string }>();
      const rememberMovementSelection = () => {
        rememberedMovement.set(movementClass, { primitive: primitiveSelect.value, preset: presetSelect.value });
      };
      const primitiveWrap = createSelectLabel(primitiveLabel, "secondary");
      const presetWrap = createSelectLabel("Preset", "secondary");
      primitiveWrap.appendChild(primitiveSelect.root);
      presetWrap.appendChild(presetSelect.root);
      const movementPresetRow = document.createElement("div");
      movementPresetRow.style.cssText = "display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:4px;align-items:end;";
      movementPresetRow.appendChild(primitiveWrap);
      movementPresetRow.appendChild(presetWrap);
      movementClassRow.appendChild(movementClassLabel);
      movementClassRow.appendChild(movementClassSegment);
      const hasDumbPresets = Object.keys(movementGroups.dumb).length > 0;
      const hasSmartPresets = Object.keys(movementGroups.smart).length > 0;
      const refreshMovementClassButtons = () => {
        for (const [button, value, enabled] of [[dumbButton, "dumb", hasDumbPresets], [smartButton, "smart", hasSmartPresets]] as const) {
          const active = movementClass === value;
          button.type = "button";
          button.textContent = value === "dumb" ? "Dumb" : "Smart";
          button.disabled = !enabled;
          button.setAttribute("role", "radio");
          button.setAttribute("aria-checked", String(active));
          styleSegmentButton(button, active, !enabled);
        }
        dumbButton.style.borderRadius = "2px 0 0 2px";
        smartButton.style.borderLeft = "0";
        smartButton.style.borderRadius = "0 2px 2px 0";
      };
      movementClassSegment.appendChild(dumbButton);
      movementClassSegment.appendChild(smartButton);
      const repopulatePresetSelect = () => {
        const primitive = primitiveSelect.value;
        const presets = movementGroups[movementClass]?.[primitive] ?? [];
        if (presets.length === 0) {
          presetSelect.setOptions([{ value: "", label: "(none)", disabled: true }]);
          return;
        }
        const rememberedPreset = rememberedMovement.get(movementClass)?.preset;
        const preferredPreset = rememberedPreset && presets.includes(rememberedPreset) ? rememberedPreset : prefix === "ds-group" && presets.includes("straight.basic") ? "straight.basic" : presetSelect.value;
        presetSelect.setOptions(presets.map((presetId) => ({ value: presetId, label: presetId })), preferredPreset);
        rememberMovementSelection();
      };
      const repopulatePrimitiveSelect = () => {
        const primitives = sortPrimitiveIds(Object.keys(movementGroups[movementClass] ?? {}));
        if (primitives.length === 0) {
          primitiveSelect.setOptions([{ value: "", label: "(none)", disabled: true }]);
          repopulatePresetSelect();
          return;
        }
        const rememberedPrimitive = rememberedMovement.get(movementClass)?.primitive;
        const preferredPrimitive = rememberedPrimitive && primitives.includes(rememberedPrimitive) ? rememberedPrimitive : prefix === "ds-group" && primitives.includes("straight") ? "straight" : primitiveSelect.value;
        primitiveSelect.setOptions(primitives.map((primitive) => ({ value: primitive, label: formatPrimitiveLabel(primitive) })), preferredPrimitive);
        repopulatePresetSelect();
      };
      const setMovementClass = (next: MovementClassId) => {
        if (next === "dumb" && !hasDumbPresets) return;
        if (next === "smart" && !hasSmartPresets) return;
        rememberMovementSelection();
        movementClass = next;
        refreshMovementClassButtons();
        repopulatePrimitiveSelect();
      };
      dumbButton.addEventListener("click", () => setMovementClass("dumb"));
      smartButton.addEventListener("click", () => setMovementClass("smart"));
      primitiveSelect.addEventListener("change", () => { repopulatePresetSelect(); rememberMovementSelection(); });
      presetSelect.addEventListener("change", rememberMovementSelection);
      refreshMovementClassButtons();
      repopulatePrimitiveSelect();
      return { movementClassRow, movementPresetRow, presetSelect, setMovementClass };
    };

    const enemyMovement = makeMovementControls("ds", "Movement");
    enemyControls.appendChild(enemyMovement.movementClassRow);
    enemyControls.appendChild(enemyMovement.movementPresetRow);
    const fsmSpawnWrap = createSelectLabel("FSM", "secondary");
    const fsmSpawnSelect = createCompactSelect("ds-fsm-preset");
    this.cleanupHandlers.push(() => fsmSpawnSelect.destroy());
    const refreshFsmSpawnSelect = (preferred?: string) => {
      fsmSpawnSelect.setOptions([{ value: "", label: "(movement preset)" }, ...CONTENT.userFsmPresets.registry().list().map((preset) => ({ value: preset.id, label: `${CONTENT.userFsmPresets.registry().sourceOf(preset.id) === "user" ? "USER" : "BUILT-IN"} ${preset.id}` }))], preferred ?? fsmSpawnSelect.value);
    };
    refreshFsmSpawnSelect();
    fsmSpawnWrap.appendChild(fsmSpawnSelect.root);
    spawnSection.appendChild(fsmSpawnWrap);
    spawnSection.appendChild(createSectionGap());
    const groupMovement = makeMovementControls("ds-group", "Move", "Prim");
    groupControls.appendChild(groupMovement.movementClassRow);
    groupControls.appendChild(groupMovement.movementPresetRow);
    groupControls.appendChild(createSectionGap());

    const createSpawnYControl = (idPrefix: string) => {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:grid;grid-template-columns:auto minmax(0,1fr) 52px;gap:6px;align-items:center;min-width:0;";
      const label = document.createElement("span");
      label.textContent = "Y Spawn";
      applyLabelTextStyle(label);
      const slider = document.createElement("input");
      slider.id = `${idPrefix}-screen-y`;
      slider.type = "range";
      slider.min = "0";
      slider.max = String(Math.max(0, this.logicH));
      slider.step = "1";
      slider.value = "260";
      slider.style.cssText = "width:100%;min-width:0;box-sizing:border-box;accent-color:#6f8fc0;";
      const valueInput = document.createElement("input");
      valueInput.id = `${idPrefix}-screen-y-input`;
      valueInput.type = "number";
      valueInput.min = slider.min;
      valueInput.max = slider.max;
      valueInput.step = slider.step;
      valueInput.value = slider.value;
      applyValueInputStyle(valueInput);
      const setValue = (value: unknown) => {
        const maxY = Math.max(0, this.logicH);
        const raw = Number(value);
        const y = Number.isFinite(raw) ? Math.min(maxY, Math.max(0, raw)) : 260;
        slider.value = String(y);
        valueInput.value = String(y);
      };
      slider.addEventListener("input", () => setValue(slider.value));
      valueInput.addEventListener("input", () => setValue(valueInput.value));
      wrap.appendChild(label);
      wrap.appendChild(slider);
      wrap.appendChild(valueInput);
      setValue(260);
      return { wrap, slider, valueInput, setValue, get value() { return Number(slider.value); } };
    };

    const screenYControl = createSpawnYControl("ds");
    enemyControls.appendChild(screenYControl.wrap);

    const groupYControl = createSpawnYControl("ds-group");
    groupControls.appendChild(groupYControl.wrap);

    const setLabSectionFocusable = (section: HTMLElement, visible: boolean) => {
      for (const el of Array.from(section.querySelectorAll("button,input,select,textarea"))) {
        (el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).tabIndex = visible ? 0 : -1;
      }
    };

    const btn = document.createElement("button");
    btn.textContent = "RELEASE";
    btn.style.cssText = "cursor:pointer;margin-top:2px;font:12px monospace;font-weight:800;min-height:28px;background:#26384f;color:#fff;border:1px solid rgba(255,255,255,0.28);border-radius:2px;";
    const refreshModeButtons = () => {
      enemyModeButton.type = "button";
      groupModeButton.type = "button";
      enemyModeButton.textContent = "Single";
      groupModeButton.textContent = "Group";
      enemyModeButton.setAttribute("aria-pressed", String(spawnMode === "enemy"));
      groupModeButton.setAttribute("aria-pressed", String(spawnMode === "group"));
      styleSegmentButton(enemyModeButton, spawnMode === "enemy");
      styleSegmentButton(groupModeButton, spawnMode === "group");
      enemyModeButton.style.borderRadius = "2px 0 0 2px";
      groupModeButton.style.borderLeft = "0";
      groupModeButton.style.borderRadius = "0 2px 2px 0";
      enemyControls.style.display = spawnMode === "enemy" ? "flex" : "none";
      groupControls.style.display = spawnMode === "group" ? "flex" : "none";
      btn.textContent = spawnMode === "enemy" ? "RELEASE" : "Spawn Group";
    };
    enemyModeButton.addEventListener("click", () => { spawnMode = "enemy"; refreshModeButtons(); });
    groupModeButton.addEventListener("click", () => { spawnMode = "group"; refreshModeButtons(); });
    refreshModeButtons();
    btn.addEventListener("click", () => {
      this.latestManualSpawnId += 1;
      if (spawnMode === "group") {
        const anchorY = groupYControl.value;
        const payload = createDevSummonerGroupSpawnPayload({
          enemyTypeId: groupEnemySelect.value,
          count: groupCount,
          anchorX: this.logicW - 40,
          anchorY,
          formationId: formationChoice.value,
          movementPresetId: groupMovement.presetSelect.value,
          cohesionId: cohesionChoice.value,
          fsmPresetId: enemyLabMode === "fsm" ? fsmSpawnSelect.value || undefined : undefined,
          params: {
            formation: {
              spacing: spacingStepper.value,
              depth: depthStepper.value,
              radius: radiusStepper.value,
              angle: angleStepper.value,
              facing: formationChoice.value === "arc.forward" ? arcFacingChoice.value : formationChoice.value === "wedge" ? wedgeFacingChoice.value : undefined,
              startAngle: formationChoice.value === "ring" ? startAngleStepper.value : undefined,
            },
            cohesion: {
              response: responseStepper.value,
              maxCatchupSpeed: catchStepper.value,
            },
          },
        });
        if (!payload) {
          console.warn("[DevSummoner] invalid group spawn payload");
          return;
        }
        groupCount = payload.count;
        refreshGroupCount();
        groupYControl.setValue(payload.anchor.y);
        this.bus.emitNext(EventType.SPAWN_ENEMY_GROUP, payload);
        return;
      }
      this.bus.emitNext(EventType.SPAWN_ENEMY, createDevSummonerSpawnPayload({
        typeId: enemySelect.value,
        spawnX: this.logicW - 40,
        spawnY: screenYControl.value,
        behaviorPresetId: enemyLabMode === "fsm" ? undefined : enemyMovement.presetSelect.value,
        fsmPresetId: enemyLabMode === "fsm" ? fsmSpawnSelect.value || undefined : undefined,
        devManualSpawnId: this.latestManualSpawnId,
      }) as any);
    });
    spawnSection.appendChild(btn);

    const presetModel = new FsmPresetEditorModel(CONTENT.userFsmPresets);
    let authoringModel = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, presetModel.selectedId);
    const presetPanel = document.createElement("div");
    presetPanel.id = FSM_PRESET_EDITOR_ID;
    presetPanel.style.cssText = "display:flex;flex-direction:column;gap:4px;padding:4px;background:rgba(255,255,255,0.05);font:12px monospace;";
    const presetList = document.createElement("select");
    applyNativeSelectStyle(presetList);
    const idInput = document.createElement("input"); idInput.placeholder = "preset id"; applyControlBaseStyle(idInput); idInput.style.width = "100%";
    const labelInput = document.createElement("input"); labelInput.placeholder = "label"; applyControlBaseStyle(labelInput); labelInput.style.width = "100%";
    const details = document.createElement("div"); details.style.cssText = "color:#ccc;line-height:1.35;white-space:pre-wrap;";
    const diagBox = document.createElement("div"); diagBox.style.cssText = "color:#ffd27a;line-height:1.35;white-space:pre-wrap;";
    const importText = document.createElement("textarea"); importText.placeholder = "Paste FSM preset JSON"; importText.rows = 3; applyControlBaseStyle(importText); importText.style.width = "100%";
    const exportText = document.createElement("textarea"); exportText.placeholder = "Export output / raw storage"; exportText.rows = 3; exportText.readOnly = true; applyControlBaseStyle(exportText); exportText.style.width = "100%";
    const collisionSelect = document.createElement("select"); applyNativeSelectStyle(collisionSelect); for (const [value, label] of [["reject", "Reject"], ["replace-user", "Replace user"], ["rename", "Rename"]] as const) appendOption(collisionSelect, value, label);
    const buttons = document.createElement("div"); buttons.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:3px;";
    const makeBtn = (text: string) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.style.cssText = "font:12px monospace;min-height:24px;background:#111;color:#eee;border:1px solid rgba(255,255,255,0.24);"; buttons.appendChild(b); return b; };
    const newBtn = makeBtn("New"); const dupBtn = makeBtn("Duplicate"); const saveBtn = makeBtn("Save"); const cancelBtn = makeBtn("Cancel"); const delBtn = makeBtn("Delete"); const importBtn = makeBtn("Import"); const exportBtn = makeBtn("Export selected"); const exportAllBtn = makeBtn("Export users"); const rawBtn = makeBtn("Copy raw"); const clearBtn = makeBtn("Clear users");
    presetPanel.appendChild(Object.assign(document.createElement("div"), { textContent: "FSM Presets" }));
    presetPanel.appendChild(presetList); presetPanel.appendChild(idInput); presetPanel.appendChild(labelInput); presetPanel.appendChild(details); presetPanel.appendChild(collisionSelect); presetPanel.appendChild(importText); presetPanel.appendChild(buttons); presetPanel.appendChild(exportText); presetPanel.appendChild(diagBox);
    const authoringSections = document.createElement("div");
    authoringSections.id = "ds-fsm-authoring-sections";
    authoringSections.style.cssText = "display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(255,255,255,0.18);padding-top:4px;";
    const addAuthoringSection = (title: string): HTMLDivElement => { const section = document.createElement("div"); section.setAttribute("data-fsm-authoring-section", title); section.style.cssText = "display:flex;flex-direction:column;gap:3px;"; const h = document.createElement("div"); h.textContent = title; h.style.cssText = "font-weight:bold;color:#fff;"; section.appendChild(h); authoringSections.appendChild(section); return section; };
    const presetDetailsSection = addAuthoringSection("Preset Details");
    const initialSelect = document.createElement("select"); applyNativeSelectStyle(initialSelect); presetDetailsSection.appendChild(initialSelect);
    const statesSection = addAuthoringSection("States");
    const stateSelect = document.createElement("select"); applyNativeSelectStyle(stateSelect); statesSection.appendChild(stateSelect);
    const stateIdInput = document.createElement("input"); stateIdInput.placeholder = "state id"; applyControlBaseStyle(stateIdInput); statesSection.appendChild(stateIdInput);
    const stateLabelInput = document.createElement("input"); stateLabelInput.placeholder = "state label"; applyControlBaseStyle(stateLabelInput); statesSection.appendChild(stateLabelInput);
    const stateButtons = document.createElement("div"); stateButtons.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:3px;"; statesSection.appendChild(stateButtons);
    const stateBtn = (text: string) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.style.cssText = "font:12px monospace;min-height:24px;background:#111;color:#eee;border:1px solid rgba(255,255,255,0.24);"; stateButtons.appendChild(b); return b; };
    const addStateBtn = stateBtn("Add state"); const dupStateBtn = stateBtn("Duplicate state"); const delStateBtn = stateBtn("Delete state"); const upStateBtn = stateBtn("State up"); const downStateBtn = stateBtn("State down");
    const selectedStateSection = addAuthoringSection("Selected State");
    const movementSection = addAuthoringSection("Movement"); const movementPresetInput = document.createElement("input"); movementPresetInput.placeholder = "movement preset id"; applyControlBaseStyle(movementPresetInput); movementSection.appendChild(movementPresetInput);
    const modifierSection = addAuthoringSection("Modifiers"); const modifierList = document.createElement("div"); modifierSection.appendChild(modifierList); const addSineBtn = stateBtn("Add sineOffset"); modifierSection.appendChild(addSineBtn); const addClampBtn = stateBtn("Add clampY"); modifierSection.appendChild(addClampBtn);
    const targetingSection = addAuthoringSection("Targeting"); const targetingSelect = document.createElement("select"); applyNativeSelectStyle(targetingSelect); appendOption(targetingSelect, "forward", "forward"); appendOption(targetingSelect, "atPlayer", "atPlayer"); targetingSection.appendChild(targetingSelect);
    const combatSection = addAuthoringSection("Combat"); const combatSelect = document.createElement("select"); applyNativeSelectStyle(combatSelect); for (const mode of ["disabled", "inherit", "profile"]) appendOption(combatSelect, mode, mode); combatSection.appendChild(combatSelect); const combatProfileInput = document.createElement("input"); combatProfileInput.placeholder = "attack profile id"; applyControlBaseStyle(combatProfileInput); combatSection.appendChild(combatProfileInput);
    const lifecycleSection = addAuthoringSection("Lifecycle"); const despawnBtn = stateBtn("Add despawn"); lifecycleSection.appendChild(despawnBtn);
    const transitionSection = addAuthoringSection("Transitions"); const transitionList = document.createElement("div"); transitionSection.appendChild(transitionList); const addTransitionBtn = stateBtn("Add transition"); transitionSection.appendChild(addTransitionBtn);
    const diagnosticsSection = addAuthoringSection("Diagnostics"); const authoringDiagnostics = document.createElement("div"); authoringDiagnostics.style.cssText = "white-space:pre-wrap;color:#ffd27a;"; diagnosticsSection.appendChild(authoringDiagnostics);
    const previewSection = addAuthoringSection("Preview");
    previewSection.id = "ds-fsm-preview-section";
    const previewButtons = document.createElement("div"); previewButtons.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:3px;"; previewSection.appendChild(previewButtons);
    const previewBtn = (text: string) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.style.cssText = "font:12px monospace;min-height:24px;background:#111;color:#eee;border:1px solid rgba(255,255,255,0.24);"; previewButtons.appendChild(b); return b; };
    const previewDraftBtn = previewBtn("Preview Draft"); const previewSavedBtn = previewBtn("Preview Saved"); const previewRestartBtn = previewBtn("Restart"); const previewStopBtn = previewBtn("Stop");
    const previewStatus = document.createElement("div"); previewStatus.id = "ds-fsm-preview-status"; previewStatus.style.cssText = "white-space:pre-wrap;color:#bfe3ff;"; previewSection.appendChild(previewStatus);
    const previewDiagnostics = document.createElement("div"); previewDiagnostics.id = "ds-fsm-preview-diagnostics"; previewDiagnostics.style.cssText = "white-space:pre-wrap;color:#eee;"; previewSection.appendChild(previewDiagnostics);
    const previewTrace = document.createElement("div"); previewTrace.id = "ds-fsm-preview-trace"; previewTrace.style.cssText = "white-space:pre-wrap;color:#ccc;"; previewSection.appendChild(previewTrace);
    const saveCancelSection = addAuthoringSection("Save / Cancel"); const dirtyBadge = document.createElement("div"); saveCancelSection.appendChild(dirtyBadge);
    presetPanel.appendChild(authoringSections);
    const cm = (window as any).__CM;
    const previewSession = new FsmPreviewSession({
      store: cm?.store,
      spawnPreviewEnemy: (input) => cm?.game?.spawn?.spawnPreviewEnemy(input),
      getTick: () => Number(cm?.game?.loop?.tick ?? 0),
      previewX: this.logicW - 140,
      previewY: Math.round(this.logicH * 0.5),
    });

    const renderPresetEditor = () => {
      const items = presetModel.list(); presetList.textContent = ""; for (const item of items) appendOption(presetList, item.id, `${item.source === "user" ? "USER" : "BUILT-IN"} ${item.id}`); presetList.value = presetModel.selectedId;
      const draft = presetModel.draft; idInput.value = draft?.id ?? ""; labelInput.value = draft?.label ?? ""; const readOnly = !draft || draft.source === "builtin"; idInput.disabled = readOnly; labelInput.disabled = readOnly; saveBtn.disabled = readOnly || !draft.dirty; delBtn.disabled = readOnly;
      const d = presetModel.details(); details.textContent = d ? `Source: ${d.source.toUpperCase()} | Schema: ${d.schemaVersion} | States: ${d.stateCount}
Initial: ${d.initialState} | Validation: ${d.validationStatus}
${d.states.join(", ")}` : "No preset selected";
      diagBox.textContent = presetModel.diagnostics.map((x) => `${x.severity.toUpperCase()} ${x.presetId ? x.presetId + ": " : ""}${x.message}`).join("\n");
      if (authoringModel.draft?.originalPresetId !== presetModel.selectedId) authoringModel = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, presetModel.selectedId);
      const ad = authoringModel.draft; const selected = ad?.preset.graph.states.find((s) => s.id === ad.selectedStateId) ?? ad?.preset.graph.states[0]; const authoringReadOnly = authoringModel.readOnly;
      initialSelect.textContent = ""; for (const s of ad?.preset.graph.states ?? []) appendOption(initialSelect, String(s.id), String(s.id)); initialSelect.value = String(ad?.preset.graph.initialStateId ?? ""); initialSelect.disabled = authoringReadOnly;
      stateSelect.textContent = ""; for (const s of ad?.preset.graph.states ?? []) appendOption(stateSelect, String(s.id), `${s.id} ${s.label}`); stateSelect.value = String(selected?.id ?? ""); stateSelect.disabled = false;
      stateIdInput.value = String(selected?.id ?? ""); stateLabelInput.value = selected?.label ?? ""; stateIdInput.disabled = authoringReadOnly; stateLabelInput.disabled = authoringReadOnly;
      movementPresetInput.value = String((selected?.movement.base as any)?.params?.presetId ?? ""); movementPresetInput.disabled = authoringReadOnly;
      targetingSelect.value = String(selected?.targeting.type ?? "forward"); targetingSelect.disabled = authoringReadOnly;
      combatSelect.value = String(selected?.combat.mode ?? "disabled"); combatSelect.disabled = authoringReadOnly; combatProfileInput.value = String((selected?.combat as any)?.profileId ?? ""); combatProfileInput.disabled = authoringReadOnly || combatSelect.value !== "profile";
      modifierList.textContent = (selected?.movement.modifiers ?? []).map((m, i) => `${i + 1}. ${m.type} ${JSON.stringify((m as any).params ?? {})}`).join("\n"); modifierList.style.whiteSpace = "pre-wrap";
      transitionList.textContent = (selected?.transitions ?? []).map((t, i) => `${i + 1}. ${t.condition.type} -> ${t.targetStateId}`).join("\n"); transitionList.style.whiteSpace = "pre-wrap";
      authoringDiagnostics.textContent = ad?.diagnostics.map((x) => `${x.severity.toUpperCase()} ${x.code} ${x.path}: ${x.message}`).join("\n") ?? "";
      dirtyBadge.textContent = authoringReadOnly ? "BUILT-IN / READ ONLY" : (ad?.dirty ? "DIRTY" : "Saved");
      const preview = previewSession.current();
      previewDraftBtn.disabled = authoringReadOnly || !ad || authoringModel.hasErrors();
      previewSavedBtn.disabled = !CONTENT.fsmPresets.get(presetModel.selectedId);
      previewRestartBtn.disabled = !preview.source;
      previewStopBtn.disabled = preview.status !== "running";
      previewStatus.textContent = `PREVIEW: ${preview.source ? preview.source.toUpperCase() : "IDLE"}\nStatus: ${preview.status.toUpperCase()}${preview.endedReason ? ` (${preview.endedReason})` : ""}\nPreset: ${preview.presetId || "(none)"}`;
      const rt = preview.runtime;
      previewDiagnostics.textContent = rt ? [
        `State: ${rt.stateLabel} (${rt.stateId})`,
        `Index: ${rt.stateIndex}`,
        `Age: ${formatNum(rt.stateAge, 2)} s`,
        `Entries: ${rt.entryCount}`,
        `Movement: ${rt.movementPresetId ?? "none"}`,
        `Modifiers: ${rt.modifierTypes.join(", ") || "none"}`,
        `Suppressed: ${rt.movementSuppressed ? "yes" : "no"}`,
        `Combat: ${rt.combatMode}`,
        `Attack: ${rt.activeAttackProfileId ?? "none"}`,
        `Position: ${preview.position ? `${formatNum(preview.position.x)}, ${formatNum(preview.position.y)}` : "none"}`,
        `Pending/Removed: ${preview.position?.pendingKill ? "pending-kill" : preview.position?.removed ? "removed" : "live"}`,
        ...preview.diagnostics.map((x) => `${x.severity.toUpperCase()} ${x.code}: ${x.message}`),
      ].join("\n") : preview.diagnostics.map((x) => `${x.severity.toUpperCase()} ${x.code}: ${x.message}`).join("\n");
      previewTrace.textContent = `Transition Trace\n${preview.trace.map((t) => `${t.tick}: ${t.fromStateId ?? "spawn"} -> ${t.toStateId} #${t.entryCount}`).join("\n")}`;
      for (const b of [addStateBtn, dupStateBtn, delStateBtn, upStateBtn, downStateBtn, addSineBtn, addClampBtn, despawnBtn, addTransitionBtn]) b.disabled = authoringReadOnly;
      saveBtn.disabled = readOnly || !draft.dirty || !authoringModel.canSave;
      refreshFsmSpawnSelect(CONTENT.fsmPresets.get(presetModel.selectedId) ? presetModel.selectedId : fsmSpawnSelect.value);
    };
    presetList.addEventListener("change", () => { if (!authoringModel.requireDiscardConfirmation(presetList.value) || window.confirm("Discard unsaved FSM authoring changes?")) { presetModel.select(presetList.value); authoringModel = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, presetModel.selectedId); } renderPresetEditor(); });
    idInput.addEventListener("input", () => { presetModel.setDraftId(idInput.value); renderPresetEditor(); });
    labelInput.addEventListener("input", () => { presetModel.setDraftLabel(labelInput.value); renderPresetEditor(); });
    newBtn.addEventListener("click", () => { presetModel.create(); renderPresetEditor(); });
    dupBtn.addEventListener("click", () => { presetModel.duplicate(); renderPresetEditor(); });
    saveBtn.addEventListener("click", () => { if (authoringModel.draft?.dirty) authoringModel.save(); presetModel.save(); renderPresetEditor(); });
    cancelBtn.addEventListener("click", () => { authoringModel.cancel(); presetModel.cancel(); renderPresetEditor(); });
    delBtn.addEventListener("click", () => { if (window.confirm("Delete selected user FSM preset?")) presetModel.delete(presetModel.selectedId, true); renderPresetEditor(); });
    importBtn.addEventListener("click", () => { presetModel.importJson(importText.value, collisionSelect.value as any); renderPresetEditor(); });
    exportBtn.addEventListener("click", () => { exportText.value = presetModel.exportSelected().exportedText ?? ""; renderPresetEditor(); });
    exportAllBtn.addEventListener("click", () => { exportText.value = presetModel.exportAllUsers().exportedText ?? ""; renderPresetEditor(); });
    rawBtn.addEventListener("click", () => { exportText.value = presetModel.inspectRawStorage().rawStorage ?? ""; renderPresetEditor(); });
    clearBtn.addEventListener("click", () => { if (window.confirm("Clear all user FSM presets?")) presetModel.clearUserPresets(true); renderPresetEditor(); });
    initialSelect.addEventListener("change", () => { authoringModel.setInitialState(initialSelect.value); renderPresetEditor(); });
    stateSelect.addEventListener("change", () => { if (!authoringModel.requireDiscardConfirmation(presetModel.selectedId, stateSelect.value) || window.confirm("Discard selected state view change?")) authoringModel.selectState(stateSelect.value); renderPresetEditor(); });
    stateIdInput.addEventListener("change", () => { const oldId = authoringModel.draft?.selectedStateId; if (oldId) authoringModel.renameState(oldId, stateIdInput.value); renderPresetEditor(); });
    stateLabelInput.addEventListener("input", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.setStateLabel(id, stateLabelInput.value); renderPresetEditor(); });
    addStateBtn.addEventListener("click", () => { authoringModel.addState(); renderPresetEditor(); });
    dupStateBtn.addEventListener("click", () => { authoringModel.duplicateState(); renderPresetEditor(); });
    delStateBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; if (id && window.confirm("Delete selected FSM state and incoming transitions?")) authoringModel.deleteState(id, true); renderPresetEditor(); });
    upStateBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; const states = authoringModel.draft?.preset.graph.states ?? []; authoringModel.reorderState(String(id), Math.max(0, states.findIndex((s) => s.id === id) - 1)); renderPresetEditor(); });
    downStateBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; const states = authoringModel.draft?.preset.graph.states ?? []; authoringModel.reorderState(String(id), states.findIndex((s) => s.id === id) + 1); renderPresetEditor(); });
    movementPresetInput.addEventListener("change", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.setMovementPreset(id, movementPresetInput.value); renderPresetEditor(); });
    targetingSelect.addEventListener("change", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.setTargeting(id, targetingSelect.value as any); renderPresetEditor(); });
    combatSelect.addEventListener("change", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.setCombat(id, combatSelect.value === "profile" ? { mode: "profile", profileId: combatProfileInput.value } : { mode: combatSelect.value as any }); renderPresetEditor(); });
    combatProfileInput.addEventListener("change", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.setCombat(id, { mode: "profile", profileId: combatProfileInput.value }); renderPresetEditor(); });
    addSineBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.addModifier(id, "sineOffset"); renderPresetEditor(); });
    addClampBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.addModifier(id, "clampY"); renderPresetEditor(); });
    despawnBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.addDespawnAction(id); renderPresetEditor(); });
    addTransitionBtn.addEventListener("click", () => { const id = authoringModel.draft?.selectedStateId; if (id) authoringModel.addTransition(id); renderPresetEditor(); });
    previewDraftBtn.addEventListener("click", () => { previewSession.startDraftPreview(authoringModel.draft?.preset ?? null, !authoringModel.readOnly); renderPresetEditor(); });
    previewSavedBtn.addEventListener("click", () => { previewSession.startPersistedPreview(presetModel.selectedId); renderPresetEditor(); });
    previewRestartBtn.addEventListener("click", () => { previewSession.restart(); renderPresetEditor(); });
    previewStopBtn.addEventListener("click", () => { previewSession.stop(); renderPresetEditor(); });
    renderPresetEditor();
    fsmLabSection.appendChild(presetPanel);
    fsmLabSection.appendChild(createSectionGap());

    const labPanel = document.createElement("div");
    labPanel.id = ENEMY_LAB_DEBUG_PANEL_ID;
    labPanel.style.cssText = [
      "margin:0",
      "padding:4px",
      "background:rgba(255,255,255,0.06)",
      "border:0px solid rgba(255,255,255,0.12)",
      "border-radius:0px",
      "font:12px monospace",
      "line-height:2",
      "box-sizing:border-box"
    ].join(";");
    labPanel.textContent = EMPTY_ENEMY_LAB;
    fsmLabSection.appendChild(labPanel);


    const refreshEnemyLabMode = () => {
      const isSimple = enemyLabMode === "simple";
      const isSmart = enemyLabMode === "smart";
      const isFsm = enemyLabMode === "fsm";
      styleLabModeButton(simpleModeButton, isSimple);
      styleLabModeButton(smartModeButton, isSmart);
      styleLabModeButton(fsmModeButton, isFsm);
      simpleModeButton.setAttribute("aria-pressed", String(isSimple));
      smartModeButton.setAttribute("aria-pressed", String(isSmart));
      fsmModeButton.setAttribute("aria-pressed", String(isFsm));
      simpleLabSection.style.display = isSimple ? "flex" : "none";
      smartLabSection.style.display = isSmart ? "flex" : "none";
      fsmLabSection.style.display = isFsm ? "flex" : "none";
      fsmSpawnWrap.style.display = isFsm ? "flex" : "none";
      fsmSpawnWrap.setAttribute("aria-hidden", String(!isFsm));
      if (isFsm) refreshFsmSpawnSelect();
      if (isSimple) {
        simpleLabSection.appendChild(spawnSection);
        enemyMovement.setMovementClass("dumb");
        groupMovement.setMovementClass("dumb");
      } else if (isSmart) {
        smartLabSection.appendChild(spawnSection);
        enemyMovement.setMovementClass("smart");
        groupMovement.setMovementClass("smart");
      } else {
        fsmLabSection.appendChild(spawnSection);
      }
      setLabSectionFocusable(simpleLabSection, isSimple);
      setLabSectionFocusable(smartLabSection, isSmart);
      setLabSectionFocusable(fsmLabSection, isFsm);
    };
    simpleModeButton.addEventListener("click", () => { enemyLabMode = "simple"; refreshEnemyLabMode(); });
    smartModeButton.addEventListener("click", () => { enemyLabMode = "smart"; refreshEnemyLabMode(); });
    fsmModeButton.addEventListener("click", () => { enemyLabMode = "fsm"; refreshEnemyLabMode(); });
    refreshEnemyLabMode();

    document.body.appendChild(panel);
    this.panel = panel;
    this.refreshTimer = window.setInterval(() => this.refreshEnemyLab(), 250);
    this.refreshEnemyLab();
  }

  private refreshEnemyLab(): void {
    const out = this.panel?.querySelector(`#${ENEMY_LAB_DEBUG_PANEL_ID}`) as HTMLElement | null;
    if (!out) return;

    const selected = this.findSelectedFsmEnemy();
    if (selected) {
      this.retainedFsmInspection = createLiveFsmInspection(selected, Number((this.world as any)?.scrollX ?? 0));
    } else if (this.retainedFsmInspection?.status === "live") {
      this.retainedFsmInspection = endFsmInspection(this.retainedFsmInspection, "removed");
    }

    const retained = this.retainedFsmInspection;
    if (!retained) {
      out.textContent = EMPTY_ENEMY_LAB;
      return;
    }

    const runtime = retained.runtime;
    const position = retained.position;
    const graphView = renderFsmGraphView(runtime, retained.graph);
    const statusLine = retained.status === "ended"
      ? `<br><b>Status:</b> ${esc(retained.endReason === "despawned" ? "DESPAWNED" : "ENTITY REMOVED")}`
      : "";

    out.innerHTML = `<div style="display:grid;grid-template-columns:1fr auto;column-gap:10px;row-gap:2px;align-items:start;">
<div style="white-space:nowrap;">
<b>Type:</b> ${esc(String(retained.typeId ?? "?"))}<br>
<b>Beh:</b> ${esc(runtime.movementPresetId ?? "none")}<br>
<b>Atk:</b> ${esc(runtime.activeAttackProfileId ?? runtime.combatMode)}<br>
<b>HP:</b> ${esc(retained.hpLabel ?? "?")}<br>
<b>State:</b> ${esc(runtime.stateLabel || runtime.stateId)}<br>
<b>Index:</b> ${esc(runtime.stateIndex)}<br>
<b>Age:</b> ${esc(formatNum(runtime.stateAge, 2))} s<br>
<b>Entries:</b> ${esc(runtime.entryCount)}${statusLine}
</div>
<div style="white-space:nowrap;">
<b>scrX:</b> ${esc(formatNum(position?.screenX))}<br>
<b>scrY:</b> ${esc(formatNum(position?.screenY))}<br>
<b>wX:</b> ${esc(formatNum(position?.worldX))}<br>
<b>wY:</b> ${esc(formatNum(position?.worldY))}
</div>
</div>
<div style="margin-top:6px;">${graphView}</div>`;
  }

  private findSelectedFsmEnemy(): any | null {
    const store = (window as any).__CM?.store;
    if (!store || typeof store.debugForEachAlive !== "function") return null;

    let selected: any | null = null;
    store.debugForEachAlive((_ref: any, ent: any) => {
      if (!ent || ent.kind !== "enemy" || ent.pendingKill) return;
      const def = ENEMY_DEFS[String(ent.typeId)];
      if (!def?.behaviorGraphId) return;
      if (!selected) selected = ent;
      if (this.latestManualSpawnId > 0 && ent.devManualSpawnId === this.latestManualSpawnId) selected = ent;
    });
    return selected;
  }

  destroy(): void {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    while (this.cleanupHandlers.length) this.cleanupHandlers.pop()?.();
    if (this.panel?.parentNode) this.panel.parentNode.removeChild(this.panel);
    this.panel = null;
  }
}
