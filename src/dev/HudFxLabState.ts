export const HUD_FX_LAB_STORAGE_KEY = "captainMeow.dev.hudFxLab.v1";
export const HUD_FX_SLOTS_STORAGE_KEY = "captainMeow.dev.hudFxSlots.v1";
export const HUD_FX_SLOT_IDS = ["HUD1", "HUD2", "HUD3", "HUD4", "HUD5"] as const;
export const HUD_FX_EVENTS = ["score", "hit", "heal", "wave", "weapon", "bomb"] as const;
export const HUD_FX_EFFECTS = ["pop", "shake", "flash", "ghost", "glitch", "snap"] as const;

export type HudFxEventId = typeof HUD_FX_EVENTS[number];
export type HudFxEffectId = typeof HUD_FX_EFFECTS[number];
export interface HudFxSetting { enabled: boolean; intensity: number }
export interface HudFxLabState {
  selectedEvent: HudFxEventId;
  events: Record<HudFxEventId, Record<HudFxEffectId, HudFxSetting>>;
}
export type HudFxSlotId = typeof HUD_FX_SLOT_IDS[number];
export type HudFxSnapshot = Pick<HudFxLabState, "events">;
export type HudFxSlots = Record<HudFxSlotId, HudFxSnapshot | null>;

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

export function createEmptyHudFxSlots(): HudFxSlots {
  return Object.fromEntries(HUD_FX_SLOT_IDS.map((id) => [id, null])) as HudFxSlots;
}

function normalizeSnapshot(value: unknown): HudFxSnapshot | null {
  if (!isRecord(value) || !isRecord(value.events)) return null;
  return { events: normalizeHudFxLabState({ events: value.events }).events };
}

export function normalizeHudFxSlots(value: unknown): HudFxSlots {
  const slots = createEmptyHudFxSlots();
  if (!isRecord(value)) return slots;
  for (const id of HUD_FX_SLOT_IDS) slots[id] = normalizeSnapshot(value[id]);
  return slots;
}

export function loadHudFxSlots(storage: Pick<Storage, "getItem">): HudFxSlots {
  try { return normalizeHudFxSlots(JSON.parse(storage.getItem(HUD_FX_SLOTS_STORAGE_KEY) ?? "null")); }
  catch { return createEmptyHudFxSlots(); }
}

export function saveHudFxSlot(storage: Pick<Storage, "getItem" | "setItem">, id: HudFxSlotId, state: HudFxLabState): HudFxSlots {
  const slots = loadHudFxSlots(storage);
  slots[id] = normalizeSnapshot({ events: state.events });
  storage.setItem(HUD_FX_SLOTS_STORAGE_KEY, JSON.stringify(slots));
  return normalizeHudFxSlots(slots);
}

export function loadHudFxSlot(state: HudFxLabState, slots: HudFxSlots, id: HudFxSlotId): HudFxLabState {
  const snapshot = slots[id];
  return snapshot ? normalizeHudFxLabState({ selectedEvent: state.selectedEvent, events: snapshot.events }) : normalizeHudFxLabState(state);
}
