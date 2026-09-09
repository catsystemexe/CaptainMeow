import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createHudEnergyFlashController, createHudEnergyShakeController, createHudScorePopController, getHudWeaponLevels, isHudEnergyDecrease, isHudEnergyHeal, isHudScoreIncrease, triggerHudHitEffects } from "./HUDArcade";

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
assert.equal(isHudEnergyDecrease(undefined, 5), false, "first energy establishes a baseline");
assert.equal(isHudEnergyDecrease(5, 5), false, "unchanged energy does not trigger");
assert.equal(isHudEnergyDecrease(5, 4), true, "energy decrease triggers HIT");
assert.equal(isHudEnergyDecrease(4, 5), false, "energy increase does not trigger HIT");
assert.equal(isHudEnergyHeal(undefined, 3), false, "first energy establishes a HEAL baseline");
assert.equal(isHudEnergyHeal(3, 3), false, "unchanged energy does not trigger HEAL");
assert.equal(isHudEnergyHeal(4, 3), false, "energy decrease does not trigger HEAL");
assert.equal(isHudEnergyHeal(3, 4), true, "normal energy pickup triggers HEAL");
assert.equal(isHudEnergyHeal(4, 5), true, "positive-to-higher energy triggers HEAL");
assert.equal(isHudEnergyHeal(0, 5), false, "respawn restoration from zero does not trigger HEAL");
assert.equal(isHudEnergyHeal(3, 5, { scoreReset: true }), false, "score reset suppresses HEAL");
assert.equal(isHudEnergyHeal(3, 5, { livesChanged: true }), false, "lives transition suppresses HEAL");

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
  const animations: Array<{ cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  const energyNode = {
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
      animations.push(animation);
      return animation as unknown as Animation;
    },
  };
  const shake = createHudEnergyShakeController(energyNode);
  shake.trigger(-1);
  shake.trigger(2);
  assert.equal(animations.length, 2, "retrigger starts a fresh SHAKE immediately");
  assert.equal(animations[0].cancelCalls, 1, "retrigger cancels the prior SHAKE");
  assert.equal(animations[0].keyframes[1].transform, "translate(0px, 0px)", "SHAKE intensity clamps to zero");
  assert.equal(animations[1].keyframes[1].transform, "translate(-6px, 3px)", "SHAKE intensity clamps to one");
  assert.equal(animations[1].options.duration, 220, "maximum SHAKE duration remains controlled");
  assert.equal(animations[1].keyframes.at(-1)?.transform, "translate(0px, 0px)", "SHAKE settles to its transform baseline");
  const firstEnvelope = animations[1].keyframes.map((frame) => frame.transform);
  shake.trigger(1);
  assert.deepEqual(animations[2].keyframes.map((frame) => frame.transform), firstEnvelope, "SHAKE keyframes are deterministic");
}
assert.match(hudSource, /createHudEnergyShakeController\(energy\)/, "stable hudEnergy node owns SHAKE");

