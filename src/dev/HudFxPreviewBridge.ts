import type { HudFxEffectId, HudFxEventId } from "./HudFxLabState";

export type HudFxPreviewRequest = {
  eventId: HudFxEventId;
  effectId: HudFxEffectId;
  intensity: number;
};

type HudFxPreviewHandler = (request: HudFxPreviewRequest) => void;

let activeHandler: HudFxPreviewHandler | undefined;

export function setHudFxPreviewHandler(handler: HudFxPreviewHandler | undefined): void {
  activeHandler = handler;
}

export function requestHudFxPreview(request: HudFxPreviewRequest): void {
  activeHandler?.(request);
}
