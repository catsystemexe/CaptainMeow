import type { HudFxEffectId } from "../dev/HudFxLabState";

type Animatable = Pick<HTMLElement, "animate">;

const amountOf = (value: number): number => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;

export function createGenericHudFxController(node: Animatable) {
  const active = new Map<HudFxEffectId, Animation>();
  return {
    trigger(effect: HudFxEffectId, intensity: number): Animation {
      const amount = amountOf(intensity);
      active.get(effect)?.cancel();
      let frames: Keyframe[];
      let duration: number;
      switch (effect) {
        case "pop":
          frames = [{ scale: "1" }, { scale: String(1 + 0.32 * amount), offset: 0.3 }, { scale: String(1 - 0.04 * amount), offset: 0.65 }, { scale: "1" }];
          duration = 140 + 100 * amount; break;
        case "shake": {
          const x = 5 * amount, y = 2.5 * amount;
          frames = [{ translate: "0px 0px" }, { translate: `${-x}px ${y}px` }, { translate: `${x}px ${-y}px` }, { translate: `${-0.5 * x}px ${0.5 * y}px` }, { translate: "0px 0px" }];
          duration = 110 + 90 * amount; break;
        }
        case "flash": {
          const base = "brightness(1) drop-shadow(0 0 0px rgba(0,255,238,0))";
          frames = [{ filter: base }, { filter: `brightness(${1 + 1.4 * amount}) drop-shadow(0 0 ${9 * amount}px rgba(180,255,255,${amount}))`, offset: 0.25 }, { filter: base }];
          duration = 120 + 100 * amount; break;
        }
        case "ghost":
          frames = [{ opacity: 1 }, { opacity: 1 - 0.72 * amount, offset: 0.25 }, { opacity: 1 - 0.2 * amount, offset: 0.5 }, { opacity: 1 - 0.55 * amount, offset: 0.72 }, { opacity: 1 }];
          duration = 150 + 100 * amount; break;
        case "glitch": {
          const cut = 25 * amount;
          frames = [{ clipPath: "inset(0 0 0 0)" }, { clipPath: `inset(${cut}% 0 ${cut * 0.35}% 0)`, offset: 0.2 }, { clipPath: `inset(${cut * 0.2}% 0 ${cut}% 0)`, offset: 0.43 }, { clipPath: `inset(${cut * 0.7}% 0 ${cut * 0.15}% 0)`, offset: 0.68 }, { clipPath: "inset(0 0 0 0)" }];
          duration = 100 + 90 * amount; break;
        }
        case "snap":
          frames = [{ rotate: "0deg" }, { rotate: `${-8 * amount}deg`, offset: 0.25 }, { rotate: `${3 * amount}deg`, offset: 0.58 }, { rotate: "0deg" }];
          duration = 110 + 80 * amount; break;
      }
      const animation = node.animate(frames, { duration, easing: "ease-out" });
      active.set(effect, animation);
      return animation;
    },
  };
}
