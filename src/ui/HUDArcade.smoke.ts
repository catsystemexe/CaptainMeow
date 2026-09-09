import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createHudBombFlashController, createHudBombSnapController, createHudEnergyFlashController, createHudEnergyShakeController, createHudScorePopController, createHudWaveFlashController, createHudWavePopController, createHudWeaponSnapController, detectHudWeaponChanges, getHudWeaponLevels, getHudWeaponPresentationSnapshot, isHudBombChange, isHudEnergyDecrease, isHudEnergyHeal, isHudScoreIncrease, isHudWaveIncrease, normalizeHudBombCount, normalizeHudWave, triggerHudBombEffects, triggerHudHitEffects, triggerHudWaveEffects } from "./HUDArcade";

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
assert.equal(isHudBombChange(undefined, 2), false, "first bomb count establishes a baseline");
assert.equal(isHudBombChange(2, 2), false, "unchanged bomb count does not trigger");
assert.equal(isHudBombChange(2, 3), true, "bomb pickup triggers");
assert.equal(isHudBombChange(3, 2), true, "bomb use triggers");
assert.equal(isHudBombChange(1, 0), true, "using the last bomb triggers");
assert.equal(isHudBombChange(0, 1), true, "pickup from empty triggers");
assert.equal(isHudBombChange(2, 3, { scoreReset: true }), false, "score reset suppresses BOMB");
assert.equal(isHudBombChange(2, 3, { livesChanged: true }), false, "lives transition suppresses BOMB");
assert.equal(normalizeHudBombCount(2.9), 2, "bomb counts normalize to whole inventory units");
assert.equal(normalizeHudBombCount(-3), 0, "bomb counts normalize to a non-negative value");
assert.equal(normalizeHudBombCount(Number.NaN), 0, "invalid bomb counts normalize safely");
assert.equal(isHudWaveIncrease(undefined, 1), false, "first wave establishes a baseline");
assert.equal(isHudWaveIncrease(1, 1), false, "unchanged wave does not trigger");
assert.equal(isHudWaveIncrease(1, 2), true, "wave increase triggers");
assert.equal(isHudWaveIncrease(2, 3), true, "each subsequent wave increase triggers");
assert.equal(isHudWaveIncrease(3, 2), false, "wave decrease does not trigger");
assert.equal(isHudWaveIncrease(5, 1), false, "wave reset does not trigger");
assert.equal(isHudWaveIncrease(0, 1), true, "a real zero baseline can trigger");
assert.equal(normalizeHudWave(2.9), 2, "waves normalize to integer presentation values");
assert.equal(normalizeHudWave(-3), 0, "waves normalize to non-negative values");
assert.equal(normalizeHudWave(Number.NaN), 0, "invalid waves normalize safely");

