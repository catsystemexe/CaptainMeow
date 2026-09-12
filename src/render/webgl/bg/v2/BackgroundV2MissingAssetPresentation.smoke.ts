import assert from "node:assert/strict";
import { claimMissingAssetWarning, projectMissingAssetPresentation } from "./BackgroundV2MissingAssetPresentation";
import type { BackgroundSpriteDrawCommand } from "./BackgroundV2RenderCommands";
import type { BackgroundStaticBackdropDrawCommand } from "./BackgroundV2RenderCommands";

const object: BackgroundSpriteDrawCommand = { instanceId: "track:object:o", assetId: "missing.object", assetResolved: false, resourceKey: "url:/missing.png", url: "/missing.png", x: 12, y: 34, width: 56, height: 78, opacity: 1, blend: "normal", effectiveZ: 0, sourceTrackId: "track", sourceObjectId: "o", repeat: { x: false, y: false } };
const before = JSON.stringify(object);
assert.deepEqual(projectMissingAssetPresentation(object, "error", false, { width: 800, height: 600 }), [], "GAME suppresses diagnostics");
assert.deepEqual(projectMissingAssetPresentation(object, "loading", true, { width: 800, height: 600 }), [], "pending suppresses diagnostics even for unresolved IDs");
const unresolved = projectMissingAssetPresentation(object, "ready", true, { width: 800, height: 600 });
assert.equal(unresolved[0]?.state, "missing"); assert.equal(unresolved[0]?.instanceKind, "object"); assert.equal(unresolved[0]?.assetId, "missing.object");
assert.deepEqual(unresolved[0]?.bounds, { x: 12, y: 34, width: 56, height: 78 });

const segment: BackgroundSpriteDrawCommand = { ...object, instanceId: "track:segment:s", assetId: "known.segment", assetResolved: true, sourceSegmentId: "s", sourceObjectId: undefined, width: 120, height: undefined, expectedTextureSize: { width: 256, height: 96 } };
const failed = projectMissingAssetPresentation(segment, "error", true, { width: 800, height: 600 }, segment.expectedTextureSize);
assert.equal(failed[0]?.state, "failed"); assert.equal(failed[0]?.instanceKind, "segment"); assert.deepEqual(failed[0]?.bounds, { x: 12, y: 34, width: 120, height: 96 });
const backdrop: BackgroundStaticBackdropDrawCommand = { instanceId: "static-backdrop", assetId: "missing.backdrop", assetResolved: false, resourceKey: "url:/backdrop-missing", url: "/backdrop-missing", x: 0, y: 0, width: 800, height: 600, opacity: 1, blend: "normal", repeat: { x: false, y: false } };
assert.equal(projectMissingAssetPresentation(backdrop, "error", true, { width: 800, height: 600 })[0]?.instanceKind, "static-backdrop");
assert.deepEqual(projectMissingAssetPresentation({ ...object, assetResolved: true }, "ready", true, { width: 800, height: 600 }), [], "valid path unchanged");
const warned = new Set<string>(); assert.equal(claimMissingAssetWarning(warned, object.assetId), true); assert.equal(claimMissingAssetWarning(warned, object.assetId), false); assert.equal(warned.size, 1);
assert.equal(JSON.stringify(object), before, "projection does not mutate scene-derived command");
console.log("BackgroundV2MissingAssetPresentation smoke passed");