{
  const animations: Array<{ cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  const energyNode = {
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
      animations.push(animation);
      return animation as unknown as Animation;
    },
  };
  const flash = createHudEnergyFlashController(energyNode);
  flash.trigger(-1);
  flash.trigger(2);
  assert.equal(animations[0].cancelCalls, 1, "retrigger cancels the prior FLASH");
  assert.equal(animations[0].keyframes[1].filter, "brightness(1) drop-shadow(0 0 0px rgba(180,255,255,0))", "FLASH intensity clamps to zero");
  assert.equal(animations[1].options.duration, 180, "FLASH maximum duration remains bounded");
  assert.equal(animations[1].keyframes.at(-1)?.filter, "brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))", "FLASH settles exactly to its filter baseline");
  assert(animations[1].keyframes.every((frame) => frame.transform === undefined), "FLASH keyframes are filter-only");
  const firstEnvelope = animations[1].keyframes.map((frame) => frame.filter);
  flash.trigger(1);
  assert.deepEqual(animations[2].keyframes.map((frame) => frame.filter), firstEnvelope, "FLASH keyframes are deterministic");
  flash.trigger(-1, "heal");
  flash.trigger(2, "heal");
  assert.equal(animations[2].cancelCalls, 1, "cross-event FLASH cancels the prior filter animation");
  assert.equal(animations[3].cancelCalls, 1, "HEAL FLASH retrigger cancels the prior filter animation");
  assert.equal(animations[3].keyframes[1].filter, "brightness(1) drop-shadow(0 0 0px rgba(150,255,220,0))", "HEAL FLASH intensity clamps to zero");
  assert.equal(animations[4].options.duration, 200, "HEAL FLASH maximum duration remains bounded");
  assert.equal(animations[4].keyframes.at(-1)?.filter, "brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))", "HEAL FLASH settles exactly to its filter baseline");
  assert(animations[4].keyframes.every((frame) => frame.transform === undefined), "HEAL FLASH keyframes are filter-only");
  assert.notDeepEqual(animations[4].keyframes.map((frame) => frame.filter), firstEnvelope, "HEAL FLASH palette and envelope differ from HIT FLASH");
  const healEnvelope = animations[4].keyframes.map((frame) => frame.filter);
  flash.trigger(1, "heal");
  assert.deepEqual(animations[5].keyframes.map((frame) => frame.filter), healEnvelope, "HEAL FLASH keyframes are deterministic");
}
assert.match(hudSource, /createHudEnergyFlashController\(energy\)/, "stable hudEnergy node owns FLASH");
assert.match(hudSource, /const hit = loadHudFxLabState\(localStorage\)\.events\.hit;/, "real HIT loads one configuration snapshot independent of editor selection");
assert.match(hudSource, /const flash = loadHudFxLabState\(localStorage\)\.events\.heal\.flash;/, "real HEAL reads HEAL FLASH independent of editor selection");
assert.match(hudSource, /isHudEnergyHeal\(previousEnergy, energyVal,[\s\S]*?loadHudFxLabState\(localStorage\)\.events\.heal\.flash/, "HEAL configuration is loaded only after a legitimate HEAL is detected");
assert(hudSource.indexOf("segment.style.boxShadow") < hudSource.indexOf("if (isHudEnergyDecrease(previousEnergy, energyVal))"), "energy segment DOM state updates before HIT or HEAL dispatch");
assert.match(hudSource, /energyFlash\.trigger\(flash\.intensity, "heal"\)/, "real HEAL dispatches the HEAL FLASH variant");
assert(!hudSource.includes("player.energy ="), "HUD reactions do not mutate gameplay energy");

{
  const calls: string[] = [];
  const animation = {} as Animation;
  const shake = { trigger: (intensity: number) => { calls.push(`shake:${intensity}`); return animation; } };
  const flash = { trigger: (intensity: number) => { calls.push(`flash:${intensity}`); return animation; } };
  const hit = { pop: { enabled: false, intensity: 0.5 }, shake: { enabled: true, intensity: 0.2 }, flash: { enabled: false, intensity: 0.8 }, ghost: { enabled: false, intensity: 0.5 }, glitch: { enabled: false, intensity: 0.5 }, snap: { enabled: false, intensity: 0.5 } };
  triggerHudHitEffects(hit, shake, flash);
  assert.deepEqual(calls, ["shake:0.2"], "SHAKE-only HIT triggers SHAKE only");
  hit.shake.enabled = false; hit.flash.enabled = true;
  triggerHudHitEffects(hit, shake, flash);
  assert.deepEqual(calls.slice(1), ["flash:0.8"], "FLASH-only HIT triggers FLASH only");
  hit.shake.enabled = true;
  triggerHudHitEffects(hit, shake, flash);
  assert.deepEqual(calls.slice(2), ["shake:0.2", "flash:0.8"], "one HIT independently triggers both enabled effects");
}

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
