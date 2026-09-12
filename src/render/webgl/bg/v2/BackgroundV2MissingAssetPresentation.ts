import { resolveBackgroundCommandTiles, type BackgroundV2DrawCommand, type BackgroundTextureMetadata } from "./BackgroundV2RenderCommands";

export type MissingAssetState = "missing" | "failed";
export interface MissingAssetDiagnostic {
  assetId: string;
  runtimeUrl: string;
  state: MissingAssetState;
  instanceKind: "segment" | "object" | "static-backdrop";
  instanceId: string;
  trackId?: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export function claimMissingAssetWarning(warned: Set<string>, key: string): boolean {
  if (warned.has(key)) return false;
  warned.add(key);
  return true;
}

/** Pure DEV-only projection. Loading and valid resources deliberately produce no diagnostic. */
export function projectMissingAssetPresentation(
  command: BackgroundV2DrawCommand,
  resourceState: "loading" | "ready" | "error",
  devMode: boolean,
  viewport: { width: number; height: number },
  metadata?: BackgroundTextureMetadata,
): MissingAssetDiagnostic[] {
  const state: MissingAssetState | null = resourceState === "loading" ? null : command.assetResolved === false ? "missing" : resourceState === "error" ? "failed" : null;
  if (!devMode || !state) return [];
  const instanceKind = "sourceSegmentId" in command && command.sourceSegmentId ? "segment"
    : "sourceObjectId" in command && command.sourceObjectId ? "object" : "static-backdrop";
  return resolveBackgroundCommandTiles(command, metadata, viewport.width, viewport.height).map((bounds) => ({
    assetId: command.assetId,
    runtimeUrl: command.url,
    state,
    instanceKind,
    instanceId: command.instanceId,
    ...("sourceTrackId" in command ? { trackId: command.sourceTrackId } : {}),
    bounds,
  }));
}
