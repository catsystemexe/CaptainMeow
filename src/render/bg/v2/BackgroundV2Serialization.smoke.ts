import assert from "node:assert/strict";
import { createBackgroundV2DesertTestScene } from "./BackgroundV2DesertTestScene";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "./BackgroundV2Serialization";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";
import { materializeBackgroundFrameCommands } from "../../webgl/bg/v2/BackgroundV2RenderCommands";

const scene = createBackgroundV2DesertTestScene();
const json = serializeBackgroundSceneV2(scene);
const persisted = JSON.parse(json);
const persistedSegment = persisted.tracks[0].segments[0].asset;
const persistedObject = persisted.tracks[0].objects[1].asset;
assert.deepEqual(persistedSegment, { id: "desert_far_mesas" });
assert.deepEqual(persistedObject, { id: "desert_clouds" });
assert.deepEqual(persisted.staticBackdrop.asset, scene.staticBackdrop!.asset, "static backdrop keeps legacy persistence semantics");

const parsed = parseBackgroundSceneV2(json);
assert(parsed.ok);
if (parsed.ok) assert.deepEqual(parsed.scene, scene, "canonical ID-only refs resolve back to runtime refs");

const legacy = structuredClone(scene);
const matchingLegacy = parseBackgroundSceneV2(JSON.stringify(legacy));
assert(matchingLegacy.ok);
if (matchingLegacy.ok) assert.deepEqual(matchingLegacy.scene, scene, "matching legacy refs remain compatible");

const oldIdentity = structuredClone(persisted);
oldIdentity.tracks[0].segments[0].asset.id = "desert-test-far-mesas";
oldIdentity.tracks[0].objects[1].asset.id = "desert-test-clouds";
const migratedIdentity = parseBackgroundSceneV2(JSON.stringify(oldIdentity));
assert(migratedIdentity.ok);
if (migratedIdentity.ok) {
  assert.equal(migratedIdentity.scene.tracks[0].segments[0].asset.id, "desert_far_mesas");
  assert.equal(migratedIdentity.scene.tracks[0].objects[1].asset.id, "desert_clouds");
}

const oldBackdropIdentity = structuredClone(persisted);
oldBackdropIdentity.staticBackdrop.asset = { id: "desert-test-sky", url: "/old/location/sky.png" };
const migratedBackdropIdentity = parseBackgroundSceneV2(JSON.stringify(oldBackdropIdentity));
assert(migratedBackdropIdentity.ok);
if (migratedBackdropIdentity.ok) {
  assert.deepEqual(migratedBackdropIdentity.scene.staticBackdrop?.asset, { id: "desert_sky", url: "/assets/bg/test/desert/desert_sky.png" });
  const roundTrip = JSON.parse(serializeBackgroundSceneV2(migratedBackdropIdentity.scene));
  assert.deepEqual(roundTrip.staticBackdrop.asset, { id: "desert_sky", url: "/assets/bg/test/desert/desert_sky.png" }, "static backdrop keeps its full canonical persistence ref");
  const frame = evaluateBackgroundScene(migratedBackdropIdentity.scene, { cameraScrollX: 0, cameraScrollY: 0 });
  const command = materializeBackgroundFrameCommands(frame, { playerWorldX: 0 }).staticBackdrop;
  assert.equal(command?.assetResolved, true);
  assert.deepEqual(command?.expectedTextureSize, { width: 1672, height: 941 });
}

legacy.tracks[0].segments[0].asset.url = "/old/location/mesas.png";
legacy.tracks[0].objects[1].asset.url = "/old/location/clouds.png";
const staleLegacy = parseBackgroundSceneV2(JSON.stringify(legacy));
assert(staleLegacy.ok);
if (staleLegacy.ok) {
  assert.equal(staleLegacy.scene.tracks[0].segments[0].asset.url, "/assets/bg/test/desert/desert_far_mesas.png");
  assert.equal(staleLegacy.scene.tracks[0].objects[1].asset.url, "/assets/bg/test/desert/desert_clouds.png");
  const roundTrip = JSON.parse(serializeBackgroundSceneV2(staleLegacy.scene));
  assert.deepEqual(roundTrip.tracks[0].segments[0].asset, { id: "desert_far_mesas" });
  assert.deepEqual(roundTrip.tracks[0].objects[1].asset, { id: "desert_clouds" });
}

for (const legacyUrl of [undefined, "/old/location/missing.png"]) {
  const unknown = structuredClone(persisted);
  unknown.tracks[0].segments[0].asset = { id: "missing-asset", ...(legacyUrl ? { url: legacyUrl } : {}) };
  const result = parseBackgroundSceneV2(JSON.stringify(unknown));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /tracks\[0\]\.segments\[0\]\.asset\.id: unknown Asset ID "missing-asset"/);
}

assert(json.includes('"starfield"') === false);
assert(!json.includes("selection"));
assert.equal(parseBackgroundSceneV2("{").ok, false);
assert.equal(parseBackgroundSceneV2(JSON.stringify({ ...persisted, version: 1 })).ok, false);
assert.equal(parseBackgroundSceneV2(JSON.stringify({ ...persisted, environment: { starfield: { seed: 1, density: 2 } } })).ok, false);
const duplicate = structuredClone(scene); duplicate.tracks[1].id = duplicate.tracks[0].id; assert.equal(validateBackgroundSceneV2(duplicate).valid, false);
const badGeometry = structuredClone(scene); badGeometry.tracks[1].segments[0].widthPx = 0; assert.equal(validateBackgroundSceneV2(badGeometry).valid, false);
const badCrop = structuredClone(scene); badCrop.tracks[1].segments[0].cropLeftPx = -1; assert.equal(validateBackgroundSceneV2(badCrop).valid, false);
const outOfBoundsCrop = structuredClone(scene); outOfBoundsCrop.tracks[1].segments[0].cropLeftPx = 1; assert.equal(validateBackgroundSceneV2(outOfBoundsCrop).valid, false);
console.log("BackgroundV2Serialization.smoke: PASS");
