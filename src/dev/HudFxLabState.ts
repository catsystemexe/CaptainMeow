export const HUD_FX_LAB_STORAGE_KEY = "captainMeow.dev.hudFxLab.v1";
export const HUD_FX_EVENTS = ["score", "hit", "heal", "wave", "weapon", "bomb"] as const;
export const HUD_FX_EFFECTS = ["pop", "shake", "flash", "ghost", "glitch", "snap"] as const;

export type HudFxEventId = typeof HUD_FX_EVENTS[number];
export type HudFxEffectId = typeof HUD_FX_EFFECTS[number];
export interface HudFxSetting { enabled: boolean; intensity: number }
export interface HudFxLabState {
  selectedEvent: HudFxEventId;
  events: Record<HudFxEventId, Record<HudFxEffectId, HudFxSetting>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const clampIntensity = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;

export function createDefaultHudFxLabState(): HudFxLabState {
  const events = {} as HudFxLabState["events"];
  for (const eventId of HUD_FX_EVENTS) {
    events[eventId] = {} as Record<HudFxEffectId, HudFxSetting>;
    for (const effectId of HUD_FX_EFFECTS) events[eventId][effectId] = { enabled: false, intensity: 0.5 };
  }
  return { selectedEvent: "score", events };
}

export function normalizeHudFxLabState(value: unknown): HudFxLabState {
  const normalized = createDefaultHudFxLabState();
  if (!isRecord(value)) return normalized;
  if (typeof value.selectedEvent === "string" && (HUD_FX_EVENTS as readonly string[]).includes(value.selectedEvent)) {
    normalized.selectedEvent = value.selectedEvent as HudFxEventId;
  }
  if (!isRecord(value.events)) return normalized;
  for (const eventId of HUD_FX_EVENTS) {
    const event = value.events[eventId];
    if (!isRecord(event)) continue;
    for (const effectId of HUD_FX_EFFECTS) {
      const setting = event[effectId];
      if (!isRecord(setting)) continue;
      normalized.events[eventId][effectId] = {
        enabled: typeof setting.enabled === "boolean" ? setting.enabled : false,
        intensity: clampIntensity(setting.intensity),
      };
    }
  }
  return normalized;
}

export function selectHudFxEvent(state: HudFxLabState, eventId: unknown): HudFxLabState {
  return normalizeHudFxLabState({ ...state, selectedEvent: eventId });
}

export function toggleHudFx(state: HudFxLabState, effectId: HudFxEffectId): HudFxLabState {
  const next = normalizeHudFxLabState(state);
  const setting = next.events[next.selectedEvent][effectId];
  setting.enabled = !setting.enabled;
  return next;
}

export function updateHudFxIntensity(state: HudFxLabState, effectId: HudFxEffectId, intensity: number): HudFxLabState {
  const next = normalizeHudFxLabState(state);
  next.events[next.selectedEvent][effectId].intensity = clampIntensity(intensity);
  return next;
}

export function loadHudFxLabState(storage: Pick<Storage, "getItem">): HudFxLabState {
  try { return normalizeHudFxLabState(JSON.parse(storage.getItem(HUD_FX_LAB_STORAGE_KEY) ?? "null")); }
  catch { return createDefaultHudFxLabState(); }
}

export function saveHudFxLabState(storage: Pick<Storage, "setItem">, state: HudFxLabState): void {
  storage.setItem(HUD_FX_LAB_STORAGE_KEY, JSON.stringify(normalizeHudFxLabState(state)));
}
