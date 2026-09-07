import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateBackgroundScene } from "./BackgroundV2Evaluator";
import { parseBackgroundSceneV2, serializeBackgroundSceneV2 } from "./BackgroundV2Serialization";
import type { BackgroundSceneV2 } from "./BackgroundV2Types";
import { validateBackgroundSceneV2 } from "./BackgroundV2Validation";
import { materializeBackgroundFrameCommands } from "../../webgl/bg/v2/BackgroundV2RenderCommands";

const backdrop = { enabled: true, asset: { id: "fixed", url: "/fixed.png" }, x: 0, y: -180, width: 896, opacity: 1, blend: "normal" as const };
const scene: BackgroundSceneV2 = { version: 2, id: "static", environment: {}, staticBackdrop: backdrop, tracks: [] };
assert.equal(validateBackgroundSceneV2(scene).valid, true);
assert.equal(validateBackgroundSceneV2({ ...scene, staticBackdrop: undefined }).valid, true, "optional field remains backward compatible");
const noTrackFields = scene.staticBackdrop as unknown as Record<string, unknown>;
for (const field of ["parallax", "startTrackX", "localZ", "role", "mode", "segments", "objects"]) assert.equal(field in noTrackFields, false);

const contexts = [
  { playerWorldX: 0, cameraScrollX: 0, cameraScrollY: 0, viewportWidth: 896, viewportHeight: 504 },
  { playerWorldX: 9000, cameraScrollX: 8000, cameraScrollY: 700, viewportWidth: 896, viewportHeight: 504 },
];
const frames = contexts.map(context => evaluateBackgroundScene(scene, context));
assert.deepEqual(frames.map(frame => [frame.staticBackdrop?.x, frame.staticBackdrop?.y]), [[0, -180], [0, -180]], "camera and player position never project screen-space geometry");
assert.deepEqual(materializeBackgroundFrameCommands(frames[0], { playerWorldX: 0 }).staticBackdrop?.repeat, { x: false, y: false });
assert.equal("sourceTrackId" in materializeBackgroundFrameCommands(frames[0], { playerWorldX: 0 }).staticBackdrop!, false, "dedicated command has no pseudo track identity");
assert.equal(evaluateBackgroundScene({ ...scene, staticBackdrop: { ...backdrop, enabled: false } }, contexts[0]).staticBackdrop, undefined, "disabled backdrop does not render");

const parsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(scene));
assert(parsed.ok); if (parsed.ok) assert.deepEqual(parsed.scene, scene, "present backdrop round-trips");
const legacy: BackgroundSceneV2 = { version: 2, id: "legacy", environment: {}, tracks: [] };
const legacyParsed = parseBackgroundSceneV2(serializeBackgroundSceneV2(legacy));
assert(legacyParsed.ok); if (legacyParsed.ok) assert.deepEqual(legacyParsed.scene, legacy, "absent backdrop round-trips");
const renderer = readFileSync(new URL("../../webgl/WebGLSceneRenderer.ts", import.meta.url), "utf8");
const starfieldDraw = renderer.indexOf("this.starfieldBackgroundV2.draw");
const backdropDraw = renderer.indexOf("this.spriteBackgroundV2.draw([v2Commands.staticBackdrop]");
const behindDraw = renderer.indexOf("this.spriteBackgroundV2.draw(v2Commands.behindGameplay");
const foregroundDraw = renderer.indexOf("this.spriteBackgroundV2.draw(v2Commands.foreground");
assert(starfieldDraw < backdropDraw && backdropDraw < behindDraw && behindDraw < foregroundDraw, "render source orders Environment, Static Bgr, tracks/gameplay, then foreground");
assert.match(renderer, /retainCommands\(\[\.\.\.\(v2Commands\.staticBackdrop/, "backdrop resource participates in frame retention");
console.log("BackgroundV2StaticBackdrop.smoke: PASS");
