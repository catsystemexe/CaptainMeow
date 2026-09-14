import assert from "node:assert/strict";
import { createWorldState } from "../data/WorldState";
import type { PlayerData } from "../entities/PlayerTypes";
import { materializeSceneEvent } from "./EventRuntime";
import { validateStateReferenceDefinition, type StateReferenceDefinition } from "./State";
import { createSceneLogicStateRegistry, readStateValue, resolveStateReference } from "./StateRuntime";
import { resolveTriggerState, validateStateTrigger, type StateTriggerDefinition } from "./Trigger";
import { compareStateValues, createStateTriggerRuntimeState, evaluateStateTrigger } from "./TriggerRuntime";

const world = createWorldState();
const player = {
  kind: "player", pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, speed: 1, radius: 1,
  alive: true, pendingKill: false, gen: 0, id: 1, flags: 0, shield: 100, shieldMax: 100,
} satisfies PlayerData;
const registry = createSceneLogicStateRegistry({ world, player });
const states = [
  { id: "scroll_speed", address: "scene.scrollSpeed", valueType: "number" },
  { id: "player_alive", address: "player.alive", valueType: "boolean" },
  { id: "player_shield", address: "player.shield", valueType: "number" },
] as const satisfies readonly StateReferenceDefinition[];

for (const definition of states) assert.equal(validateStateReferenceDefinition(definition).valid, true);
for (const [field, value] of [["id", ""], ["address", " "], ["valueType", "object"]] as const) {
  const result = validateStateReferenceDefinition({ ...states[0], [field]: value });
  assert.equal(result.valid, false);
  assert(result.issues.some((issue) => issue.field === field));
}
for (const invalid of [null, [], undefined]) assert.equal(validateStateReferenceDefinition(invalid).valid, false);