{
  type RecordedAnimation = { cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions; cancel(): void };
  const popAnimations: RecordedAnimation[] = [];
  const flashAnimations: RecordedAnimation[] = [];
  const node = (animations: RecordedAnimation[]) => ({ animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation: RecordedAnimation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
    animations.push(animation);
    return animation as unknown as Animation;
  } });
  const pop = createHudWavePopController(node(popAnimations));
  const flash = createHudWaveFlashController(node(flashAnimations));
  pop.trigger(-1);
  assert(popAnimations[0].keyframes.every((frame) => frame.transform === "scale(1, 1)"), "zero WAVE POP is neutral");
  assert(popAnimations[0].keyframes.every((frame) => frame.filter === undefined && frame.opacity === undefined), "WAVE POP is transform-only");
  pop.trigger(Number.NaN);
  assert.equal(popAnimations[0].cancelCalls, 1, "WAVE POP retrigger cancels prior POP");
  assert.match(String(popAnimations[1].keyframes[1].transform), /^scale\(1\.19, 1\.14/, "nonfinite WAVE POP intensity uses the established midpoint fallback");
  pop.trigger(2);
  assert.equal(popAnimations[2].keyframes[1].transform, "scale(1.38, 1.28)", "maximum WAVE POP is strong");
  assert.equal(popAnimations[2].options.duration, 290, "WAVE POP duration is bounded");
  assert.equal(popAnimations[2].keyframes.at(-1)?.transform, "scale(1, 1)", "WAVE POP settles exactly");

  flash.trigger(-1);
  assert(flashAnimations[0].keyframes.every((frame) => frame.filter === flashAnimations[0].keyframes[0].filter), "zero WAVE FLASH is neutral");
  assert(flashAnimations[0].keyframes.every((frame) => frame.transform === undefined && frame.opacity === undefined), "WAVE FLASH is filter-only");
  flash.trigger(0.5);
  assert.equal(flashAnimations[0].cancelCalls, 1, "WAVE FLASH retrigger cancels prior FLASH");
  assert.match(String(flashAnimations[1].keyframes[1].filter), /rgba\(70,225,255/, "WAVE FLASH has a cyan and white identity");
  flash.trigger(2);
  assert.match(String(flashAnimations[2].keyframes[1].filter), /brightness\(2\.6\) saturate\(1\.4\)/, "maximum WAVE FLASH has a strong ignition");
  assert.equal(flashAnimations[2].options.duration, 240, "WAVE FLASH duration is bounded");
  assert.equal(flashAnimations[2].keyframes.at(-1)?.filter, flashAnimations[2].keyframes[0].filter, "WAVE FLASH settles exactly");
  assert.equal(popAnimations[2].cancelCalls, 0, "WAVE FLASH does not cancel WAVE POP");

  const settings = { pop: { enabled: true, intensity: 0.3 }, flash: { enabled: true, intensity: 0.8 } } as ReturnType<typeof import("../dev/HudFxLabState").loadHudFxLabState>["events"]["wave"];
  const calls: string[] = [];
  triggerHudWaveEffects(settings, { trigger: (intensity) => { calls.push(`pop:${intensity}`); return {} as Animation; } }, { trigger: (intensity) => { calls.push(`flash:${intensity}`); return {} as Animation; } });
  assert.deepEqual(calls, ["pop:0.3", "flash:0.8"], "one WAVE event dispatches independent POP then FLASH effects");
  calls.length = 0;
  triggerHudWaveEffects({ ...settings, pop: { ...settings.pop, enabled: false }, flash: { ...settings.flash, enabled: false } }, { trigger: () => { calls.push("pop"); return {} as Animation; } }, { trigger: () => { calls.push("flash"); return {} as Animation; } });
  assert.deepEqual(calls, [], "disabled WAVE effects do not dispatch");
}
assert.match(hudSource, /wave\.style\.transformOrigin = "center center"/, "WAVE POP uses the numeric node's centered origin");
assert(hudSource.indexOf("refs.wave.textContent") < hudSource.indexOf("if (isHudWaveIncrease(previousWave, currentWave))"), "new wave text renders before WAVE FX dispatch");
assert(hudSource.indexOf("triggerHudWaveEffects(waveFx, wavePop, waveFlash)") < hudSource.indexOf("previousWave = currentWave"), "wave baseline updates after dispatch");
assert.match(hudSource, /const waveFx = loadHudFxLabState\(localStorage\)\.events\.wave;/, "legitimate WAVE loads one configuration snapshot");
assert(!hudSource.includes("s.wave ="), "HUD WAVE reactions do not mutate session wave state");

{
  const animations: Array<{ cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  const node = { animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
    animations.push(animation);
    return animation as unknown as Animation;
  } };
  const snap = createHudBombSnapController(node);
  snap.trigger(-1);
  assert(animations[0].keyframes.every((frame) => frame.filter === undefined && frame.opacity === undefined), "BOMB SNAP is transform-only");
  assert(animations[0].keyframes.every((frame) => frame.transform === "translateY(0px) scale(1, 1)"), "zero BOMB SNAP is neutral");
  snap.trigger(0.5);
  assert.equal(animations[0].cancelCalls, 1, "BOMB SNAP retrigger cancels its prior animation");
  assert.equal(animations[1].keyframes[1].transform, "translateY(-1.75px) scale(1.11, 0.95)", "BOMB SNAP midpoint is meaningful");
  snap.trigger(2);
  assert.equal(animations[2].keyframes[1].transform, "translateY(-3.5px) scale(1.22, 0.9)", "BOMB SNAP maximum is strong");
  assert.equal(animations[2].options.duration, 200, "BOMB SNAP duration is bounded");
  assert.equal(animations[2].keyframes.at(-1)?.transform, "translateY(0px) scale(1, 1)", "BOMB SNAP settles exactly");
  const envelope = animations[2].keyframes.map((frame) => frame.transform);
  snap.trigger(1);
  assert.deepEqual(animations[3].keyframes.map((frame) => frame.transform), envelope, "BOMB SNAP is deterministic");
}

{
  const animations: Array<{ cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  const node = { animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = { cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
    animations.push(animation);
    return animation as unknown as Animation;
  } };
  const flash = createHudBombFlashController(node);
  flash.trigger(-1);
  assert(animations[0].keyframes.every((frame) => frame.transform === undefined && frame.opacity === undefined), "BOMB FLASH is filter-only");
  assert.equal(animations[0].keyframes[1].filter, animations[0].keyframes[0].filter, "zero BOMB FLASH is neutral");
  flash.trigger(0.5);
  assert.equal(animations[0].cancelCalls, 1, "BOMB FLASH retrigger cancels its prior animation");
  assert.match(String(animations[1].keyframes[1].filter), /brightness\(1\.85\).*rgba\(255,102,0,0\.45\)/, "BOMB FLASH midpoint is meaningful and orange");
  flash.trigger(2);
  assert.match(String(animations[2].keyframes[1].filter), /brightness\(2\.7\) saturate\(1\.5\).*rgba\(255,244,190,1\).*rgba\(255,102,0,0\.9\)/, "BOMB FLASH maximum has white-hot orange ignition");
  assert.equal(animations[2].options.duration, 240, "BOMB FLASH duration is bounded");
  assert.equal(animations[2].keyframes.at(-1)?.filter, animations[2].keyframes[0].filter, "BOMB FLASH settles exactly");
  const envelope = animations[2].keyframes.map((frame) => frame.filter);
  flash.trigger(1);
  assert.deepEqual(animations[3].keyframes.map((frame) => frame.filter), envelope, "BOMB FLASH is deterministic");
}

{
  const calls: string[] = [];
  const animation = {} as Animation;
  const snap = { trigger: (intensity: number) => { calls.push(`snap:${intensity}`); return animation; } };
  const flash = { trigger: (intensity: number) => { calls.push(`flash:${intensity}`); return animation; } };
  const bomb = { pop: { enabled: false, intensity: 0.5 }, shake: { enabled: false, intensity: 0.5 }, flash: { enabled: false, intensity: 0.8 }, ghost: { enabled: false, intensity: 0.5 }, glitch: { enabled: false, intensity: 0.5 }, snap: { enabled: true, intensity: 0.2 } };
  triggerHudBombEffects(bomb, snap, flash);
  assert.deepEqual(calls, ["snap:0.2"], "BOMB dispatch supports SNAP only");
  bomb.snap.enabled = false; bomb.flash.enabled = true;
  triggerHudBombEffects(bomb, snap, flash);
  assert.deepEqual(calls.slice(1), ["flash:0.8"], "BOMB dispatch supports FLASH only");
  bomb.snap.enabled = true;
  triggerHudBombEffects(bomb, snap, flash);
  assert.deepEqual(calls.slice(2), ["snap:0.2", "flash:0.8"], "one BOMB event dispatches both enabled effects");
  bomb.snap.enabled = false; bomb.flash.enabled = false;
  triggerHudBombEffects(bomb, snap, flash);
  assert.equal(calls.length, 4, "BOMB dispatch does nothing when both effects are disabled");
}

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
  assert.equal(animations[3].keyframes[1].filter, "brightness(1) saturate(1) drop-shadow(0 0 0px rgba(235,255,248,0)) drop-shadow(0 0 0px rgba(80,255,225,0))", "HEAL FLASH intensity clamps to an effectively neutral ignition");
  assert.equal(animations[3].options.duration, 140, "HEAL FLASH minimum duration remains bounded");
  assert.equal(animations[4].keyframes[1].filter, "brightness(2.8) saturate(1.6) drop-shadow(0 0 4px rgba(235,255,248,1)) drop-shadow(0 0 11px rgba(80,255,225,0.85))", "HEAL FLASH reaches the stronger maximum ignition");
  assert.equal(animations[4].keyframes[1].offset, 0.2, "HEAL FLASH ignition timing stays early");
  assert.equal(animations[4].keyframes[2].filter, "brightness(1.5) saturate(1.3) drop-shadow(0 0 6px rgba(80,255,238,0.65))", "HEAL FLASH retains a visible secondary pulse");
  assert.equal(animations[4].keyframes[2].offset, 0.53, "HEAL FLASH secondary timing stays near the midpoint");
  assert.equal(animations[4].options.duration, 250, "HEAL FLASH maximum duration remains bounded");
  assert.equal(animations[4].keyframes.at(-1)?.filter, "brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))", "HEAL FLASH settles exactly to its filter baseline");
  assert(animations[4].keyframes.every((frame) => frame.transform === undefined), "HEAL FLASH keyframes are filter-only");
  assert.notDeepEqual(animations[4].keyframes.map((frame) => frame.filter), firstEnvelope, "HEAL FLASH palette and envelope differ from HIT FLASH");
  const healEnvelope = animations[4].keyframes.map((frame) => frame.filter);
  flash.trigger(1, "heal");
  assert.deepEqual(animations[5].keyframes.map((frame) => frame.filter), healEnvelope, "HEAL FLASH keyframes are deterministic");
  flash.trigger(0.5, "heal");
  assert.equal(animations[6].keyframes[1].filter, "brightness(1.9) saturate(1.3) drop-shadow(0 0 2px rgba(235,255,248,0.5)) drop-shadow(0 0 5.5px rgba(80,255,225,0.425))", "HEAL FLASH intensity uses direct scaling at the midpoint");
  assert.equal(animations[6].options.duration, 195, "HEAL FLASH duration uses direct scaling at the midpoint");
}
assert.match(hudSource, /createHudEnergyFlashController\(energy\)/, "stable hudEnergy node owns FLASH");
assert.match(hudSource, /const hit = loadHudFxLabState\(localStorage\)\.events\.hit;/, "real HIT loads one configuration snapshot independent of editor selection");
assert.match(hudSource, /const flash = loadHudFxLabState\(localStorage\)\.events\.heal\.flash;/, "real HEAL reads HEAL FLASH independent of editor selection");
assert.match(hudSource, /isHudEnergyHeal\(previousEnergy, energyVal,[\s\S]*?loadHudFxLabState\(localStorage\)\.events\.heal\.flash/, "HEAL configuration is loaded only after a legitimate HEAL is detected");
assert(hudSource.indexOf("segment.style.boxShadow") < hudSource.indexOf("if (isHudEnergyDecrease(previousEnergy, energyVal))"), "energy segment DOM state updates before HIT or HEAL dispatch");
assert.match(hudSource, /energyFlash\.trigger\(flash\.intensity, "heal"\)/, "real HEAL dispatches the HEAL FLASH variant");
assert(!hudSource.includes("player.energy ="), "HUD reactions do not mutate gameplay energy");

{
  const baseline = getHudWeaponPresentationSnapshot({ weapons: { slots: {
    w1: { weaponId: "w1.basic", level: 1 },
    w2: { weaponId: "w2.laser", level: 2 },
  } } });
  assert.deepEqual(detectHudWeaponChanges(undefined, baseline), { w1: false, w2: false }, "first weapon snapshot only establishes a baseline");
  assert.deepEqual(detectHudWeaponChanges(baseline, baseline), { w1: false, w2: false }, "unchanged weapon slots do not trigger");
  assert.deepEqual(detectHudWeaponChanges(baseline, { ...baseline, w1: { ...baseline.w1, level: 2 } }), { w1: true, w2: false }, "W1 level increase targets W1 only");
  assert.deepEqual(detectHudWeaponChanges(baseline, { ...baseline, w2: { ...baseline.w2, level: 3 } }), { w1: false, w2: true }, "W2 level increase targets W2 only");
  assert.deepEqual(detectHudWeaponChanges(baseline, { ...baseline, w1: { ...baseline.w1, weaponId: "w1.spread" } }), { w1: true, w2: false }, "W1 weapon ID change targets W1 only");
  assert.deepEqual(detectHudWeaponChanges(baseline, { ...baseline, w2: { ...baseline.w2, weaponId: "w2.alt" } }), { w1: false, w2: true }, "W2 weapon ID change targets W2 only");
  assert.deepEqual(detectHudWeaponChanges(baseline, { w1: { ...baseline.w1, level: 1 }, w2: { ...baseline.w2, level: 1 } }), { w1: false, w2: false }, "level decrease alone is suppressed");
  assert.deepEqual(detectHudWeaponChanges(baseline, {
    w1: { ...baseline.w1, level: 2 },
    w2: { ...baseline.w2, weaponId: "w2.alt" },
  }), { w1: true, w2: true }, "material changes in both slots target both");
}

{
  type RecordedAnimation = { slot: "w1" | "w2"; cancelCalls: number; keyframes: Keyframe[]; options: KeyframeAnimationOptions; cancel(): void };
  const animations: RecordedAnimation[] = [];
  const node = (slot: "w1" | "w2") => ({
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation: RecordedAnimation = { slot, cancelCalls: 0, keyframes, options, cancel() { this.cancelCalls++; } };
      animations.push(animation);
      return animation as unknown as Animation;
    },
  });
  const snap = createHudWeaponSnapController({ w1: node("w1"), w2: node("w2") });
  snap.trigger(-1, "w1");
  assert(animations[0].keyframes.every((frame) => frame.filter === undefined && frame.opacity === undefined), "SNAP keyframes use transform only");
  assert(animations[0].keyframes.every((frame) => frame.transform === "translateY(0px) scale(1, 1)"), "zero SNAP intensity is effectively neutral");
  snap.trigger(0.5, "w1");
  assert.equal(animations[0].cancelCalls, 1, "W1 retrigger cancels the previous W1 SNAP");
  assert.equal(animations[1].keyframes[1].transform, "translateY(-1.5px) scale(1.09, 0.96)", "midpoint SNAP intensity scales directly");
  snap.trigger(2, "w1");
  assert.equal(animations[2].keyframes[1].transform, "translateY(-3px) scale(1.18, 0.92)", "maximum SNAP has a strong mechanical kick");
  assert.equal(animations[2].options.duration, 180, "maximum SNAP duration remains bounded");
  assert.equal(animations[2].keyframes.at(-1)?.transform, "translateY(0px) scale(1, 1)", "SNAP settles to its exact transform baseline");
  const maximumEnvelope = animations[2].keyframes.map((frame) => frame.transform);
  snap.trigger(1, "w2");
  assert.equal(animations[2].cancelCalls, 0, "W2 SNAP does not cancel an active W1 SNAP");
  assert.deepEqual(animations[3].keyframes.map((frame) => frame.transform), maximumEnvelope, "SNAP keyframes are deterministic between slots");
  snap.trigger(1, "both");
  assert.deepEqual(animations.slice(-2).map((animation) => animation.slot), ["w1", "w2"], "both SNAP target animates both weapon groups");
}
assert.match(hudSource, /w1Group\.style\.transformOrigin = "center center"/, "W1 SNAP uses a stable local transform origin");
assert.match(hudSource, /w2Group\.style\.transformOrigin = "center center"/, "W2 SNAP uses a stable local transform origin");
assert(hudSource.indexOf("refs.w2Level.textContent") < hudSource.indexOf("const changedWeaponSlots = detectHudWeaponChanges"), "new weapon presentation renders before SNAP dispatch");
assert.match(hudSource, /if \(changedWeaponSlots\.w1 \|\| changedWeaponSlots\.w2\) \{\s*const snap = loadHudFxLabState\(localStorage\)\.events\.weapon\.snap;/, "weapon configuration loads once and only after a legitimate transition");
assert.match(hudSource, /weaponSnap\.trigger\(snap\.intensity, target\)/, "runtime SNAP targets only materially changed slots");
assert.match(hudSource, /request\.eventId === "weapon" && request\.effectId === "snap"\) weaponSnap\.trigger\(request\.intensity, "both"\)/, "WPN SNAP preview targets both weapon groups");
assert(!hudSource.includes("selectedEvent"), "runtime HUD reactions remain independent of editor selection");
assert.match(hudSource, /bombGroup\.style\.transformOrigin = "center center"/, "BOMB SNAP uses the local bomb group origin");
assert(hudSource.indexOf("refs.bomb.innerHTML") < hudSource.indexOf("if (isHudBombChange(previousBombs, b"), "current bomb DOM renders before BOMB dispatch");
assert.match(hudSource, /if \(isHudBombChange\(previousBombs, b, \{ scoreReset, livesChanged \}\)\) \{\s*const bomb = loadHudFxLabState\(localStorage\)\.events\.bomb;\s*triggerHudBombEffects\(bomb, bombSnap, bombFlash\);\s*\}\s*previousBombs = b;/, "BOMB config loads once after detection and baseline updates after dispatch");
assert.match(hudSource, /request\.eventId === "bomb" && request\.effectId === "snap"\) bombSnap\.trigger/, "BOMB SNAP uses the existing preview handler");
assert.match(hudSource, /request\.eventId === "bomb" && request\.effectId === "flash"\) bombFlash\.trigger/, "BOMB FLASH uses the existing preview handler");

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
