import assert from "node:assert/strict";
import { defineMovementBase, type MovementBaseModule } from "./catalog";
import { MOVEMENT_BASE_DESCRIPTORS, type MovementBaseDescriptor } from "./catalog/descriptors";
import { asFsmStateId, type FsmPresetSchemaV1 } from "./fsm/schema";
import { normalizeFsmPreset, validateFsmPreset } from "./fsm/validate";

function basePreset(): FsmPresetSchemaV1 {
  return {
    schemaVersion: 1,
    metadata: { id: "test", name: "Test", source: "draft", schemaVersion: 1 },
    graph: {
      initialStateId: asFsmStateId("idle"),
      states: [
        {
          id: asFsmStateId("idle"),
          label: "Idle",
          movement: { base: { type: "movementPreset", params: { presetId: "none.hold" } }, modifiers: [{ type: "clampY", params: { paddingPx: 16 } }] },
          targeting: { type: "forward" },
          combat: { mode: "disabled" },
          transitions: [{ condition: { type: "timeInState", params: { seconds: 1 } }, targetStateId: asFsmStateId("idle") }],
        },
      ],
    },
  };
}
function codes(p: unknown) { return validateFsmPreset(p, { knownAttackProfileIds: ["basic"] }).issues.map((i) => i.code); }
function clone(): FsmPresetSchemaV1 { return structuredClone(basePreset()); }

assert.deepEqual(validateFsmPreset(basePreset()).issues.filter((i) => i.severity === "error"), [], "valid target preset produces no errors");

{
  const p = clone();
  p.graph.states.push({ ...structuredClone(p.graph.states[0]), id: asFsmStateId("idle") });
  assert(codes(p).includes("E_DUPLICATE_STATE_ID"), "duplicate state ID produces a hard error");
}
{
  const p = clone(); p.graph.initialStateId = asFsmStateId("missing");
  assert(codes(p).includes("E_MISSING_INITIAL_STATE"), "missing initial state produces a hard error");
}
{
  const p = clone(); p.graph.states[0].transitions[0].targetStateId = asFsmStateId("missing");
  assert(codes(p).includes("E_DANGLING_TRANSITION"), "dangling transition target produces a hard error");
}
{
  const p: any = clone(); p.graph.states[0].movement.modifiers[0].type = "mystery";
  assert(codes(p).includes("E_UNKNOWN_MOVEMENT_MODIFIER"), "unknown module type produces a hard error");
  p.graph.states[0].movement.modifiers[0].type = "clampY"; p.graph.states[0].transitions[0].condition.type = "mystery";
  assert(codes(p).includes("E_UNKNOWN_CONDITION"), "unknown condition type produces a hard error");
  p.graph.states[0].transitions[0].condition.type = "timeInState"; p.graph.states[0].lifecycle = { enterActions: [{ type: "mystery" }] };
  assert(codes(p).includes("E_UNKNOWN_ENTER_ACTION"), "unknown action type produces a hard error");
}
{
  const p: any = clone(); p.graph.states[0].movement.modifiers[0].params.paddingPx = "bad";
  assert(codes(p).includes("E_PARAM_TYPE"), "invalid parameter type produces a hard error");
}
{
  const p = clone(); p.graph.states[0].movement.modifiers = [{ type: "clampY", params: { paddingPx: 9999 } }];
  assert(codes(p).includes("E_PARAM_RANGE"), "out-of-range numeric value is an error in validation mode");
  const before = p.graph.states[0].movement.modifiers[0].params.paddingPx;
  const result = normalizeFsmPreset(p);
  assert(result.preset, "normalization returns preset");
  assert.notEqual(result.preset, p, "normalization returns a cloned preset");
  assert.equal(p.graph.states[0].movement.modifiers[0].params.paddingPx, before, "normalization preserves input object");
  assert.equal((result.preset.graph.states[0].movement.modifiers?.[0] as any).params.paddingPx, 240, "normalization returns corrected value");
  const normalized = result.issues.find((i) => i.code === "N_PARAM_CLAMPED");
  assert(normalized, "normalization issue is reported");
  assert.equal(normalized.originalValue, 9999, "normalization issue includes original value");
  assert.equal(normalized.normalizedValue, 240, "normalization issue includes normalized value");
}
{
  const p = clone(); p.graph.states[0].movement.modifiers = [0, 1, 2, 3].map((n) => ({ type: "clampY", params: { paddingPx: n } }));
  assert(codes(p).includes("E_TOO_MANY_MODIFIERS"), "modifier count above three is a hard error");
}
{
  const p = clone(); p.graph.states[0].transitions[0].condition = { type: "timeInState", params: { seconds: 0 } };
  assert(codes(p).includes("E_IMMEDIATE_CYCLE"), "guaranteed-immediate cycle produces E_IMMEDIATE_CYCLE");
}
{
  const p = clone(); p.graph.states[0].transitions[0].condition = { type: "hpBelow", params: { ratio: 0.5 } };
  assert(codes(p).includes("W_TIMELESS_CYCLE"), "timeless cycle produces W_TIMELESS_CYCLE");
}
{
  const p = clone();
  assert(!codes(p).some((c) => c === "E_IMMEDIATE_CYCLE" || c === "W_TIMELESS_CYCLE"), "timed cycle produces no cycle issue");
}
{
  const p = clone(); p.graph.states[0].lifecycle = { enterActions: [{ type: "despawn" }] };
  assert(codes(p).includes("W_TERMINAL_STATE_TRANSITIONS"), "terminal/despawn state with outgoing transitions produces a warning");
}

const moduleAnchorDescriptor: MovementBaseDescriptor = { ...MOVEMENT_BASE_DESCRIPTORS.movementPreset, type: "anchorTest", cullReference: "moduleAnchor" };
const moduleWithoutAnchor: MovementBaseModule<{ speed: number }, { t: number }> = {
  createState: () => ({ t: 0 }),
  update: () => {},
  getTarget: () => false,
};
assert.throws(() => defineMovementBase({ descriptor: moduleAnchorDescriptor, module: moduleWithoutAnchor }), /getCullAnchorX/, "defineMovementBase rejects moduleAnchor without getCullAnchorX");
assert(defineMovementBase({ descriptor: moduleAnchorDescriptor, module: { ...moduleWithoutAnchor, getCullAnchorX: () => 0 } }), "defineMovementBase accepts a valid anchor-capable module");


{
  const p = clone();
  p.graph.states[0].lifecycle = { enterActions: [{ type: "despawn" }, { type: "despawn" }] };
  assert(codes(p).includes("W_DUPLICATE_DESPAWN_ACTION"), "duplicate despawn action produces a warning");
}

{
  const p = clone();
  p.graph.initialStateId = p.graph.states[0].id;
  p.graph.states[0].lifecycle = { enterActions: [{ type: "despawn" }] };
  p.graph.states[0].transitions = [];
  assert(!codes(p).some((c) => c.startsWith("E_")), "initial despawn is allowed");
}

{
  const p = clone();
  p.graph.states = [
    { ...p.graph.states[0], id: "a" as any, label: "a", lifecycle: { enterActions: [{ type: "despawn" }] }, transitions: [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: "b" as any }] },
    { ...p.graph.states[0], id: "b" as any, label: "b", transitions: [{ condition: { type: "timeInState", params: { seconds: 0 } }, targetStateId: "a" as any }] },
  ];
  p.graph.initialStateId = "a" as any;
  assert(codes(p).includes("E_IMMEDIATE_ACTION_CYCLE"), "immediate cycle containing enter actions is a hard error");
}

console.log("FsmValidate smoke passed");
