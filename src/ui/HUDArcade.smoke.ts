import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createHudScorePopController, getHudWeaponLevels, isHudScoreIncrease } from "./HUDArcade";

const hudSource = readFileSync(new URL("./HUDArcade.ts", import.meta.url), "utf8");
for (const obsoleteOuterScaling of [
  "scaleHud",
  "window.innerWidth / 1280",
  "window.innerHeight / 720",
  "layer.style.transform =",
]) {
  assert(!hudSource.includes(obsoleteOuterScaling), `${obsoleteOuterScaling} outer scaling is removed`);
}
for (const rectAssignment of ["left = `${x}px`", "top = `${y}px`", "width = `${w}px`", "height = `${h}px`"]) {
  assert(hudSource.includes(`refs.layer.style.${rectAssignment}`), `setRect assigns ${rectAssignment}`);
}
for (const sizeConstant of [
  "const EDGE_INSET_X = 7",
  "const EDGE_INSET_Y = 6",
  "const LABEL_FONT_SIZE = 10",
  "const WEAPON_TEXT_SIZE = 10",
  "width:14px;height:11px",
  "font-size:19px",
  "font-size:13px",
  "width:17px;height:9px",
  "width:29px;height:4px",
  "height:19px",
  "height:14px",
  "font-size:9px",
]) {
  assert(hudSource.includes(sizeConstant), `${sizeConstant} approved HUD sizing remains present`);
}
for (const frameAsset of ["energy_icon.png", "score_icon.png", "wave_icon.png", "w_icon_box.png"]) {
  assert(!hudSource.includes(frameAsset), `${frameAsset} is not referenced by the active HUD`);
}
assert(!hudSource.includes("function mkFrame"), "the obsolete frame helper is removed");
for (const label of ['"ENERGY"', '"WAVE"', '"SCORE"']) {
  assert(hudSource.includes(`textContent = ${label}`), `${label} is an explicit DOM label`);
}
for (const label of ["W1", "W2", "B"]) {
  assert(hudSource.includes(`, "${label}");`), `${label} is an explicit weapon-group label`);
}
assert(hudSource.includes("Array.from({ length: 6 }"), "six energy segments are constructed once");
assert(hudSource.includes("refs.energySegments.length"), "persistent energy segments are updated individually");
assert(!hudSource.includes("refs.energy.innerHTML"), "energy updates do not rebuild segment markup");
assert.equal(isHudScoreIncrease(undefined, 100), false, "first score establishes a baseline");
assert.equal(isHudScoreIncrease(100, 100), false, "unchanged score does not trigger");
assert.equal(isHudScoreIncrease(100, 110), true, "score increase triggers");
assert.equal(isHudScoreIncrease(110, 0), false, "score reset does not trigger");

{
  const animations: Array<{ cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  const scoreNode = {
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
      animations.push(animation);
      return animation as unknown as Animation;
    },
  };
  const pop = createHudScorePopController(scoreNode);
  pop.trigger(0.5);
  pop.trigger(1);
  assert.equal(animations.length, 2, "retrigger starts a fresh POP immediately");
  assert.equal(animations[0].cancelCalls, 1, "retrigger cancels the prior POP");
  assert.equal(animations[1].keyframes.at(-1)?.transform, "scale(1, 1)", "POP settles to its transform baseline");
  assert.equal(animations[1].keyframes.at(-1)?.filter, "brightness(1)", "POP settles to its brightness baseline");
}
assert.match(hudSource, /score\.style\.transformOrigin = "right center"/, "stable score node owns the POP origin");
assert.match(hudSource, /loadHudFxLabState\(localStorage\)\.events\.score\.pop/, "real score events read SCORE POP independent of editor selection");

{
  const levels = getHudWeaponLevels({
    weapons: {
      slots: {
        w1: { level: 4, maxLevel: 5 },
        w2: { level: 3, maxLevel: 5 },
      },
    },
  });
  assert.equal(levels.w1Level, 4, "W1 HUD level comes from W1 snapshot");
  assert.equal(levels.w2Level, 3, "W2 HUD level comes from W2 snapshot");
  assert.equal(levels.w1Label, "BOLT", "W1 basic HUD label falls back to BOLT");
}

{
  const levels = getHudWeaponLevels({});
  assert.equal(levels.w1Level, 1, "missing W1 weapon snapshot safely displays level 1");
  assert.equal(levels.w2Level, 1, "missing W2 weapon snapshot safely displays level 1");
}

{
  const player: any = {
    bombs: 1,
    w2: { active: true, charge01: 0.5 },
    weapons: { slots: { w1: { level: 1, maxLevel: 5 }, w2: { level: 2, maxLevel: 5 } } },
  };
  let levels = getHudWeaponLevels(player);
  assert.equal(levels.w1Level, 1, "initial W1 HUD level is visible");
  assert.equal(levels.w2Level, 2, "initial W2 HUD level is visible");
  player.weapons = { slots: { w1: { level: 5, maxLevel: 5 }, w2: { level: 4, maxLevel: 5 } } };
  levels = getHudWeaponLevels(player);
  assert.equal(levels.w1Level, 5, "level changes are visible on the next HUD update");
  assert.equal(levels.w2Level, 4, "W2 level changes are visible on the next HUD update");
  player.weapons = { slots: { w1: { level: 3, maxLevel: 5, weaponId: "w1.spread", displayName: "Spread Gun" }, w2: { level: 4, maxLevel: 5 } } };
  levels = getHudWeaponLevels(player);
  assert.equal(levels.w1Label, "SPREAD", "W1 Spread HUD label is visible");
  assert.equal(player.w2.charge01, 0.5, "W2 charge state remains available");
  assert.equal(player.bombs, 1, "bomb count remains unchanged");
}

console.log("HUDArcade.smoke passed");
