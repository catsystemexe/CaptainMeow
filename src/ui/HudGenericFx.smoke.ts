import assert from "node:assert/strict";
import { HUD_FX_EFFECTS } from "../dev/HudFxLabState";
import { createGenericHudFxController } from "./HudGenericFx";

type Recorded = { keyframes: Keyframe[]; options: KeyframeAnimationOptions; cancelCalls: number; cancel(): void };
const animations: Recorded[] = [];
const node = { animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const animation: Recorded = { keyframes, options, cancelCalls: 0, cancel() { this.cancelCalls++; } };
  animations.push(animation); return animation as unknown as Animation;
} };
const fx = createGenericHudFxController(node);
for (const effect of HUD_FX_EFFECTS) {
  const start = animations.length;
  fx.trigger(effect, -1); fx.trigger(effect, Number.NaN); fx.trigger(effect, 2);
  const [zero, midpoint, maximum] = animations.slice(start);
  assert.equal(zero.cancelCalls, 1, `${effect} retrigger cancels its prior animation`);
  assert.equal(midpoint.cancelCalls, 1, `${effect} cancellation is scoped by effect`);
  assert(Number(maximum.options.duration) <= 250, `${effect} duration is bounded`);
  assert.deepEqual(maximum.keyframes.at(-1), zero.keyframes.at(-1), `${effect} returns to its exact baseline`);
  const before = JSON.stringify(maximum.keyframes);
  fx.trigger(effect, 1);
  assert.equal(JSON.stringify(animations.at(-1)?.keyframes), before, `${effect} is deterministic`);
}
const byEffect = Object.fromEntries(HUD_FX_EFFECTS.map((effect, index) => [effect, animations[index * 4]])) as Record<string, Recorded>;
assert(byEffect.ghost.keyframes.every((frame) => frame.opacity !== undefined && frame.clipPath === undefined && frame.filter === undefined), "GHOST owns opacity only");
assert(byEffect.glitch.keyframes.every((frame) => frame.clipPath !== undefined && frame.opacity === undefined), "GLITCH owns clipPath only");
assert(byEffect.flash.keyframes.every((frame) => frame.filter !== undefined && frame.width === undefined && frame.height === undefined), "generic FLASH owns filter and no layout dimensions");
assert.equal(byEffect.glitch.keyframes.at(-1)?.clipPath, "inset(0 0 0 0)");
assert.equal(byEffect.ghost.keyframes.at(-1)?.opacity, 1);
console.log("HudGenericFx smoke passed");