const scroll = resolveStateReference(states[0], registry);
const alive = resolveStateReference(states[1], registry);
const shield = resolveStateReference(states[2], registry);
assert.equal(readStateValue(scroll), 60);
world.speedX = 0;
assert.equal(readStateValue(scroll), 0, "reader observes the current WorldState value, not a snapshot");
assert.equal(readStateValue(alive), true);
player.alive = false;
assert.equal(readStateValue(alive), false, "reader observes the current PlayerData alive value");
assert.equal(readStateValue(shield), 100);
player.shield = 25;
assert.equal(readStateValue(shield), 25, "reader observes the current PlayerData Shield value");
assert.throws(() => registry.resolve("unknown.address"), /not registered/);
assert.throws(() => registry.resolve("player.energy"), /not registered/, "compatibility energy is not canonical State");
assert.equal(registry.resolve("scene.scrollSpeed").writable, true);
assert.equal(registry.resolve("player.alive").writable, false);
assert.equal(registry.resolve("player.shield").writable, false);
const scrollWriter = registry.resolveWritable("scene.scrollSpeed");
assert.equal(scrollWriter.writable, true);
scrollWriter.write(125);
assert.equal(world.speedX, 125, "a direct finite numeric write reaches authoritative WorldState");
for (const invalid of [false, "bad", Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  assert.throws(() => scrollWriter.write(invalid as never), /requires a finite number/);
  assert.equal(world.speedX, 125, "a rejected direct write leaves authoritative WorldState unchanged");
}
assert.throws(() => registry.resolveWritable("player.alive"), /read-only/);
assert.throws(() => registry.resolveWritable("player.shield"), /read-only/);
assert.throws(() => resolveStateReference({ ...states[0], valueType: "string" }, registry), /declares string/);

const numberCases = [
  ["==", 2, 2, true], ["!=", 2, 3, true], ["<", 2, 3, true],
  ["<=", 2, 2, true], [">", 3, 2, true], [">=", 2, 2, true],
] as const;
for (const [relation, current, expected, result] of numberCases) {
  assert.equal(compareStateValues(relation, current, expected), result, `number ${relation}`);
}
assert.equal(compareStateValues("==", true, true), true);
assert.equal(compareStateValues("!=", true, false), true);
assert.equal(compareStateValues("==", 1, "1"), false, "semantic equality never coerces");
assert.throws(() => compareStateValues("<", "a", "b"), /require number/);

function trigger(overrides: Partial<StateTriggerDefinition> = {}): StateTriggerDefinition {
  return { id: "stopped", kind: "state", stateId: "scroll_speed", relation: "==", value: 0, mode: "repeat", enabled: true, ...overrides };
}
assert.equal(validateStateTrigger(trigger(), states).valid, true);
for (const changed of [
  { stateId: "missing" }, { value: "0" }, { relation: "bad" }, { value: Number.NaN },
  { value: Number.POSITIVE_INFINITY }, { value: null }, { mode: "many" }, { enabled: 1 },
]) assert.equal(validateStateTrigger({ ...trigger(), ...changed }, states).valid, false);
assert.equal(validateStateTrigger(trigger({ stateId: "player_alive", relation: "<", value: false }), states).valid, false);
assert.throws(() => resolveTriggerState(trigger({ stateId: "missing" }), states), /missing State/);

world.speedX = 60;
const scrollState = createStateTriggerRuntimeState();
assert.equal(evaluateStateTrigger(trigger(), scroll, scrollState), null);
world.speedX = 0;
assert.deepEqual(evaluateStateTrigger(trigger(), scroll, scrollState), { triggerId: "stopped" });
assert.equal(evaluateStateTrigger(trigger(), scroll, scrollState), null, "matching condition does not continuously fire");
world.speedX = 60;
assert.equal(evaluateStateTrigger(trigger(), scroll, scrollState), null);
world.speedX = 0;
assert.deepEqual(evaluateStateTrigger(trigger(), scroll, scrollState), { triggerId: "stopped" }, "repeat fires after false then true");

player.shield = 100;
const shieldTrigger = trigger({ id: "depleted", stateId: "player_shield", relation: "<=", value: 0 });
const shieldState = createStateTriggerRuntimeState();
assert.equal(evaluateStateTrigger(shieldTrigger, shield, shieldState), null);
player.shield = 50;
assert.equal(evaluateStateTrigger(shieldTrigger, shield, shieldState), null);
player.shield = 0;
assert.deepEqual(evaluateStateTrigger(shieldTrigger, shield, shieldState), { triggerId: "depleted" });

const onceState = createStateTriggerRuntimeState();
world.speedX = 60;
const once = trigger({ mode: "once" });
evaluateStateTrigger(once, scroll, onceState);
world.speedX = 0;
assert(evaluateStateTrigger(once, scroll, onceState));
world.speedX = 60;
evaluateStateTrigger(once, scroll, onceState);
world.speedX = 0;
assert.equal(evaluateStateTrigger(once, scroll, onceState), null, "once remains consumed");

player.alive = true;
const aliveTrigger = trigger({ id: "died", stateId: "player_alive", value: false });
const disabledState = createStateTriggerRuntimeState();
evaluateStateTrigger({ ...aliveTrigger, enabled: false }, alive, disabledState);
player.alive = false;
evaluateStateTrigger({ ...aliveTrigger, enabled: false }, alive, disabledState);
assert.equal(evaluateStateTrigger(aliveTrigger, alive, disabledState), null, "enable while matched does not retro-fire");
player.alive = true;
evaluateStateTrigger(aliveTrigger, alive, disabledState);
player.alive = false;
const occurrence = evaluateStateTrigger(aliveTrigger, alive, disabledState);
assert.deepEqual(occurrence, { triggerId: "died" });

const stateBefore = { ...states[1] };
const triggerBefore = { ...aliveTrigger };
assert(occurrence);
const event = materializeSceneEvent(
  occurrence,
  { triggerId: aliveTrigger.id, eventId: "player_died" },
  { id: "player_died", category: "scene", type: "player_died" },
);
assert.deepEqual(event, { eventId: "player_died", type: "player_died", sourceTriggerId: "died" });
assert.deepEqual(states[1], stateBefore, "State definition remains authored data");
assert.deepEqual(aliveTrigger, triggerBefore, "Trigger definition remains authored data");
assert.equal(player.alive, false, "State Trigger only reads authoritative runtime State");

console.log("[SMOKE] Scene Logic State runtime and State Trigger OK ✅");
