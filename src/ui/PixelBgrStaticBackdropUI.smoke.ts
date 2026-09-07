import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { setV2StaticBackdropEnabled } from "./PixelBgrV2StaticBackdropEditing";

const scene = createBackgroundV2DesertTestScene();
const disabled = setV2StaticBackdropEnabled(scene, false);
assert(disabled.ok); if (!disabled.ok) throw Error(disabled.error);
assert.equal(disabled.scene.staticBackdrop?.enabled, false);
assert.strictEqual(disabled.scene.tracks, scene.tracks, "track collection is untouched");
assert.strictEqual(disabled.scene.environment, scene.environment, "environment is untouched");
assert.equal(scene.staticBackdrop?.enabled, true, "source remains immutable");
const absent = { ...scene, staticBackdrop: undefined };
const missing = setV2StaticBackdropEnabled(absent, true);
assert.equal(missing.ok, false); assert.strictEqual(missing.scene, absent, "missing backdrop is not auto-created");

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
assert.match(source, /backdropRow\.append\("Static Bgr"\)/, "compact row has the exact visible label");
assert.match(source, /backdrop\?\.asset\.id\?\?"unavailable"/, "asset identity and unavailable state are concise");
assert.match(source, /setV2StaticBackdropEnabled\(scene,!backdrop\.enabled\)/, "eye edits the authoritative enabled field");
assert.match(source, /backdropEye\.disabled=!backdrop/, "absent backdrop cannot be toggled into existence");
console.log("PixelBgrStaticBackdropUI.smoke: PASS");
