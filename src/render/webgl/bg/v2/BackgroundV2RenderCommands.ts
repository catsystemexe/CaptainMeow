import type { BackgroundV1CompatibilityState } from "../../../bg/v2/BackgroundV1Adapter";
import type { BackgroundRenderInstance, EvaluatedBackgroundFrame, EvaluatedBackgroundStaticBackdrop } from "../../../bg/v2/BackgroundV2Types";
import { clamp01, wrappedTileOrigins } from "../layers/backgroundLayerMath";
import { BACKGROUND_ASSET_DECLARATIONS, resolveAsset } from "../../../../assets/BackgroundAssets";
import { assetId } from "../../../../assets/AssetTypes";

export type BackgroundTextureResourceKey = string;
export type BackgroundTextureMetadata = { width: number; height: number };
export interface BackgroundSpriteDrawCommand {
  instanceId: string;
  assetId: string;
  assetResolved?: boolean;
  expectedTextureSize?: BackgroundTextureMetadata;
  resourceKey: BackgroundTextureResourceKey;
  url: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity: number;
  blend: "normal" | "additive";
  effectiveZ: number;
  flipX?: boolean;
  flipY?: boolean;
  sourceTrackId: string;
  sourceSegmentId?: string;
  sourceObjectId?: string;
  repeat: { x: boolean; y: boolean };
  clip?: { x: number; y: number; width: number; height: number };
}
export interface BackgroundStaticBackdropDrawCommand {
  instanceId: "static-backdrop";
  assetId: string;
  assetResolved: boolean;
  expectedTextureSize?: BackgroundTextureMetadata;
  resourceKey: BackgroundTextureResourceKey;
  url: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity: number;
  blend: "normal" | "additive";
  repeat: { x: false; y: false };
}
export type BackgroundV2DrawCommand = BackgroundSpriteDrawCommand | BackgroundStaticBackdropDrawCommand;

export function normalizeBackgroundTextureUrl(url: string): string {
  const trimmed = url.trim().replace(/\\/g, "/");
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*:\/\/)(.*)$/i);
  return scheme ? scheme[1].toLowerCase() + scheme[2].replace(/\/{2,}/g, "/") : trimmed.replace(/\/{2,}/g, "/");
}

export function backgroundTextureResourceKey(url: string): BackgroundTextureResourceKey {
  return `url:${normalizeBackgroundTextureUrl(url)}`;
}

function repeatFor(instance: BackgroundRenderInstance, compatibility?: BackgroundV1CompatibilityState): { x: boolean; y: boolean } {
  const source = compatibility?.sourceMap.find((entry) => entry.adaptedTrackId === instance.sourceTrackId);
  return { x: source?.repeat?.repeatX === true, y: source?.repeat?.repeatY === true };
}

export function isCompatibilityInstanceActive(instance: BackgroundRenderInstance, compatibility: BackgroundV1CompatibilityState | undefined, playerWorldX: number): boolean {
  const source = compatibility?.sourceMap.find((entry) => entry.adaptedTrackId === instance.sourceTrackId);
  if (!source || source.activation.kind === "global") return true;
  return playerWorldX >= source.activation.startWorldX && playerWorldX < source.activation.startWorldX + source.activation.length;
}

