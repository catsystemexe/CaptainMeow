import assert from "node:assert/strict";
import { SCENE_LAB_SCENE_CATALOG } from "../../../ui/SceneLabSceneCatalog";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "./BackgroundV2Serialization";
import { createBackgroundV2SequenceVerificationScene } from "./BackgroundV2SequenceVerificationScene";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";

const scene = createBackgroundV2SequenceVerificationScene();
const repeated = createBackgroundV2SequenceVerificationScene();

assert.deepEqual(repeated, scene, "factory output is deterministic");
assert.notEqual(repeated, scene, "factory calls return isolated scenes");
assert.notEqual(repeated.sceneLogic, scene.sceneLogic, "factory calls return isolated Scene Logic data");
assert.equal(scene.id, "bgr-v2-sequence-verification", "scene ID is stable");
assert.equal(validateBackgroundSceneV2(scene).valid, true, "fixture passes normal BackgroundSceneV2 validation");

const logic = scene.sceneLogic;
assert(logic && logic.version === 2, "fixture authors strict Scene Logic V2");
assert.deepEqual(logic.spaces.markers, [{ id: "sequence-verify-marker", position: 2200 }], "one reachable Marker is authored");

const trigger = logic.triggers.find(candidate => candidate.id === "sequence-verify-trigger");
assert.deepEqual(trigger, {
  id: "sequence-verify-trigger",
  kind: "space",
  relation: "cross",
  markerId: "sequence-verify-marker",
  mode: "once",
  enabled: true,
});
const triggerBinding = logic.triggerEventBindings.find(candidate => candidate.triggerId === trigger.id);
assert.equal(triggerBinding?.eventId, "sequence-verify-start-event", "Trigger resolves its Event binding");
const startBinding = logic.eventActionBindings.find(candidate => candidate.eventId === triggerBinding.eventId);
assert.equal(startBinding?.actionId, "sequence-verify-start-action", "Event resolves its start_sequence binding");
const startAction = logic.actions.find(candidate => candidate.id === startBinding.actionId);
assert(startAction?.category === "flow" && startAction.type === "start_sequence");
assert.equal(startAction.sequenceInstanceId, "sequence-verify:a", "start_sequence targets the verification instance");

const instance = logic.sequenceInstances.find(candidate => candidate.id === startAction.sequenceInstanceId);
assert.equal(instance?.definitionId, "sequence-verify", "Sequence Instance resolves its Definition");
const definition = logic.sequenceDefinitions.find(candidate => candidate.id === instance.definitionId);
assert.deepEqual(definition?.steps, [
  { kind: "wait", durationSec: 0.5 },
  { kind: "action", actionId: "sequence-verify-complete" },
], "Definition waits 0.5 seconds before invoking complete_level");
const completion = logic.actions.find(candidate => candidate.id === "sequence-verify-complete");
assert.deepEqual(completion, { id: "sequence-verify-complete", category: "flow", type: "complete_level" });
assert.equal(definition?.steps.some(step => step.kind === "action" && step.actionId === startAction.id), false, "Definition contains no start_sequence step");
assert.equal(logic.eventActionBindings.some(binding => binding.eventId === triggerBinding.eventId && binding.actionId === completion.id), false, "completion is not bound directly to the Trigger Event");

const parsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(scene));
assert.equal(parsed.ok, true, "fixture survives the normal persistence boundary");
assert(parsed.ok);
assert.deepEqual(parsed.scene, scene, "serialization roundtrip preserves the authored graph");

const catalogEntry = SCENE_LAB_SCENE_CATALOG.find(entry => entry.id === "sequence-verification-v2");
assert(catalogEntry && catalogEntry.version === 2);
assert.equal(catalogEntry.label, "Sequence Verification V2");
assert.deepEqual(catalogEntry.create(), scene, "catalog delegates to the deterministic factory");
for (const label of ["Desert V2", "Visual Verification V2", "B2 Demo"]) {
  assert(SCENE_LAB_SCENE_CATALOG.some(entry => entry.label === label), `${label} remains available`);
}

repeated.sceneLogic.spaces.markers[0].position = 1;
assert.equal(scene.sceneLogic.spaces.markers[0].position, 2200, "nested authored data is isolated between calls");

console.log("BackgroundV2SequenceVerificationScene.smoke: PASS");
