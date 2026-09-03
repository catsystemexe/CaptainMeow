import assert from "node:assert/strict";
import { adaptBackgroundSceneV1ToV2 } from "../../../bg/v2/BackgroundV1Adapter";
import { evaluateBackgroundScene } from "../../../bg/v2/BackgroundV2Evaluator";
import type { BackgroundRenderInstance, BackgroundSceneV2 } from "../../../bg/v2/BackgroundV2Types";
import type { BackgroundScene } from "../layers/BackgroundSceneTypes";
import { activeBackgroundResourceKeys, backgroundTextureResourceKey, materializeBackgroundFrameCommands, resolveBackgroundCommandTiles } from "./BackgroundV2RenderCommands";

const context = { playerWorldX: 15, cameraScrollX: 7, cameraScrollY: 3, viewportWidth: 25, viewportHeight: 25 };
const shared = { id: "shared", url: " /assets//stars.png " };
const scene: BackgroundSceneV2 = { version: 2, id: "commands", environment: {}, tracks: [
  { id: "later", name: "later", role: "far", mode: "sequence", enabled: true, parallax: { x: 0, y: 0 }, zBase: 2, segments: [], objects: [{ id: "b", asset: shared, startTrackX: 2, y: 0, localZ: 0, opacity: 2, blend: "normal", enabled: true }] },
  { id: "first", name: "first", role: "near", mode: "sequence", enabled: true, parallax: { x: 0, y: 0 }, zBase: 1, segments: [], objects: [{ id: "a", asset: shared, startTrackX: 1, y: 0, width: 8, height: 9, localZ: 0, opacity: -1, blend: "additive", enabled: true }] },
  { id: "equal", name: "equal", role: "mid", mode: "sequence", enabled: true, parallax: { x: 0, y: 0 }, zBase: 2, segments: [], objects: [{ id: "c", asset: { id: "other", url: "/other.png" }, startTrackX: 3, y: 0, localZ: 0, opacity: 0.5, blend: "normal", enabled: true }] },
  { id: "front", name: "front", role: "foreground", mode: "sequence", enabled: true, parallax: { x: 0, y: 0 }, zBase: -100, segments: [], objects: [{ id: "d", asset: shared, startTrackX: 4, y: 0, localZ: 0, opacity: 1, blend: "normal", enabled: true }] },
] };
const before = JSON.stringify(scene);
const commands = materializeBackgroundFrameCommands(evaluateBackgroundScene(scene, context), { playerWorldX: context.playerWorldX });
assert.deepEqual(commands.behindGameplay.map((c) => c.sourceTrackId), ["first", "later", "equal"], "effective Z and evaluator equal-Z order are retained");
assert.deepEqual(commands.foreground.map((c) => c.sourceTrackId), ["front"], "foreground remains physically separate");
assert.equal(commands.behindGameplay[0].opacity, 0); assert.equal(commands.behindGameplay[1].opacity, 1);
assert.equal(commands.behindGameplay[0].resourceKey, commands.behindGameplay[1].resourceKey, "instances share normalized URL resource identity");
assert.notEqual(commands.behindGameplay[1].resourceKey, commands.behindGameplay[2].resourceKey, "distinct assets have distinct resources");
assert.equal(backgroundTextureResourceKey(shared.url), backgroundTextureResourceKey(shared.url), "resource key is independent of instance id");
assert.deepEqual(resolveBackgroundCommandTiles(commands.behindGameplay[1], undefined, 25, 25), [], "native-size draw waits for metadata");
assert.deepEqual(resolveBackgroundCommandTiles(commands.behindGameplay[0], undefined, 25, 25), [{ x: 1, y: 0, width: 8, height: 9 }], "explicit authored dimensions win");
assert.deepEqual(commands.behindGameplay[0].clip, { x: 1, y: 0, width: 8, height: 9 }, "explicit object geometry establishes a rectangular clip");
assert.deepEqual([...activeBackgroundResourceKeys([...commands.behindGameplay, ...commands.foreground])].sort(), ["url:/assets/stars.png", "url:/other.png"], "retention is deterministic and deduplicated");
assert.equal(JSON.stringify(scene), before, "source V2 scene is not mutated");

const v1: BackgroundScene = { id: "compat", globalLayers: [{ id: "global", kind: "sprite", enabled: true, texture: { url: "/tile.png", filtering: "nearest" }, opacity: 0.6, blend: "normal", parallax: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, repeat: { x: false, y: false } }], markers: [], chunks: [{ id: "chunk", startX: 10, length: 10, layers: [{ id: "xy", kind: "sprite", enabled: true, texture: { url: "/tile.png", filtering: "nearest" }, opacity: 1, blend: "normal", parallax: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, repeat: { x: true, y: true } }], markers: [] }] };
const v1Before = JSON.stringify(v1); const adapted = adaptBackgroundSceneV1ToV2(v1); const evaluated = evaluateBackgroundScene(adapted.scene, context);
const inside = materializeBackgroundFrameCommands(evaluated, { playerWorldX: 15, compatibility: adapted.compatibility }).behindGameplay;
assert.equal(inside.length, 2, "global and active chunk each produce exactly one command");
const global = inside.find((c) => c.sourceTrackId === "v1-global:global")!; const repeated = inside.find((c) => c.sourceTrackId.includes("v1-chunk"))!;
assert.equal(resolveBackgroundCommandTiles(global, { width: 10, height: 10 }, 25, 25).length, 1, "non-repeat has one origin");
assert.equal(resolveBackgroundCommandTiles({ ...repeated, repeat: { x: true, y: false } }, { width: 10, height: 10 }, 25, 25).length, 4, "V1 repeat X materializes");
assert.equal(resolveBackgroundCommandTiles({ ...repeated, repeat: { x: false, y: true } }, { width: 10, height: 10 }, 25, 25).length, 4, "V1 repeat Y materializes");
assert.equal(resolveBackgroundCommandTiles(repeated, { width: 10, height: 10 }, 25, 25).length, 16, "V1 repeat X+Y materializes");
assert.equal(materializeBackgroundFrameCommands(evaluated, { playerWorldX: 20, compatibility: adapted.compatibility }).behindGameplay.length, 1, "exact chunk end excludes prior chunk while global remains eligible");
assert.equal(JSON.stringify(v1), v1Before, "source V1 scene is not mutated");

const instance: BackgroundRenderInstance = { instanceId: "one", asset: { id: "a", url: "/a" }, screenX: 0, screenY: 0, opacity: 1, blend: "normal", effectiveZ: 0, sourceTrackId: "track", sourceObjectId: "object" };
assert.notEqual(backgroundTextureResourceKey(instance.asset.url), instance.instanceId);
console.log("BackgroundV2Renderer smoke passed");