function commandFor(instance: BackgroundRenderInstance, compatibility?: BackgroundV1CompatibilityState): BackgroundSpriteDrawCommand {
  const declaration = BACKGROUND_ASSET_DECLARATIONS.find(({ definition }) => definition.id === instance.asset.id);
  const clip = instance.sourceSegmentId && instance.width !== undefined
    ? { x: instance.screenX, y: 0, width: Math.max(0, instance.width), height: Number.POSITIVE_INFINITY }
    : instance.width !== undefined && instance.height !== undefined
      ? { x: instance.screenX, y: instance.screenY, width: Math.max(0, instance.width), height: Math.max(0, instance.height) }
      : undefined;
  return {
    instanceId: instance.instanceId,
    assetId: instance.asset.id,
    // Compatibility scenes predate catalogue identity, so absence there is not a confirmed missing V2 ID.
    assetResolved: compatibility ? undefined : resolveAsset(assetId(instance.asset.id)) !== null,
    expectedTextureSize: declaration?.background.preparation.nativeSize,
    resourceKey: backgroundTextureResourceKey(instance.asset.url),
    url: normalizeBackgroundTextureUrl(instance.asset.url),
    x: instance.screenX,
    y: instance.screenY,
    width: instance.width,
    height: instance.height,
    opacity: clamp01(instance.opacity, 1),
    blend: instance.blend,
    effectiveZ: instance.effectiveZ,
    flipX: instance.flipX,
    flipY: instance.flipY,
    sourceTrackId: instance.sourceTrackId,
    sourceSegmentId: instance.sourceSegmentId,
    sourceObjectId: instance.sourceObjectId,
    repeat: repeatFor(instance, compatibility),
    clip,
  };
}

export function materializeBackgroundCommands(
  instances: readonly BackgroundRenderInstance[],
  args: { playerWorldX: number; compatibility?: BackgroundV1CompatibilityState },
): BackgroundSpriteDrawCommand[] {
  return instances
    .filter((instance) => isCompatibilityInstanceActive(instance, args.compatibility, args.playerWorldX))
    .map((instance) => commandFor(instance, args.compatibility));
}

function materializeStaticBackdrop(backdrop: EvaluatedBackgroundStaticBackdrop | undefined): BackgroundStaticBackdropDrawCommand | undefined {
  if (!backdrop) return undefined;
  const declaration = BACKGROUND_ASSET_DECLARATIONS.find(({ definition }) => definition.id === backdrop.asset.id);
  return {
    instanceId: "static-backdrop",
    assetId: backdrop.asset.id,
    assetResolved: resolveAsset(assetId(backdrop.asset.id)) !== null,
    expectedTextureSize: declaration?.background.preparation.nativeSize,
    resourceKey: backgroundTextureResourceKey(backdrop.asset.url),
    url: normalizeBackgroundTextureUrl(backdrop.asset.url),
    x: backdrop.x,
    y: backdrop.y,
    width: backdrop.width,
    height: backdrop.height,
    opacity: clamp01(backdrop.opacity, 1),
    blend: backdrop.blend,
    repeat: { x: false, y: false },
  };
}

export function materializeBackgroundFrameCommands(frame: EvaluatedBackgroundFrame, args: { playerWorldX: number; compatibility?: BackgroundV1CompatibilityState }): { staticBackdrop?: BackgroundStaticBackdropDrawCommand; behindGameplay: BackgroundSpriteDrawCommand[]; foreground: BackgroundSpriteDrawCommand[] } {
  return {
    staticBackdrop: materializeStaticBackdrop(frame.staticBackdrop),
    behindGameplay: materializeBackgroundCommands(frame.behindGameplay, args),
    foreground: materializeBackgroundCommands(frame.foreground, args),
  };
}

export function resolveBackgroundCommandTiles(command: BackgroundV2DrawCommand, metadata: BackgroundTextureMetadata | undefined, viewportWidth: number, viewportHeight: number): Array<{ x: number; y: number; width: number; height: number }> {
  const width = command.width ?? metadata?.width;
  const height = command.height ?? metadata?.height;
  if (!width || !height || width <= 0 || height <= 0) return [];
  const xs = command.repeat.x ? wrappedTileOrigins(command.x, width, viewportWidth, 1) : [command.x];
  const ys = command.repeat.y ? wrappedTileOrigins(command.y, height, viewportHeight, 1) : [command.y];
  return ys.flatMap((y) => xs.map((x) => ({ x, y, width, height })));
}

export function activeBackgroundResourceKeys(commands: readonly BackgroundV2DrawCommand[]): Set<BackgroundTextureResourceKey> {
  return new Set(commands.map((command) => command.resourceKey));
}
