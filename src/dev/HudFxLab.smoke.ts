import assert from "node:assert/strict";
import { HUD_FX_EFFECTS, HUD_FX_EVENTS, HUD_FX_LAB_STORAGE_KEY, HUD_FX_SLOT_IDS, HUD_FX_SLOTS_STORAGE_KEY, createDefaultHudFxLabState, loadHudFxLabState, loadHudFxSlot, loadHudFxSlots, normalizeHudFxLabState, saveHudFxLabState, saveHudFxSlot, selectHudFxEvent, toggleHudFx, updateHudFxIntensity } from "./HudFxLabState";
import { getHudFxTestRequests } from "./HudFxLabUI";

const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
const defaults = createDefaultHudFxLabState();
assert.equal(HUD_FX_LAB_STORAGE_KEY, "captainMeow.dev.hudFxLab.v1");
assert.deepEqual(HUD_FX_SLOT_IDS, ["HUD1", "HUD2", "HUD3", "HUD4", "HUD5"]);
assert(HUD_FX_EVENTS.every((event) => HUD_FX_EFFECTS.every((fx) => defaults.events[event][fx].enabled === false && defaults.events[event][fx].intensity === 0.5)));
assert.deepEqual(loadHudFxSlots(storage), { HUD1: null, HUD2: null, HUD3: null, HUD4: null, HUD5: null });
values.set(HUD_FX_SLOTS_STORAGE_KEY, "{bad");
assert(HUD_FX_SLOT_IDS.every((id) => loadHudFxSlots(storage)[id] === null));

let active = updateHudFxIntensity(toggleHudFx(selectHudFxEvent(defaults, "hit"), "ghost"), "ghost", 0.73);
saveHudFxLabState(storage, active);
saveHudFxSlot(storage, "HUD1", active);
active = updateHudFxIntensity(active, "ghost", 0.1);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.intensity, 0.73, "slot snapshot is deep-isolated");
saveHudFxSlot(storage, "HUD1", active);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.intensity, 0.1, "save overwrites a fixed slot");
const hud2 = toggleHudFx(selectHudFxEvent(defaults, "wave"), "glitch");
saveHudFxSlot(storage, "HUD2", hud2);
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.enabled, true);
assert.equal(loadHudFxSlots(storage).HUD2?.events.wave.glitch.enabled, true, "slots are independent");
const loaded = loadHudFxSlot(selectHudFxEvent(defaults, "bomb"), loadHudFxSlots(storage), "HUD1");
assert.equal(loaded.selectedEvent, "bomb");
assert.equal(loaded.events.hit.ghost.intensity, 0.1);
assert.deepEqual(loadHudFxSlot(active, { ...loadHudFxSlots(storage), HUD3: null }, "HUD3"), normalizeHudFxLabState(active), "empty load is a no-op");
assert.equal(loadHudFxSlots(storage).HUD1?.events.hit.ghost.enabled, true, "resetting active does not erase slots");

values.set(HUD_FX_SLOTS_STORAGE_KEY, JSON.stringify({ HUD1: { events: { score: { pop: { enabled: "yes", intensity: 9 }, ghost: { enabled: true, intensity: -2 } } } }, HUD2: { broken: true } }));
const normalizedSlots = loadHudFxSlots(storage);
assert.deepEqual(normalizedSlots.HUD1?.events.score.pop, { enabled: false, intensity: 1 });
assert.deepEqual(normalizedSlots.HUD1?.events.score.ghost, { enabled: true, intensity: 0 });
assert.equal(normalizedSlots.HUD2, null, "one malformed slot does not invalidate siblings");

for (const eventId of HUD_FX_EVENTS) {
  let all = selectHudFxEvent(defaults, eventId);
  HUD_FX_EFFECTS.forEach((effectId, index) => {
    let single = selectHudFxEvent(defaults, eventId);
    single = updateHudFxIntensity(toggleHudFx(single, effectId), effectId, index / 5);
    assert.deepEqual(getHudFxTestRequests(single), [{ eventId, effectId, intensity: index / 5 }]);
    all = updateHudFxIntensity(toggleHudFx(all, effectId), effectId, index / 5);
  });
  assert.deepEqual(getHudFxTestRequests(all).map(({ effectId }) => effectId), [...HUD_FX_EFFECTS]);
  assert.deepEqual(getHudFxTestRequests(all).map(({ intensity }) => intensity), [0, 0.2, 0.4, 0.6, 0.8, 1]);
}
values.set(HUD_FX_LAB_STORAGE_KEY, "{bad");
assert.deepEqual(loadHudFxLabState(storage), defaults);
console.log("HudFxLab state smoke passed");
