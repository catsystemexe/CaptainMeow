import { clearBackgroundPreviewState, getBackgroundScene, getBackgroundSceneV2, getBackgroundState, requestBackgroundMarkerRuntimeReset, setBackgroundScene, setBackgroundSceneV2, subscribeBackgroundState } from "../render/BackgroundState";
import type { BackgroundState } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import { ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, FlipHorizontal2, FlipVertical2, FolderOpen, Lock, Minus, Pause, Pencil, Play, Plus, Power, RotateCcw, Save, Trash2, Unlock, Upload, X, type IconNode } from "lucide";
import { createLucideIcon } from "../dev/ui/lucideIcon";
import type { BackgroundLayer, SpriteBackgroundLayer } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import type { BackgroundMarkerAction } from "../render/webgl/bg/layers/BackgroundMarkerTypes";
import { chunkRuntimeLayerId, globalRuntimeLayerId } from "../render/webgl/bg/layers/BackgroundSceneResolve";
import { chunkMarkerRuntimeId, globalMarkerRuntimeId } from "../render/webgl/bg/layers/BackgroundMarkerResolve";
import { addChunk, addLayer, addMarker, addMarkerAction, assignAssetToSpriteLayer, cloneScene, createDemoScene, deleteChunk, deleteLayer, deleteMarker, deleteMarkerAction, duplicateChunk, duplicateLayer, duplicateMarker, duplicateMarkerAction, layerOwner, markerOwner, moveChunk, moveLayer, moveMarker, moveMarkerAction, nudgeSpriteLayer, roundSpriteOffset, toggleMarker, type LayerOwner, type MarkerOwner, updateChunk, updateLayer, updateMarker, updateMarkerAction, updateSelectedSpriteOffset } from "./PixelBgrLabState";
import { clearDraft, exportBackgroundScene, importBackgroundSceneJson, loadDraft, saveDraft } from "./PixelBgrLabSerialization";
import { validateBackgroundScene } from "./PixelBgrLabValidation";
import { BACKGROUND_ASSET_CATALOG } from "./PixelBgrLabAssets";
import { clientPointToInternalPoint, layerRenderedOrigin, renderedOriginToAuthoredOffset, resolveCanvasViewportRect, type Point } from "./PixelBgrLabCoordinates";
import { stepNumericValue, validationSummaryState, toggleValidationExpanded, type NumericStepOptions } from "./PixelBgrLabNumeric";
import { applyChunkTimelineDrag, chunkEndX, chunkOverlapRanges, chunkTimelineBlocks, clickedTimelineCurrentX, createExactTimelineScale, createTimelineScale, cursorDragCurrentX, DEFAULT_CHUNK_TIMELINE_SNAP_PX, formatTimelineWorldX, isolateTimelinePointerEvent, MIN_CHUNK_TIMELINE_LENGTH, overlapsForChunk, PIXEL_BGR_TIMELINE_ZOOM_LEVELS, sceneTimelineBounds, shouldHandleTimelinePointerEvent, timelineFitZoom, timelineMajorTickInterval, timelinePointerDeltaWorld, timelinePxToWorld, timelineViewportRange, worldToTimelinePx, type ChunkTimelineDragMode, type TimelineScale } from "./PixelBgrTimeline";
import { projectBackgroundV2Timeline, setV2RoleTracksEnabled, v2RoleVisibility, type V2TimelineProjection } from "./PixelBgrV2TimelineProjection";
import { applyV2SegmentDrag, calculateV2SegmentOverlaps, canAuthorV2Segments, createV2Segment, deleteV2Segment, duplicateV2Segment, findV2Segment, findV2Track, updateV2Segment, type V2SegmentDragMode, type V2SegmentEditResult, type V2SegmentPatch } from "./PixelBgrV2SegmentEditing";
import { updateV2TrackParallaxX, V2_PARALLAX_AUTHORING_POLICY, type V2TrackParallaxEditResult } from "./PixelBgrV2TrackParallaxEditing";
import { createV2Object, deleteV2Object, duplicateV2Object, findV2Object, moveV2Object, updateV2Object, type V2ObjectEditResult, type V2ObjectPatch } from "./PixelBgrV2ObjectEditing";
import { screenPointToV2TrackPoint, v2TrackPointToScreen } from "./PixelBgrV2PlacementCoordinates";
import type { BackgroundObject, BackgroundSceneV2, BackgroundSegment, BackgroundTrack } from "../render/bg/v2/BackgroundV2Types";
import { PixelBgrRenderCoordinator } from "./PixelBgrRenderCoordinator";
import { disableV2Starfield, enableV2Starfield, randomizeV2StarfieldSeed, updateV2Starfield, type V2EnvironmentEditResult } from "./PixelBgrV2EnvironmentEditing";
import { clearBackgroundSceneV2, loadBackgroundSceneV2, parseBackgroundSceneV2, saveBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import { createPixelBgrDevWorkspaceShell, PIXEL_BGR_DEV_WORKSPACE_CSS, setPixelBgrWorkspaceDisplayMode, type PixelBgrDevWorkspaceRegions, type PixelBgrDisplayMode } from "./PixelBgrDevWorkspaceLayout";
import { gamePresentationRect, type GamePresentationRect } from "./GamePresentationGeometry";
import { SCENE_LAB_SCENE_CATALOG, type SceneLabCatalogEntry } from "./SceneLabSceneCatalog";
import { setV2StaticBackdropEnabled } from "./PixelBgrV2StaticBackdropEditing";
import { insertV2LaneObject, insertV2LaneSegment, resolveV2LaneInsertTrack } from "./PixelBgrV2LaneInsert";
import { isV2YNudgeTextTarget, nudgeV2SelectionY } from "./PixelBgrV2YNudge";
import { createHudFxLabUI } from "../dev/HudFxLabUI";
import { createUnifiedDevLabHost, type DevLabMode, type UnifiedDevLabHost } from "../dev/UnifiedDevLabHost";
import { createV2SceneEvent, deleteV2SceneEvent, duplicateV2SceneEvent, orderedV2SceneEvents, updateV2SceneEvent, type V2SceneEventEditResult } from "./PixelBgrV2SceneEvents";
import { v2YRailValue, type V2YRailDrag } from "./PixelBgrV2YRail";
import { rememberSceneLabCatalogEntry, resolveSceneLabV2Entry } from "./SceneLabLastScene";
import { v2EntityDisplayName } from "./PixelBgrV2EntityDisplayName";
import { initialV2AssetId, resolveV2PickerAsset, syncV2PickerAssetId } from "./PixelBgrV2AssetPicker";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function button(text: string, fn: () => void): HTMLButtonElement { const b = el("button"); b.type = "button"; b.textContent = text; b.onclick = fn; return b; }
type NumericStepperOptions = NumericStepOptions & { value: number; displayValue?: number; onCommit: (v:number)=>void };
function num(value: number, step: number, fn: (v:number)=>void): HTMLInputElement { const i = el("input"); i.type="number"; i.step=String(step); i.value=String(value); i.onchange=()=>{ const v=Number(i.value); if(Number.isFinite(v)) fn(v); else i.value=String(value); }; i.onkeydown=e=>{ if(e.key==="Enter") i.blur(); if(e.key==="Escape") { i.value=String(value); i.blur(); } }; return i; }
function text(value: string, fn: (v:string)=>void): HTMLInputElement { const i = el("input"); i.value=value; i.oninput=()=>fn(i.value); return i; }
function check(value: boolean, fn: (v:boolean)=>void): HTMLInputElement { const i = el("input"); i.type="checkbox"; i.checked=value; i.oninput=()=>fn(i.checked); return i; }

export type PixelBgrLabTab = "scene" | "chunks" | "layers" | "properties" | "placement" | "markers";
export const PIXEL_BGR_LAB_TABS: readonly PixelBgrLabTab[] = ["scene", "chunks", "layers", "properties", "placement", "markers"] as const;
export const PIXEL_BGR_LEFT_TOOLS: readonly PixelBgrLabTab[] = ["scene", "placement", "markers"] as const;
export const PIXEL_BGR_LAB_TAB_LABELS: Record<PixelBgrLabTab, string> = { scene: "Scene", chunks: "Chunks", layers: "Layers", properties: "Properties", placement: "Placement", markers: "Markers" };
export function normalizePixelBgrLabTab(value: unknown, fallback: PixelBgrLabTab = "scene"): PixelBgrLabTab { return typeof value === "string" && (PIXEL_BGR_LAB_TABS as readonly string[]).includes(value) ? value as PixelBgrLabTab : fallback; }
export function pixelBgrLabTabForSelection(hasSelectedLayer: boolean, selectedLayerKind?: string, placementRequested = false): PixelBgrLabTab { if (placementRequested && selectedLayerKind === "sprite") return "placement"; return hasSelectedLayer ? "properties" : "scene"; }
export function pixelBgrLabTabAfterLayerDelete(current: PixelBgrLabTab, hasSelectedLayer: boolean): PixelBgrLabTab { return hasSelectedLayer ? current : current === "properties" || current === "placement" ? "layers" : current; }
export function shouldApplyPixelBgrV1Draft(state: BackgroundState | null): boolean { return state?.source?.kind === "scene"; }
export { PIXEL_BGR_TIMELINE_ZOOM_LEVELS } from "./PixelBgrTimeline";
export type SceneContentsAggregateState = "all" | "none" | "mixed";
export const sceneContentsAggregateState = (values: readonly boolean[]): SceneContentsAggregateState => values.length === 0 ? "none" : values.every(Boolean) ? "all" : values.some(Boolean) ? "mixed" : "none";
type V2RenameTarget = { kind:"segment"|"object"|"event"; trackId?:string; id:string; surface:"timeline"|"tree" };

export class PixelBgrLabUI {
  private root: HTMLDivElement;
  private workspace: PixelBgrDevWorkspaceRegions;
  private displayMode: PixelBgrDisplayMode = "dev";
  private visible = false;
  private draft: BackgroundScene;
  private owner: LayerOwner = { kind: "global" };
  private selectedLayerId = "";
  private selectedMarkerId = "";
  private selectedActionIndex = -1;
  private message = "";
  private unsub: () => void;
  private openListeners = new Set<(open: boolean) => void>();
  private presentationListeners = new Set<() => void>();
  private viewportResizeObserver: ResizeObserver | null = null;
  private visualPlacement = false;
  private pixelSafe = true;
  private nudgeStep = 1;
  private overlay: HTMLDivElement | null = null;
  private timelineDrag: { pointerId: number; chunkId: string; mode: ChunkTimelineDragMode; startClientX: number; startX: number; length: number; scale: TimelineScale; captureTarget: HTMLElement | null; active: boolean } | null = null;
  private v2SelectedTrackId = "";
  private v2SelectedSegmentId = "";
  private v2SelectedObjectId = "";
  private v2SelectedEventId = "";
  private v2SelectedAssetId = initialV2AssetId(BACKGROUND_ASSET_CATALOG);
  private v2PlacementTarget: "segment" | "object" | null = null;
  private v2TimelineZoom = 0.1;
  private v2SegmentDrag: { pointerId:number; trackId:string; segmentId:string; mode:V2SegmentDragMode; startClientX:number; scale:TimelineScale; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; active:boolean } | null = null;
  private v2ObjectDrag: { pointerId:number; trackId:string; objectId:string; startClientX:number; scale:TimelineScale; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; active:boolean } | null = null;
  private v2EventDrag: { pointerId:number; eventId:string; startClientX:number; scale:TimelineScale; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; active:boolean } | null = null;
  private v2YRailDrag: (V2YRailDrag & { kind:"segment"|"object"; trackId:string; itemId:string; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; thumb:HTMLElement|null }) | null = null;
  private v2YRailVisualOffset = 0;
  private cursorDrag: { pointerId: number; scale: TimelineScale; timeline: HTMLElement; minX: number; maxX: number; captureTarget: HTMLElement | null; active: boolean } | null = null;
  private cursorEl: HTMLElement | null = null;
  private v2CursorEl: HTMLElement | null = null;
  private v2ViewportEl: HTMLElement | null = null;
  private v2LastCursorPx: number | null = null;
  private v2LastViewportPx: number | null = null;
  private v2RenderedTimelineScale: TimelineScale | null = null;
  private drag: { pointerId: number; anchor: Point } | null = null;
  private warningsExpanded: boolean | null = null;
  private activeTab: PixelBgrLabTab = "scene";
  private readonly logicW = 896;
  private readonly logicH = 504;
  private readonly renderCoordinator = new PixelBgrRenderCoordinator();
  private enemyLabPanel: HTMLElement | null = null;
  private enemyLabOriginalStyle = "";
  private readonly devLabHost: UnifiedDevLabHost;
  private sceneMenuOpen = false;
  private readonly sceneContentsExpanded = new Set<string>(["SEG", "OBJ", "EVE"]);
  private closeLaneInsertMenu: (() => void) | null = null;
  private closeEntityContextMenu: (() => void) | null = null;
  private v2Rename: V2RenameTarget | null = null;

  constructor() {
    const activeState = getBackgroundState(globalThis);
    this.draft = loadDraft(localStorage) ?? getBackgroundScene(globalThis) ?? createDemoScene();
    if (shouldApplyPixelBgrV1Draft(activeState)) this.applyIfValid();
    this.workspace = createPixelBgrDevWorkspaceShell();
    const workspaceStyle = el("style");
    workspaceStyle.textContent = PIXEL_BGR_DEV_WORKSPACE_CSS;
    const gameLabel = el("span"); gameLabel.textContent = "GAME";
    const modeSwitch = button("", () => this.setDisplayMode(this.displayMode === "dev" ? "game" : "dev"));
    modeSwitch.className = "cm-mode-switch";
    modeSwitch.dataset.mode = "toggle";
    modeSwitch.setAttribute("role", "switch");
    modeSwitch.setAttribute("aria-label", "Use developer presentation mode");
    const devLabel = el("span"); devLabel.textContent = "DEV";
    this.workspace.modeToggle.setAttribute("aria-label", "Presentation mode");
    this.workspace.modeToggle.append(gameLabel, modeSwitch, devLabel);
    this.workspace.root.append(workspaceStyle);
    this.root = el("div", "cm-pixel-bgr-lab");
    this.devLabHost = createUnifiedDevLabHost(this.root, createHudFxLabUI(), document, mode => this.setActiveDevLab(mode));
    this.workspace.leftCanvas.appendChild(this.devLabHost.root);
    this.workspace.root.dataset.activeLab = this.devLabHost.getActive();
    const style = el("style");
    style.textContent = `.cm-bgr-placement-overlay{position:fixed;z-index:100000;pointer-events:none;overflow:hidden;box-sizing:border-box}.cm-bgr-placement-box{position:absolute;border:2px solid #ffe66d;box-sizing:border-box}.cm-bgr-placement-origin{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;background:#ff4d6d;border-radius:50%}.cm-bgr-placement-chunk{position:absolute;top:0;bottom:0;border-left:2px dashed #66e3ff;border-right:2px dashed #66e3ff;background:rgba(102,227,255,.04)}.cm-bgr-placement-label{position:absolute;left:4px;top:4px;color:#eaf6ff;background:rgba(0,0,0,.65);font:12px monospace;padding:2px 4px}.cm-pixel-bgr-lab{position:relative;width:100%;height:100%;background:#040810;color:#eaf6ff;font:11px/1.2 ui-monospace,Menlo,Consolas,monospace;padding:4px;box-sizing:border-box;overflow:visible;display:flex;flex-direction:column;min-height:0;pointer-events:none}.cm-pixel-bgr-lab>:not(style){pointer-events:auto}.cm-pixel-bgr-lab h3{margin:0;color:#8ee8ff}.cm-pixel-bgr-lab button{margin:0;min-height:22px;padding:1px 3px;background:transparent;color:#eaf6ff;border:0;border-radius:0}.cm-pixel-bgr-lab input,.cm-pixel-bgr-lab select,.cm-pixel-bgr-lab textarea{min-height:26px;background:#071521;color:#eaf6ff;border:1px solid #28516d;border-radius:3px;font:inherit;box-sizing:border-box;max-width:100%}.cm-pixel-titlebar{display:block;min-width:0}.cm-pixel-titlebar h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cm-pixel-scene-summary{opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-pixel-tabs{display:flex;flex-direction:column;align-items:flex-start;gap:0;margin:2px 0}.cm-pixel-tab[aria-selected="true"]{color:#fff;text-decoration:underline}.cm-pixel-tab-body{flex:0 0 auto;min-height:0;overflow:visible}.cm-pixel-panel{padding:4px 0;overflow:visible;min-height:0;margin-bottom:4px;box-sizing:border-box}.cm-pixel-props{overflow:visible}.cm-pixel-row{display:flex;gap:3px;flex-wrap:wrap;align-items:center;margin:3px 0;min-width:0}.cm-pixel-row label{min-width:68px;opacity:.78}.cm-pixel-row input,.cm-pixel-row select{flex:1 1 auto;min-width:0}.cm-pixel-list button{display:block;width:100%;text-align:left;margin:1px 0;padding:2px 5px;overflow:hidden;text-overflow:ellipsis}.cm-pixel-list button.sel{background:#235b80}.cm-pixel-msg{white-space:pre-wrap;color:#ffd166;overflow-wrap:anywhere;border:1px solid rgba(255,209,102,.18);border-radius:4px;padding:3px 5px;margin:3px 0}.cm-pixel-summary{width:100%;text-align:left}.cm-pixel-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:4px 0;min-width:0}.cm-pixel-toolbar input{width:min(190px,100%)}.cm-pixel-stepper{display:grid;grid-template-columns:28px minmax(72px,1fr) 28px;gap:3px;align-items:center;width:100%}.cm-pixel-stepper input{width:100%;text-align:right}.cm-pixel-stepper button{min-width:28px;padding:0}.cm-pixel-visual{margin-top:6px;padding-top:5px}.cm-pixel-nudges button{min-width:32px}.cm-pixel-preview{margin-top:5px}.cm-scene-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap}.cm-scene-toolbar input[type=text]{width:min(160px,100%)}.cm-timeline{position:relative;height:138px;border:1px solid rgba(120,220,255,.22);border-radius:6px;margin:6px 0;background:rgba(3,12,22,.78);overflow:hidden;user-select:none}.cm-ruler{position:absolute;left:0;right:0;top:0;height:26px;border-bottom:1px solid rgba(120,220,255,.16)}.cm-ruler-tick{position:absolute;top:0;height:100%;border-left:1px solid rgba(120,220,255,.22);font-size:10px;color:#9fdff2;padding-left:3px}.cm-chunk-line{position:absolute;left:0;right:0;top:42px;height:42px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035)}.cm-chunk-block{position:absolute;top:46px;height:34px;cursor:grab;border:1px solid #52d7ff;border-radius:5px;background:rgba(45,132,180,.72);color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px;box-sizing:border-box;font-size:11px}.cm-chunk-block:hover{filter:brightness(1.18)}.cm-chunk-block.dragging{cursor:grabbing;filter:brightness(1.3)}.cm-chunk-block.sel{border-color:#ffe66d;box-shadow:0 0 0 2px rgba(255,230,109,.28);background:rgba(72,153,211,.9)}.cm-chunk-handle{position:absolute;top:0;bottom:0;width:10px;background:rgba(255,255,255,.22);border:0;padding:0;min-height:0;margin:0}.cm-chunk-handle.left{left:0;cursor:ew-resize}.cm-chunk-handle.right{right:0;cursor:ew-resize}.cm-overlap{position:absolute;top:42px;height:42px;background:repeating-linear-gradient(135deg,rgba(255,75,90,.65),rgba(255,75,90,.65) 4px,rgba(255,75,90,.28) 4px,rgba(255,75,90,.28) 8px);border-left:1px solid #ff4d6d;border-right:1px solid #ff4d6d;pointer-events:none}.cm-marker-row{position:absolute;left:0;right:0;top:96px;height:30px;border-top:1px solid rgba(120,220,255,.16)}.cm-marker-dot{position:absolute;top:6px;width:8px;height:18px;margin-left:-4px;border-radius:4px;background:#a78bfa}.cm-marker-dot.chunk{background:#4ade80}.cm-transport-button{display:inline-grid;place-items:center;min-width:28px;width:28px;padding:0}.cm-transport-button svg{width:16px;height:16px}.cm-mode-pill{padding:2px 6px;border:1px solid rgba(255,209,102,.35);border-radius:999px;color:#ffd166}.cm-current-x{font-weight:700;color:#fff}.cm-cursor{position:absolute;top:0;bottom:0;width:0;border-left:2px solid #45a3ff;pointer-events:auto;cursor:ew-resize}.cm-cursor::after{content:"";position:absolute;top:25px;left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #45a3ff}.cm-chunk-inspector{border-color:rgba(255,230,109,.28)}`
    style.textContent += `.cm-scene-contents{display:flex;flex-direction:column}.cm-scene-tree-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;min-height:22px}.cm-scene-tree-action,.cm-scene-tree-toggle{display:inline-grid;place-items:center;min-width:22px;width:22px;height:22px;min-height:22px!important;padding:0!important}.cm-scene-tree-action svg,.cm-scene-tree-toggle svg{width:15px;height:15px}.cm-scene-tree-action[data-state="mixed"]{opacity:.6}.cm-scene-tree-action[data-state="none"],.cm-scene-tree-action:disabled{opacity:.3}.cm-scene-tree-label{text-align:left!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-scene-tree-meta{display:flex;align-items:center;opacity:.6;font-size:9px}.cm-scene-tree-children{padding-left:24px}.cm-scene-tree-child{display:grid;grid-template-columns:22px minmax(0,1fr) max-content;align-items:center;min-height:20px}.cm-scene-tree-child.cm-scene-tree-event{grid-template-columns:22px 22px minmax(0,1fr) max-content}.cm-scene-tree-child.sel{background:rgba(142,232,255,.14)}.cm-scene-tree-child-label{text-align:left!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-scene-tree-ordinal{text-align:right;padding-right:3px;opacity:.72}`;
    style.textContent += `.cm-v2-entity-toolbar .cm-transport-button{display:inline-grid;width:26px;min-width:26px;height:26px;min-height:26px;padding:0}.cm-v2-entity-toolbar .destructive{color:#ff6b7a}.cm-scene-action-row{position:relative}.cm-scene-delete{margin-left:8px!important;color:#ff6b7a!important;border-left:1px solid rgba(255,107,122,.55)!important;padding-left:8px!important}.cm-scene-menu{position:absolute;z-index:4;top:100%;left:0;min-width:142px;padding:2px;background:#071521;border:1px solid #28516d;box-shadow:0 4px 10px rgba(0,0,0,.45)}.cm-scene-menu button{display:block;width:100%;padding:4px 6px;text-align:left;white-space:nowrap}.cm-scene-menu button:hover,.cm-scene-menu button:focus-visible{background:#163b52;color:#fff}.cm-v2-workspace{flex:1 1 auto;min-height:0;overflow:visible}.cm-v2-inspector{min-width:0;padding:5px 2px;margin:0;border:0;border-radius:0;overflow:visible}.cm-v2-inspector-title{margin:0 0 5px;color:#8ee8ff;font-size:11px;letter-spacing:.04em}.cm-v2-panel{flex:1 0 auto;width:100%;min-width:0;overflow:hidden;display:block;padding:2px 0;margin:0;border:0;border-radius:0;box-sizing:border-box}.cm-v2-timeline-gutter{position:relative;width:100%;height:144px;display:grid;grid-template-rows:20px repeat(4,27px) 16px;overflow:visible;box-sizing:border-box;background:#000}.cm-v2-zoom-controls{display:flex;align-items:center;justify-content:center;gap:4px}.cm-v2-zoom-button,.cm-v2-eye,.cm-v2-lane-add{display:inline-grid;place-items:center;width:24px;min-width:24px;height:24px;min-height:0!important;padding:0!important;background:transparent;border:0;border-radius:0;color:#ddd;appearance:none;-webkit-appearance:none}.cm-v2-zoom-button.cm-v2-fit-button{width:auto;min-width:30px;padding:0 3px!important}.cm-v2-zoom-button:disabled,.cm-v2-eye:disabled{opacity:.35;color:#ddd}.cm-v2-zoom-button svg{width:13px;height:13px;stroke:currentColor}.cm-v2-eye svg{width:19px;height:19px;stroke:currentColor}.cm-v2-lane-add{font-size:27px;font-weight:700;line-height:1}.cm-v2-eye[data-visibility="mixed"]{opacity:.55}.cm-v2-eye[data-visibility="none"]{opacity:.45}.cm-v2-gutter-row{position:relative;height:27px;display:grid;grid-template-columns:minmax(0,1fr) 38px 24px 24px;align-items:center;column-gap:8px;min-width:0;color:#ddd;font-size:10px;white-space:nowrap}.cm-v2-role-label{min-width:0;overflow:hidden;text-overflow:ellipsis}.cm-v2-parallax{width:38px!important;min-width:38px!important;height:18px!important;min-height:18px!important;padding:0 1px!important;border:0!important;background:#000!important;color:#eaf6ff!important;text-align:right;-moz-appearance:textfield}.cm-v2-parallax::-webkit-inner-spin-button,.cm-v2-parallax::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.cm-v2-lane-add-menu{position:fixed;z-index:100002;min-width:72px;padding:2px;background:#071521;border:1px solid #28516d;box-shadow:0 3px 8px rgba(0,0,0,.55);font:11px/1.2 ui-monospace,Menlo,Consolas,monospace}.cm-v2-lane-add-menu button{display:block;width:100%;min-height:20px;padding:2px 5px;border:0;border-radius:0;background:transparent;color:#eaf6ff;text-align:left;white-space:nowrap}.cm-v2-lane-add-menu button:hover,.cm-v2-lane-add-menu button:focus-visible{background:#163b52}.cm-v2-left-block+.cm-v2-left-block{margin-top:0}.cm-v2-spacer{flex:0 0 5px}.cm-v2-left-block{min-width:0}.cm-v2-selected-y{position:absolute;right:0;top:0;width:24px;margin:0;padding:2px 0 0;text-align:center}.cm-v2-y-readout{display:block;color:#8ee8ff;font-size:9px;white-space:nowrap}.cm-v2-selected-y-row .cm-pixel-stepper,.cm-v2-inspector-detail-row .cm-pixel-stepper{grid-template-columns:24px 48px 24px;gap:2px;width:auto}.cm-v2-selected-y-row button{width:24px;min-width:24px;min-height:24px!important;padding:0!important;font-size:20px;font-weight:700;line-height:1}.cm-v2-selected-y-row input,.cm-v2-inspector-detail-row input{width:48px;min-height:20px!important;height:20px;padding:0 2px;text-align:right}.cm-v2-timeline-scroll{width:100%;max-width:100%;height:172px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable;box-sizing:border-box}.cm-v2-panel.has-y-rail{display:grid;grid-template-columns:21px minmax(0,1fr);grid-template-rows:172px;align-items:stretch}.cm-v2-panel.has-y-rail .cm-v2-timeline-scroll{grid-column:2;grid-row:1;width:auto;min-width:0}.cm-v2-panel.has-y-rail .cm-v2-y-rail{grid-column:1}.cm-bgr-workspace-timeline .cm-v2-timeline-scroll{flex:0 0 auto;min-height:0}.cm-v2-timeline{position:relative;height:155px;background:rgba(3,12,22,.78);user-select:none;pointer-events:auto}.cm-v2-ruler{height:20px;border:0;pointer-events:auto}.cm-v2-ruler .cm-ruler-tick{height:14px;font-size:9px;color:#bbb;border-color:rgba(255,255,255,.22);padding-left:2px}.cm-v2-lane{position:absolute;left:0;right:0;box-sizing:border-box;overflow:visible}.cm-v2-lane-label{display:inline-flex;align-items:center;min-width:0;height:23px;color:#ddd;font-size:10px;white-space:nowrap;pointer-events:auto}.cm-v2-lane-track-button{overflow:hidden;text-overflow:ellipsis}.cm-v2-lane-track-select{position:sticky;left:3px;z-index:3;width:min(164px,45%);margin:2px 0 0 3px}.cm-v2-lane-track-button{min-width:0;height:19px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.cm-v2-lane-track-select{min-width:0;max-width:164px;height:19px;padding:0 2px;border:1px solid rgba(255,255,255,.28);border-radius:2px;background:#111;color:#ddd;font:9px ui-monospace,Menlo,Consolas,monospace}.cm-v2-overlap{position:absolute;top:5px;height:16px;background:repeating-linear-gradient(135deg,rgba(194,35,57,.58),rgba(194,35,57,.58) 3px,rgba(255,255,255,.12) 3px,rgba(255,255,255,.12) 6px);pointer-events:none;z-index:3}.cm-v2-segment,.cm-v2-object{position:absolute;top:4px;height:17px;box-sizing:border-box;border:1px solid #aeb6bf;border-radius:2px;background:#f7f8fa;color:#17202a;font-size:9px;line-height:13px;padding:1px 3px;overflow:hidden;text-overflow:clip;white-space:nowrap;pointer-events:none;z-index:2}.cm-v2-segment.readonly{border-color:#d6bd68;background:#fff3bd;color:#332b12}.cm-v2-segment.editable{pointer-events:auto;cursor:grab}.cm-v2-segment-label{position:absolute;top:4px;height:17px;box-sizing:border-box;padding:1px 3px;color:#17202a;font-size:9px;line-height:13px;overflow:hidden;white-space:nowrap;pointer-events:none;z-index:4}.cm-v2-segment.sel,.cm-v2-object.sel{outline:2px solid #ffe66d;outline-offset:1px;box-shadow:0 0 5px rgba(255,230,109,.7)}.cm-v2-segment-handle{position:absolute;top:0;bottom:0;width:6px;background:rgba(20,28,36,.28);z-index:5}.cm-v2-segment-handle.left{left:0;cursor:ew-resize}.cm-v2-segment-handle.right{right:0;cursor:ew-resize}.cm-v2-object{top:6px;height:13px;min-width:8px;border-color:#3f8fc4;background:#65b9ed;color:#102638;line-height:9px}.cm-v2-segment.disabled,.cm-v2-object.disabled{opacity:.35;filter:saturate(.3)}.cm-v2-foreground{background:rgba(255,209,102,.025)}.cm-v2-viewport-range{position:absolute;will-change:transform;top:0;bottom:0;box-sizing:border-box;border-left:1px solid rgba(255,255,255,.65);border-right:1px solid rgba(255,255,255,.65);background:rgba(255,255,255,.055);pointer-events:none;z-index:6}.cm-v2-cursor{top:0;will-change:transform;bottom:0;width:16px;margin-left:-8px;border-left:0;filter:drop-shadow(0 0 2px rgba(0,0,0,.95));z-index:8}.cm-v2-cursor::before{content:"";position:absolute;left:6px;top:0;bottom:0;border-left:4px solid #fff}.cm-v2-event-row{background:rgba(255,255,255,.018)}.cm-v2-event-row::before{content:"";position:absolute;left:0;right:0;top:7px;border-top:1px solid rgba(255,255,255,.32)}.cm-v2-event{position:absolute;top:-4px;min-width:24px;height:24px;padding:4px 4px 4px 20px;transform:translateX(-12px);box-sizing:border-box;border:0;color:#eee;background:transparent;font:10px/16px ui-monospace,monospace;white-space:nowrap;cursor:ew-resize;z-index:7}.cm-v2-event::before{content:"";position:absolute;left:6px;top:7px;width:9px;height:9px;box-sizing:border-box;border:2px solid currentColor;background:#101419;transform:rotate(45deg)}.cm-v2-event.level-end{color:#f0c67a}.cm-v2-event.level-end::before{top:6px;border-width:0 7px 11px;border-style:solid;border-color:transparent transparent currentColor;background:transparent;transform:none}.cm-v2-event.sel::before{background:#fff;box-shadow:0 0 0 2px #101419,0 0 0 3px #fff}.cm-v2-event.disabled{opacity:.4}.cm-v2-events-gutter{grid-template-columns:minmax(0,1fr) 24px}.cm-v2-logic-list{display:flex;flex-direction:column;max-height:116px;overflow-y:auto}.cm-v2-logic-row{display:grid!important;grid-template-columns:20px minmax(0,1fr) max-content;gap:4px;align-items:center;width:100%;min-height:20px!important;height:20px;text-align:left}.cm-v2-logic-row.sel{background:rgba(142,232,255,.14)}.cm-v2-logic-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-v2-logic-type{opacity:.58;font-size:9px}.cm-v2-logic-name-edit{grid-column:2;min-height:18px!important;height:18px;width:100%;padding:0 2px;border:0!important;background:transparent!important}.cm-v2-logic-empty{opacity:.35}.cm-v2-entity-toolbar{position:fixed;z-index:100003;display:flex;gap:2px;padding:3px;background:#071521;border:1px solid #28516d;box-shadow:0 4px 10px rgba(0,0,0,.55)}.cm-v2-entity-toolbar button{border:0;background:transparent;color:#eaf6ff}.cm-v2-entity-toolbar button:hover,.cm-v2-entity-toolbar button:focus-visible{background:#163b52}.cm-v2-entity-toolbar button:disabled{opacity:.35}.cm-v2-timeline-name-edit{position:relative;z-index:9;display:block;width:100%;min-width:88px;height:15px;min-height:15px!important;padding:0 2px!important;border:1px solid #28516d!important;background:#071521!important;color:#eaf6ff!important;font:9px ui-monospace,Menlo,Consolas,monospace;pointer-events:auto;box-sizing:border-box}.cm-v2-inspector-stack{display:grid;gap:3px}.cm-v2-inspector-section{margin:0;padding:0;border:0;background:transparent}.cm-v2-inspector-section .cm-pixel-row{flex-wrap:nowrap;margin:1px 0}.cm-v2-inspector-section .cm-pixel-row label{min-width:auto;white-space:nowrap}.cm-v2-inspector-name-row input{min-height:20px;height:20px}.cm-v2-inspector-detail-row{display:flex;align-items:center;gap:7px;white-space:nowrap}.cm-v2-inspector-detail-row>.cm-pixel-row{min-width:0}.cm-v2-inspector-detail-row>.cm-pixel-row:last-child{flex:0 0 auto}.cm-v2-inspector-detail-row .cm-pixel-stepper button{width:24px;min-width:24px;min-height:22px!important;padding:0!important;font-size:20px;font-weight:700;line-height:1}.cm-v2-inspector-header{display:flex;align-items:center;justify-content:space-between;min-height:20px;color:#8ee8ff;letter-spacing:.06em}.cm-v2-inspector-actions{display:flex;gap:2px}.cm-v2-inspector-placeholder{opacity:.35;min-height:31px}.cm-v2-inspector-placeholder .cm-v2-inspector-header{color:#ddd}.cm-v2-y-rail{position:relative;grid-column:1;grid-row:1;width:21px;min-height:155px;background:rgba(142,232,255,.08);z-index:9;pointer-events:auto;cursor:ns-resize}.cm-v2-y-rail[aria-disabled="true"]{cursor:default}.cm-v2-y-rail[aria-disabled="true"] .cm-v2-y-rail-thumb{display:none}.cm-v2-y-rail::before{content:"";position:absolute;left:9px;top:0;bottom:0;border-left:3px solid #bbb}.cm-v2-y-rail-thumb{position:absolute;left:0;top:50%;width:21px;height:21px;margin-top:-10px;border:2px solid #fff;background:#111;border-radius:50%;box-sizing:border-box}.cm-v2-cursor::after{top:0;border-top:0;border-bottom:8px solid #fff}.cm-scene-compact-section{margin:2px 0;border:0;padding:0}.cm-scene-section-title{display:none}.cm-scene-environment-row{display:flex;align-items:center;gap:4px;white-space:nowrap}.cm-scene-environment-row input[type=number]{width:48px;min-height:22px}.cm-scene-action-row{display:flex;align-items:center;gap:2px;flex-wrap:nowrap;margin:3px 0}.cm-scene-action-row .cm-transport-button{flex:1 1 0;width:auto;min-width:0;min-height:22px}.cm-v2-asset-picker{display:grid;gap:3px;margin:2px 0 5px;padding:4px;border:1px solid rgba(142,232,255,.2);background:rgba(7,21,33,.65)}.cm-v2-asset-picker label{color:#8ee8ff}.cm-v2-asset-picker select{width:100%;min-height:24px}.cm-v2-asset-preview{display:grid;place-items:center;height:52px;overflow:hidden;background:#02060a;border:1px solid rgba(255,255,255,.12)}.cm-v2-asset-preview img{display:block;width:100%;height:100%;object-fit:contain}.cm-v2-asset-preview img.pixelated{image-rendering:pixelated}.cm-v2-asset-unavailable{color:#ffd166;font-size:9px}.cm-v2-asset-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.7;font-size:9px}.cm-v2-upper-content{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}.cm-v2-upper-content::-webkit-scrollbar{display:none}.cm-v2-transport-block{flex:0 0 72px;height:72px;overflow:hidden}.cm-v2-transport-block .cm-transport-button{width:72px;min-width:72px;height:72px;min-height:72px}.cm-v2-transport-block .cm-transport-icon{width:30px;height:30px}.cm-scene-transport{flex-wrap:nowrap;margin:0}`;
    this.root.appendChild(style);
    // The Scene surface remains the state/handler owner inside the unified Lab host.
    document.body.appendChild(this.workspace.root);
    this.viewportResizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.notifyPresentationChange());
    this.viewportResizeObserver?.observe(this.workspace.viewport);
    this.unsub = subscribeBackgroundState(() => { if (this.visible) this.render(); });
    window.addEventListener("keydown",this.onV2YNudgeKeydown);
    window.addEventListener("keydown",this.onDevTransportKeydown);
    this.setDisplayMode("game");
    this.render();
  }
  open(): void { this.setDisplayMode("dev"); }
  close(): void { this.setDisplayMode("game"); }
  show(): void { this.open(); }
  hide(): void { this.close(); }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
  setDisplayMode(mode: PixelBgrDisplayMode): void {
    const changed = this.displayMode !== mode || this.visible !== (mode === "dev");
    if (mode === "dev" && changed) {
      const resolution = resolveSceneLabV2Entry(getBackgroundSceneV2(globalThis));
      if (resolution.source !== "active") setBackgroundSceneV2(resolution.entry.create(), globalThis);
    }
    this.displayMode = mode;
    this.visible = mode === "dev";
    setPixelBgrWorkspaceDisplayMode(this.workspace.root, mode);
    const modeSwitch=this.workspace.modeToggle.querySelector<HTMLButtonElement>("button[data-mode=toggle]");
    modeSwitch?.setAttribute("aria-checked",String(mode === "dev"));
    if (mode === "game") {
      this.closeSceneMenu(false);
      this.endTimelineDrag(); this.endV2SegmentDrag(); this.endV2ObjectDrag(); this.endV2EventDrag(); this.endV2YRailDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay();
      clearBackgroundPreviewState(globalThis);
    } else { this.render(); this.syncOverlay(); }
    if (changed) this.notifyOpenChange();
    if (changed) this.notifyPresentationChange();
  }
  mountEnemyLab(panel: HTMLElement | null): void {
    if (!panel || this.enemyLabPanel === panel) return;
    this.enemyLabPanel = panel;
    this.enemyLabOriginalStyle = panel.style.cssText;
    panel.style.position = "relative";
    panel.style.inset = "auto";
    panel.style.width = "100%";
    panel.style.minWidth = "0";
    panel.style.maxWidth = "none";
    panel.style.maxHeight = "none";
    panel.style.height = "100%";
    panel.style.borderRadius = "0";
    this.devLabHost.mount("enemy", panel);
  }
  setActiveDevLab(mode: DevLabMode): void {
    if (this.devLabHost.getActive() === mode) return;
    this.devLabHost.setActive(mode);
    this.workspace.root.dataset.activeLab = mode;
    this.updateLabLayout();
    this.notifyPresentationChange();
  }
  getActiveDevLab(): DevLabMode { return this.devLabHost.getActive(); }
  getDisplayMode(): PixelBgrDisplayMode { return this.displayMode; }
  getPresentationVerticalAlign(): "top" | "center" { return this.displayMode === "dev" ? "top" : "center"; }
  getGamePresentationRect(): GamePresentationRect {
    const visualViewport = window.visualViewport;
    return gamePresentationRect(
      this.displayMode,
      { width: visualViewport?.width ?? window.innerWidth, height: visualViewport?.height ?? window.innerHeight },
      this.displayMode === "dev" ? this.workspace.viewport.getBoundingClientRect() : null,
    );
  }
  onPresentationGeometryChange(listener: () => void): () => void {
    this.presentationListeners.add(listener);
    listener();
    return () => this.presentationListeners.delete(listener);
  }
  updateRuntimeOverlay(): void { if (!this.visible) return; if (this.overlay) this.syncOverlay(); this.updateV2TimelineIndicators(); }
  onOpenChange(listener: (open: boolean) => void): () => void { this.openListeners.add(listener); listener(this.visible); return () => this.openListeners.delete(listener); }
  dispose(): void { window.removeEventListener("keydown",this.onV2YNudgeKeydown); window.removeEventListener("keydown",this.onDevTransportKeydown); this.closeSceneMenu(false); this.endTimelineDrag(); this.endV2SegmentDrag(); this.endV2ObjectDrag(); this.endV2EventDrag(); this.endV2YRailDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay(); this.clearV2TimelineIndicatorRefs(); this.unsub(); this.viewportResizeObserver?.disconnect(); this.openListeners.clear(); this.presentationListeners.clear(); if (this.enemyLabPanel) { this.enemyLabPanel.style.cssText = this.enemyLabOriginalStyle; document.body.appendChild(this.enemyLabPanel); this.enemyLabPanel = null; } this.workspace.root.remove(); }
  private notifyOpenChange(): void { for (const listener of [...this.openListeners]) listener(this.visible); }
  private notifyPresentationChange(): void { for (const listener of [...this.presentationListeners]) listener(); }
  private updateLabLayout(): void {
    const sceneActive = this.getActiveDevLab() === "scene";
    this.workspace.root.dataset.activeLab = this.getActiveDevLab();
    this.workspace.root.dataset.timelineMode = sceneActive && getBackgroundSceneV2(globalThis) ? "v2" : "disabled";
  }
  private setTimelineInputGuard(active: boolean): void { (globalThis as any).__CM_SCENE_TIMELINE_DRAG_ACTIVE__ = active; }
  private setDraft(scene: BackgroundScene, persist = true): void { this.draft = cloneScene(scene); if (persist) saveDraft(localStorage, this.draft); this.applyIfValid(); this.render(); this.syncOverlay(); }
  private applyIfValid(): void { if (validateBackgroundScene(this.draft).valid) setBackgroundScene(cloneScene(this.draft), globalThis); }
  private currentLayers(): BackgroundLayer[] { return layerOwner(this.draft, this.owner); }
  private selectedLayer(): BackgroundLayer | null { return this.currentLayers().find(l=>l.id===this.selectedLayerId) ?? null; }
  private setOwner(owner: LayerOwner): void { this.owner = owner; this.selectedLayerId = this.currentLayers()[0]?.id ?? ""; this.activeTab = owner.kind === "chunk" ? "layers" : "chunks"; this.render(); }
  private setActiveTab(tab: PixelBgrLabTab): void { this.activeTab = normalizePixelBgrLabTab(tab, this.activeTab); this.render(); }
  private render(): void {
    this.renderCoordinator.run(() => this.renderOwned());
  }
  private renderOwned(): void {
    this.closeLaneInsertMenu?.();
    this.closeEntityContextMenu?.();
    if(!this.v2YRailDrag)this.workspace.timeline.querySelector(".cm-v2-y-rail")?.remove();
    while (this.root.childNodes.length > 1) this.root.removeChild(this.root.lastChild!);
    this.clearV2TimelineIndicatorRefs();
    this.workspace.timeline.replaceChildren();
    this.workspace.gutter.replaceChildren();
    this.activeTab = normalizePixelBgrLabTab(this.activeTab, pixelBgrLabTabForSelection(Boolean(this.selectedLayer()), this.selectedLayer()?.kind));
    if (!PIXEL_BGR_LEFT_TOOLS.includes(this.activeTab)) this.activeTab = "scene";
    const titlebar = el("div", "cm-pixel-titlebar");
    const v2Scene = getBackgroundSceneV2(globalThis);
    this.updateLabLayout();
    const summary = el("div", "cm-scene-environment-row cm-pixel-scene-summary");
    summary.append(`SCENE: ${v2Scene?.id ?? this.draft.id ?? "untitled scene"}`);
    if (v2Scene) {
      const projection=projectBackgroundV2Timeline(v2Scene,{},this.currentX());
      this.workspace.timeline.appendChild(this.renderV2Timeline(projection));
      const headerBlock=el("div","cm-v2-left-block cm-v2-header-block");headerBlock.append(titlebar,this.renderV2Toolbar(),summary);
      const sourceBlock=el("div","cm-v2-left-block cm-v2-source-block");sourceBlock.append(this.renderV2SceneContents(v2Scene));
      const upperContent=el("div","cm-v2-upper-content");
      upperContent.append(headerBlock,this.v2Spacer(),sourceBlock,this.v2Spacer());
      const transportBlock=el("div","cm-v2-left-block cm-v2-transport-block");transportBlock.append(this.renderPreview([],projection.bounds,true));this.root.append(upperContent,transportBlock);
      this.syncOverlay();
      return;
    }
    this.root.appendChild(titlebar);
    this.root.appendChild(this.renderSceneToolbar());
    const tabs = el("div", "cm-pixel-tabs"); tabs.setAttribute("role", "tablist");
    for (const tab of PIXEL_BGR_LEFT_TOOLS) {
      const b = button(PIXEL_BGR_LAB_TAB_LABELS[tab], () => this.setActiveTab(tab));
      b.className = "cm-pixel-tab";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", this.activeTab === tab ? "true" : "false");
      tabs.appendChild(b);
    }
    this.root.appendChild(tabs);
    const body = el("div", "cm-pixel-tab-body"); body.setAttribute("role", "tabpanel"); this.root.appendChild(body);
    if (this.activeTab === "scene") body.appendChild(this.renderSceneTab());
    else if (this.activeTab === "chunks") body.appendChild(this.renderChunks());
    else if (this.activeTab === "layers") body.appendChild(this.renderLayers());
    else if (this.activeTab === "placement") body.appendChild(this.renderPlacementTab());
    else if (this.activeTab === "markers") body.appendChild(this.renderMarkersTab());
    else body.appendChild(this.renderProps());
    this.syncOverlay();
  }
  private renderV2Toolbar(): HTMLElement {
    const p=el("section","cm-scene-compact-section");
    const heading=el("span","cm-scene-section-title"); heading.textContent="SCENE AUTHORING";
    const actions=el("div","cm-scene-action-row"); actions.dataset.sceneActions="true";
    const deleteAction=this.iconButton("Delete saved scene",Trash2,"Trash2",()=>this.deleteSavedV2());
    deleteAction.classList.add("cm-scene-delete");
    actions.append(
      this.iconButton("Open scene",FolderOpen,"FolderOpen",()=>this.toggleSceneMenu()),
      this.iconButton("Save scene",Save,"Save",()=>this.saveV2()),
      this.iconButton("Duplicate scene",Copy,"Copy",()=>this.duplicateV2()),
      this.iconButton("Close Scene Lab",X,"X",()=>this.close()),
      deleteAction);
    if(this.sceneMenuOpen) actions.appendChild(this.renderSceneMenu());
    p.append(heading,actions);
    return p;
  }
  private v2Spacer():HTMLElement {const spacer=el("div","cm-v2-spacer");spacer.setAttribute("aria-hidden","true");return spacer;}
  private renderLeftTools(): HTMLElement {
    const tools=el("nav","cm-pixel-tabs"); tools.setAttribute("aria-label","Scene Lab tools");
    for(const tab of PIXEL_BGR_LEFT_TOOLS){const item=button(PIXEL_BGR_LAB_TAB_LABELS[tab],()=>this.setActiveTab(tab));item.className="cm-pixel-tab";item.setAttribute("aria-current",this.activeTab===tab?"page":"false");tools.append(item);}
    return tools;
  }
  private applyV2EnvironmentEdit(result: V2EnvironmentEditResult): void {
    if (!result.ok) { this.message=result.error; this.render(); return; }
    this.message=""; setBackgroundSceneV2(result.scene,globalThis);
  }
  private renderV2SceneContents(scene: BackgroundSceneV2): HTMLElement {
    const tree=el("section","cm-scene-compact-section cm-scene-contents");tree.setAttribute("aria-label","Scene contents");
    tree.append(this.renderV2AssetPicker());
    const backdrop=scene.staticBackdrop;const starfield=scene.environment.starfield;
    tree.append(
      this.sceneContentsRow("BGR","visibility",Boolean(backdrop?.enabled),backdrop?1:0,()=>{if(!backdrop)return;const result=setV2StaticBackdropEnabled(scene,!backdrop.enabled);if(result.ok)setBackgroundSceneV2(result.scene,globalThis);},backdrop?()=>[this.sceneContentsIdentityChild(backdrop.asset.id)]:undefined,!backdrop),
      this.sceneContentsRow("ENV","visibility",Boolean(starfield),starfield?1:0,()=>this.applyV2EnvironmentEdit(starfield?disableV2Starfield(scene):enableV2Starfield(scene)),starfield?()=>[this.sceneContentsEnvironmentChild(scene)]:undefined)
    );
    const segments=scene.tracks.flatMap(track=>track.segments.map(segment=>({track,segment})));
    const objects=scene.tracks.flatMap(track=>track.objects.map(object=>({track,object})));
    const events=orderedV2SceneEvents(scene);
    tree.append(
      this.sceneContentsRow("SEG","visibility",sceneContentsAggregateState(segments.map(({segment})=>segment.enabled)),segments.length,()=>this.setV2SegmentsEnabled(scene,segments,sceneContentsAggregateState(segments.map(({segment})=>segment.enabled))!=="all"),()=>segments.map(({track,segment})=>this.sceneContentsVisualChild("segment",track.id,segment.id,segment.enabled,segment.name))),
      this.sceneContentsRow("OBJ","visibility",sceneContentsAggregateState(objects.map(({object})=>object.enabled)),objects.length,()=>this.setV2ObjectsEnabled(scene,objects,sceneContentsAggregateState(objects.map(({object})=>object.enabled))!=="all"),()=>objects.map(({track,object})=>this.sceneContentsVisualChild("object",track.id,object.id,object.enabled,object.name))),
      this.sceneContentsRow("EVE","activation",sceneContentsAggregateState(events.map(event=>event.enabled)),events.length,()=>this.setV2EventsEnabled(scene,events,sceneContentsAggregateState(events.map(event=>event.enabled))!=="all"),()=>events.map((event,index)=>this.sceneContentsEventChild(scene,event,index))),
      this.sceneContentsRow("TRI","activation","none",0,()=>{},undefined,true,"reserved"),
      this.sceneContentsRow("MAR","activation","none",0,()=>{},undefined,true,"reserved")
    );
    if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;tree.append(message);}return tree;
  }
  private renderV2AssetPicker():HTMLElement {
    const picker=el("section","cm-v2-asset-picker");picker.setAttribute("aria-label","V2 insert asset");
    const label=el("label");label.textContent="Asset";
    const select=el("select");select.setAttribute("aria-label","Asset for new segment or object");
    const resolved=BACKGROUND_ASSET_CATALOG.find(asset=>asset.id===this.v2SelectedAssetId)??null;
    if(!resolved&&this.v2SelectedAssetId){const option=el("option");option.value=this.v2SelectedAssetId;option.textContent=`Unknown / unresolved (${this.v2SelectedAssetId})`;select.append(option);}
    for(const asset of BACKGROUND_ASSET_CATALOG){const option=el("option");option.value=asset.id;option.textContent=asset.label;select.append(option);}
    select.value=this.v2SelectedAssetId;select.disabled=BACKGROUND_ASSET_CATALOG.length===0;select.onchange=()=>{this.v2SelectedAssetId=select.value;this.render();};label.append(select);picker.append(label);
    const preview=el("div","cm-v2-asset-preview");
    if(resolved){const image=el("img");image.src=resolved.url;image.alt=`Preview of ${resolved.label}`;if(resolved.pixelArt)image.classList.add("pixelated");const unavailable=el("span","cm-v2-asset-unavailable");unavailable.textContent="Preview unavailable";unavailable.hidden=true;image.onerror=()=>{image.hidden=true;unavailable.hidden=false;};preview.append(image,unavailable);}
    else {const unavailable=el("span","cm-v2-asset-unavailable");unavailable.textContent=BACKGROUND_ASSET_CATALOG.length?"Unknown / unresolved asset":"Catalogue empty";preview.append(unavailable);}
    const id=el("div","cm-v2-asset-detail");id.textContent=`ID: ${this.v2SelectedAssetId||"unavailable"}`;const path=el("div","cm-v2-asset-detail");path.textContent=`Path: ${resolved?.url??"unresolved"}`;picker.append(preview,id,path);return picker;
  }
  private sceneContentsIdentityChild(label:string):HTMLElement {const child=el("div","cm-scene-tree-child");child.append(document.createTextNode(""),document.createTextNode(label));return child;}
  private sceneContentsEnvironmentChild(scene:BackgroundSceneV2):HTMLElement {const starfield=scene.environment.starfield!;const child=el("div","cm-scene-environment-row");const seed=num(starfield.seed,1,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{seed:value})));seed.title="Starfield seed";seed.setAttribute("aria-label","Starfield seed");const density=num(starfield.density,.05,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{density:value})));density.title="Starfield density";density.setAttribute("aria-label","Starfield density");child.append("starfield",seed,density,this.iconButton("Randomize starfield seed",RotateCcw,"RotateCcw",()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);this.applyV2EnvironmentEdit(randomizeV2StarfieldSeed(scene,values[0]));}));return child;}
  private sceneContentsRow(label:string,kind:"visibility"|"activation",state:boolean|SceneContentsAggregateState,count:number,onAction:()=>void,children?:()=>HTMLElement[],disabled=false,status?:string):HTMLElement {
    const section=el("div","cm-scene-tree-category");section.dataset.category=label;const row=el("div","cm-scene-tree-row");
    const resolved:SceneContentsAggregateState=typeof state==="boolean"?(state?"all":"none"):state;const icon=kind==="visibility"?(resolved==="none"?EyeOff:Eye):Power;
    const action=this.iconButton(`${label} ${kind}: ${resolved}`,icon,kind==="visibility"?(resolved==="none"?"EyeOff":"Eye"):"Power",onAction,disabled||(count===0&&(label==="SEG"||label==="OBJ"||label==="EVE")));action.className="cm-scene-tree-action";action.dataset.action=kind;action.dataset.state=resolved;action.setAttribute("aria-pressed",resolved==="mixed"?"mixed":String(resolved==="all"));
    const expandable=count>=2;const open=expandable&&this.sceneContentsExpanded.has(label);const labelButton=button(label,()=>{if(expandable){open?this.sceneContentsExpanded.delete(label):this.sceneContentsExpanded.add(label);this.render();}});labelButton.className="cm-scene-tree-label";labelButton.disabled=!expandable;labelButton.dataset.accordionAction="true";
    const meta=el("span","cm-scene-tree-meta");meta.append(status??(count?String(count):"none"));if(expandable){const toggle=this.iconButton(`${open?"Collapse":"Expand"} ${label}`,open?ChevronDown:ChevronRight,open?"ChevronDown":"ChevronRight",()=>{open?this.sceneContentsExpanded.delete(label):this.sceneContentsExpanded.add(label);this.render();});toggle.className="cm-scene-tree-toggle";toggle.dataset.accordionAction="true";meta.prepend(toggle);}
    row.append(action,labelButton,meta);section.append(row);if(children&&(count===1||open)){const list=el("div","cm-scene-tree-children");list.append(...children());section.append(list);}return section;
  }
  private sceneContentsVisualChild(kind:"segment"|"object",trackId:string,id:string,enabled:boolean,name?:string):HTMLElement {const selected=this.v2SelectedTrackId===trackId&&(kind==="segment"?this.v2SelectedSegmentId===id:this.v2SelectedObjectId===id);const row=el("div",`cm-scene-tree-child${selected?" sel":""}`);const toggle=()=>{const scene=getBackgroundSceneV2(globalThis);if(!scene)return;if(kind==="segment"){const result=updateV2Segment(scene,trackId,id,{enabled:!enabled});if(result.ok)setBackgroundSceneV2(result.scene,globalThis);}else{const result=updateV2Object(scene,trackId,id,{enabled:!enabled});if(result.ok)setBackgroundSceneV2(result.scene,globalThis);}};const eye=this.iconButton(`${enabled?"Hide":"Show"} ${kind} ${id}`,enabled?Eye:EyeOff,enabled?"Eye":"EyeOff",toggle);eye.className="cm-scene-tree-action";eye.onclick=e=>{e.stopPropagation();toggle();};const label=v2EntityDisplayName({id,name});const select=button(label,()=>kind==="segment"?this.selectV2Segment(trackId,id):this.selectV2Object(trackId,id));select.className="cm-scene-tree-child-label";const editing=this.v2Rename?.surface==="tree"&&this.v2Rename.kind===kind&&this.v2Rename.trackId===trackId&&this.v2Rename.id===id;if(editing)row.append(eye,this.v2RenameInput(label,value=>{const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const patch={name:value||undefined};kind==="segment"?this.applyV2Edit(updateV2Segment(scene,trackId,id,patch)):this.applyV2ObjectEdit(updateV2Object(scene,trackId,id,patch));}));else row.append(eye,select);row.oncontextmenu=e=>this.openV2VisualContextMenu(e,trackId,kind,id,"tree");return row;}
  private sceneContentsEventChild(scene:BackgroundSceneV2,event:NonNullable<BackgroundSceneV2["events"]>[number],index:number):HTMLElement {const name=v2EntityDisplayName(event);const row=el("div",`cm-scene-tree-child cm-scene-tree-event${event.id===this.v2SelectedEventId?" sel":""}`);const toggle=()=>{const result=updateV2SceneEvent(scene,event.id,{enabled:!event.enabled});if(result.ok)setBackgroundSceneV2(result.scene,globalThis);};const power=this.iconButton(`${event.enabled?"Disable":"Enable"} Event ${name}`,Power,"Power",toggle);power.className="cm-scene-tree-action";power.dataset.action="activation";power.dataset.state=event.enabled?"all":"none";power.onclick=e=>{e.stopPropagation();toggle();};const ordinal=el("span","cm-scene-tree-ordinal");ordinal.textContent=`${index+1}.`;const label=button(name,()=>this.selectV2Event(event.id));label.className="cm-scene-tree-child-label";const type=el("span","cm-v2-logic-type");type.textContent=event.locked?`${event.type} · locked`:event.type;row.append(power,ordinal,label,type);if(this.v2Rename?.surface==="tree"&&this.v2Rename.kind==="event"&&this.v2Rename.id===event.id)row.replaceChild(this.v2RenameInput(name,value=>this.applyV2EventEdit(updateV2SceneEvent(scene,event.id,{name:value||undefined}))),label);row.oncontextmenu=e=>this.openV2EventContextMenu(e,event.id,"tree");return row;}
  private v2RenameInput(value:string,commit:(value:string)=>void):HTMLInputElement {const input=el("input","cm-v2-logic-name-edit");input.value=value;input.setAttribute("aria-label","Rename Event or visual entity");let cancelled=false;const finish=()=>{if(cancelled)return;this.v2Rename=null;commit(input.value.trim());};input.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();cancelled=true;this.v2Rename=null;this.render();}else if(e.key==="Enter"){e.preventDefault();input.blur();}};input.onblur=finish;input.onpointerdown=e=>e.stopPropagation();queueMicrotask(()=>{input.focus();input.select();});return input;}
  private v2TimelineRenameInput(value:string,commit:(value:string)=>void):HTMLInputElement {const input=this.v2RenameInput(value,commit);input.className="cm-v2-timeline-name-edit";input.onpointerdown=e=>isolateTimelinePointerEvent(e);input.onclick=e=>e.stopPropagation();input.oncontextmenu=e=>isolateTimelinePointerEvent(e);return input;}
  private setV2SegmentsEnabled(scene:BackgroundSceneV2,items:readonly {track:BackgroundTrack;segment:BackgroundSegment}[],enabled:boolean):void {let next=scene;for(const {track,segment} of items){const result=updateV2Segment(next,track.id,segment.id,{enabled});if(!result.ok){this.message=result.error;this.render();return;}next=result.scene;}setBackgroundSceneV2(next,globalThis);}
  private setV2ObjectsEnabled(scene:BackgroundSceneV2,items:readonly {track:BackgroundTrack;object:BackgroundObject}[],enabled:boolean):void {let next=scene;for(const {track,object} of items){const result=updateV2Object(next,track.id,object.id,{enabled});if(!result.ok){this.message=result.error;this.render();return;}next=result.scene;}setBackgroundSceneV2(next,globalThis);}
  private setV2EventsEnabled(scene:BackgroundSceneV2,events:NonNullable<BackgroundSceneV2["events"]>,enabled:boolean):void {let next=scene;for(const event of events){const result=updateV2SceneEvent(next,event.id,{enabled});if(!result.ok){this.message=result.error;this.render();return;}next=result.scene;}setBackgroundSceneV2(next,globalThis);}
  private saveV2():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const result=saveBackgroundSceneV2(localStorage,scene);this.message=result.ok?`saved scene ${scene.id}`:`save failed: ${result.error}`;this.render();}
  private loadV2():void {const result=loadBackgroundSceneV2(localStorage);if(result.ok){this.message=`loaded saved scene ${result.scene.id}`;setBackgroundSceneV2(result.scene,globalThis);}else{this.message=`load failed: ${result.error}`;this.render();}}
  private toggleSceneMenu():void {this.sceneMenuOpen?this.closeSceneMenu():this.openSceneMenu();}
  private openSceneMenu():void {if(this.sceneMenuOpen)return;this.sceneMenuOpen=true;document.addEventListener("pointerdown",this.onSceneMenuOutside);document.addEventListener("keydown",this.onSceneMenuKeydown);this.render();}
  private closeSceneMenu(render=true):void {if(!this.sceneMenuOpen)return;this.sceneMenuOpen=false;document.removeEventListener("pointerdown",this.onSceneMenuOutside);document.removeEventListener("keydown",this.onSceneMenuKeydown);if(render)this.render();}
  private onSceneMenuOutside=(event:PointerEvent):void=>{const target=event.target;if(!(target instanceof Element)||(!target.closest(".cm-scene-menu")&&!target.closest('button[aria-label="Open scene"]')))this.closeSceneMenu();};
  private onSceneMenuKeydown=(event:KeyboardEvent):void=>{if(event.key==="Escape"){event.preventDefault();this.closeSceneMenu();}};
  private selectScene(entry:SceneLabCatalogEntry):void {this.closeSceneMenu(false);this.message="";rememberSceneLabCatalogEntry(entry);if(entry.version===2)setBackgroundSceneV2(entry.create(),globalThis);else{this.owner={kind:"global"};this.selectedLayerId="";this.setDraft(entry.create());}}
  private renderSceneMenu():HTMLElement {const menu=el("div","cm-scene-menu");menu.setAttribute("role","menu");menu.setAttribute("aria-label","Available scenes");for(const entry of SCENE_LAB_SCENE_CATALOG){const item=button(entry.label,()=>this.selectScene(entry));item.setAttribute("role","menuitem");menu.appendChild(item);}const saved=loadBackgroundSceneV2(localStorage);if(saved.ok){const item=button(`Saved: ${saved.scene.id}`,()=>{this.closeSceneMenu(false);this.loadV2();});item.setAttribute("role","menuitem");menu.appendChild(item);}return menu;}
  private deleteSavedV2():void {if(!confirm("Delete the saved Scene Lab scene? The active scene will remain unchanged."))return;clearBackgroundSceneV2(localStorage);this.message="deleted saved scene (active scene unchanged)";this.render();}
  private duplicateV2():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;setBackgroundSceneV2({...structuredClone(scene),id:`${scene.id||"scene"}-copy`},globalThis);}
  private exportV2File():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const blob=new Blob([serializeBackgroundSceneV2(scene)],{type:"application/json"});const a=el("a");a.href=URL.createObjectURL(blob);a.download=`${scene.id||"background-scene"}.background-v2.json`;a.click();URL.revokeObjectURL(a.href);this.message=`exported scene ${scene.id}`;this.render();}
  private importV2File():void {const input=el("input");input.type="file";input.accept="application/json";input.onchange=()=>{const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const result=parseBackgroundSceneV2(String(reader.result??""));if(result.ok){this.message=`imported scene ${result.scene.id}`;setBackgroundSceneV2(result.scene,globalThis);}else{this.message=`import failed: ${result.error}`;this.render();}};reader.readAsText(file);};input.click();}

  private renderV2Timeline(projection: V2TimelineProjection): HTMLElement {
    const panel=el("div","cm-pixel-panel cm-v2-panel");
    const viewportRange=timelineViewportRange(this.currentScroll().x,this.logicW);
    const timelineBounds={startX:Math.min(projection.bounds.startX,viewportRange.startX),endX:Math.max(projection.bounds.endX,viewportRange.endX)};
    const contentSpan=Math.max(720,timelineBounds.endX-timelineBounds.startX);
    const baseWidthPx=Math.max(this.workspace.viewport.clientWidth,Math.ceil(contentSpan));
    const scale=createExactTimelineScale(timelineBounds.startX,timelineBounds.endX,baseWidthPx,this.v2TimelineZoom);
    this.v2RenderedTimelineScale=scale;
    const gutter=el("div","cm-v2-timeline-gutter");
    const zoomControls=el("div","cm-v2-zoom-controls");
    const zoomOut=this.iconButton("Zoom out",Minus,"Minus",()=>this.changeV2TimelineZoom(-1),this.v2TimelineZoom<=PIXEL_BGR_TIMELINE_ZOOM_LEVELS[0]);zoomOut.className="cm-v2-zoom-button";
    const fit=button("Fit",()=>this.fitV2Timeline(baseWidthPx));fit.className="cm-v2-zoom-button cm-v2-fit-button";fit.title="Fit full timeline";fit.setAttribute("aria-label","Fit full timeline");
    const zoomIn=this.iconButton("Zoom in",Plus,"Plus",()=>this.changeV2TimelineZoom(1),this.v2TimelineZoom>=PIXEL_BGR_TIMELINE_ZOOM_LEVELS[PIXEL_BGR_TIMELINE_ZOOM_LEVELS.length-1]);zoomIn.className="cm-v2-zoom-button";
    zoomControls.append(zoomOut,fit,zoomIn);gutter.appendChild(zoomControls);
    for(const lane of projection.lanes){
      const gutterRow=el("div","cm-v2-gutter-row");
      const visibility=v2RoleVisibility(lane.tracks);
      const eye=this.iconButton(`${lane.label} visibility: ${visibility}`,visibility==="none"?EyeOff:Eye,visibility==="none"?"EyeOff":"Eye",()=>this.toggleV2RoleVisibility(lane.tracks.map(track=>track.id),visibility));
      eye.className="cm-v2-eye";eye.dataset.visibility=visibility;eye.setAttribute("aria-pressed",visibility==="all"?"true":visibility==="none"?"false":"mixed");eye.onpointerdown=isolateTimelinePointerEvent;
      const label=el("span","cm-v2-lane-label");
      const labelTrack=lane.tracks.find(track=>track.id===this.v2SelectedTrackId)??lane.tracks[0];
      if(labelTrack){const selectTrack=button(lane.label,()=>this.selectV2Track(labelTrack.id));selectTrack.className="cm-v2-lane-track-button cm-v2-role-label";selectTrack.title=`Select track ${labelTrack.id}`;label.appendChild(selectTrack);}
      else {const role=el("span","cm-v2-role-label");role.textContent=lane.label;label.appendChild(role);eye.disabled=true;}
      const activeTrack=lane.tracks.find(track=>track.id===this.v2SelectedTrackId)??lane.tracks[0];
      const parallax=el("input","cm-v2-parallax");parallax.type="number";parallax.step="0.05";parallax.min="0";parallax.max="1";parallax.value=activeTrack?activeTrack.parallaxX.toFixed(2):"";parallax.disabled=!activeTrack;parallax.setAttribute("aria-label",activeTrack?`${lane.label} track ${activeTrack.label} parallax X`:`${lane.label} parallax X unavailable`);parallax.onpointerdown=isolateTimelinePointerEvent;parallax.onclick=e=>e.stopPropagation();parallax.onchange=()=>{if(!activeTrack)return;const value=Number(parallax.value);if(!Number.isFinite(value)||value<0||value>1){parallax.value=activeTrack.parallaxX.toFixed(2);return;}this.applyV2TrackParallaxEdit(updateV2TrackParallaxX(getBackgroundSceneV2(globalThis)!,activeTrack.id,value));};
      const add=button("+",()=>this.openV2LaneInsertMenu(add,lane));add.className="cm-v2-lane-add";add.title=`Add to ${lane.label}`;add.setAttribute("aria-label",`Add to ${lane.label}`);add.onpointerdown=isolateTimelinePointerEvent;
      gutterRow.append(label,parallax,eye,add);gutter.appendChild(gutterRow);
    }
    const eventsGutter=el("div","cm-v2-gutter-row cm-v2-events-gutter");
    const eventsLabel=el("span","cm-v2-lane-label cm-v2-role-label");eventsLabel.textContent="Events";
    const eventsAdd=button("+",()=>this.openV2EventInsertMenu(eventsAdd));eventsAdd.className="cm-v2-lane-add";eventsAdd.title="Add scene event";eventsAdd.setAttribute("aria-label","Add scene event");eventsAdd.onpointerdown=isolateTimelinePointerEvent;
    eventsGutter.append(eventsLabel,eventsAdd);gutter.appendChild(eventsGutter);
    gutter.appendChild(this.renderV2ContextualYSurface());
    this.workspace.gutter.appendChild(gutter);
    const scroll=el("div","cm-v2-timeline-scroll");
    const timeline=el("div","cm-v2-timeline"); timeline.style.width=`${scale.widthPx}px`;
    const rowHeight=27;
    const eventRowHeight=16;
    const headerHeight=20;
    timeline.style.height=`${headerHeight+projection.lanes.length*rowHeight+eventRowHeight}px`;
    timeline.onpointerdown=(e)=>{ const target=e.target; const seekTarget=target===timeline||(target instanceof HTMLElement&&(target.classList.contains("cm-ruler")||target.classList.contains("cm-v2-lane"))); if(this.cursorDrag||!seekTarget)return; isolateTimelinePointerEvent(e); const rect=timeline.getBoundingClientRect(); const x=Math.round(clickedTimelineCurrentX(e.clientX,rect.left,scale,projection.bounds.startX,projection.bounds.endX,rect.width)); this.setCurrentX(x,true); this.render(); };
    const ruler=el("div","cm-v2-ruler cm-ruler");
    const tickStep=timelineMajorTickInterval(this.v2TimelineZoom);
    for(let x=Math.ceil(scale.minX/tickStep)*tickStep;x<=scale.maxX;x+=tickStep){const tick=el("div","cm-ruler-tick");tick.style.left=`${worldToTimelinePx(x,scale)}px`;tick.textContent=formatTimelineWorldX(x);ruler.appendChild(tick);} timeline.appendChild(ruler);
    let top=headerHeight;
    for(const lane of projection.lanes){
        const row=el("div",`cm-v2-lane cm-v2-${String(lane.role)}`); row.style.top=`${top}px`; row.style.height=`${rowHeight}px`;
        if(lane.tracks.length>1){const trackSelect=el("select","cm-v2-lane-track-select");trackSelect.setAttribute("aria-label",`Select ${lane.label} track`);for(const track of lane.tracks){const option=el("option");option.value=track.id;option.textContent=track.label;trackSelect.appendChild(option);}const selectedTrack=lane.tracks.find(track=>track.id===this.v2SelectedTrackId);trackSelect.value=selectedTrack?.id??lane.tracks[0].id;trackSelect.onpointerdown=isolateTimelinePointerEvent;trackSelect.onchange=()=>this.selectV2Track(trackSelect.value);row.appendChild(trackSelect);}
        for(const track of lane.tracks){
          for(const overlap of calculateV2SegmentOverlaps(track.segments.map(item=>({id:item.id,startTrackX:item.startX,widthPx:item.widthPx})))){const warning=el("span","cm-v2-overlap");warning.style.left=`${worldToTimelinePx(overlap.startX,scale)}px`;warning.style.width=`${Math.max(2,worldToTimelinePx(overlap.endX,scale)-worldToTimelinePx(overlap.startX,scale))}px`;warning.title=`Overlap ${overlap.startX}..${overlap.endX}: ${overlap.segmentIds.join(", ")}`;row.appendChild(warning);}
          for(const segment of track.segments){const editable=track.mode==="sequence";const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedSegmentId===segment.id&&!this.v2SelectedObjectId;const block=el("span",`cm-v2-segment${segment.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}${editable?" editable":" readonly"}`);block.style.left=`${worldToTimelinePx(segment.startX,scale)}px`;block.style.width=`${Math.max(2,worldToTimelinePx(segment.endX,scale)-worldToTimelinePx(segment.startX,scale))}px`;const label=el("span","cm-v2-segment-label");label.style.left=block.style.left;label.style.width=block.style.width;const displayName=v2EntityDisplayName(segment);const renaming=this.v2Rename?.surface==="timeline"&&this.v2Rename.kind==="segment"&&this.v2Rename.trackId===track.id&&this.v2Rename.id===segment.id;if(renaming)label.append(this.v2TimelineRenameInput(displayName,value=>{const scene=getBackgroundSceneV2(globalThis);if(scene)this.applyV2Edit(updateV2Segment(scene,track.id,segment.id,{name:value||undefined}));}));else label.textContent=displayName;block.title=`${track.id}/${segment.id} ${segment.startX}..${segment.endX} · z ${segment.effectiveZ}${editable?"":" · repeat read-only"}`;block.onpointerdown=e=>{this.v2PlacementTarget=null;if(e.button===2){isolateTimelinePointerEvent(e);this.selectV2Segment(track.id,segment.id,false);return;}if(!editable){isolateTimelinePointerEvent(e);this.selectV2Segment(track.id,segment.id);return;}this.beginV2SegmentDrag(e,track.id,segment.id,"move",scale);};if(editable)block.oncontextmenu=e=>this.openV2VisualContextMenu(e,track.id,"segment",segment.id,"timeline");if(editable){const left=el("span","cm-v2-segment-handle left");left.title="Resize left edge";left.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-left",scale);const right=el("span","cm-v2-segment-handle right");right.title="Resize right edge";right.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-right",scale);block.append(left,right);}row.append(block,label);}
          for(const object of track.objects){const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedObjectId===object.id;const marker=el("span",`cm-v2-object${object.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}`);marker.style.pointerEvents="auto";marker.style.cursor="pointer";marker.style.left=`${worldToTimelinePx(object.x,scale)}px`;marker.style.width=`${object.width===null?8:Math.max(2,worldToTimelinePx(object.x+object.width,scale)-worldToTimelinePx(object.x,scale))}px`;const displayName=v2EntityDisplayName(object);const renaming=this.v2Rename?.surface==="timeline"&&this.v2Rename.kind==="object"&&this.v2Rename.trackId===track.id&&this.v2Rename.id===object.id;if(renaming)marker.append(this.v2TimelineRenameInput(displayName,value=>{const scene=getBackgroundSceneV2(globalThis);if(scene)this.applyV2ObjectEdit(updateV2Object(scene,track.id,object.id,{name:value||undefined}));}));else marker.textContent=displayName;marker.title=`${track.id}/${object.id} @ ${object.x}${object.width===null?" · point marker":` · width ${object.width}`} · z ${object.effectiveZ}`;marker.onpointerdown=e=>{this.v2PlacementTarget=null;if(e.button===2){isolateTimelinePointerEvent(e);this.selectV2Object(track.id,object.id,false);return;}this.beginV2ObjectDrag(e,track.id,object.id,scale);};marker.oncontextmenu=e=>this.openV2VisualContextMenu(e,track.id,"object",object.id,"timeline");row.appendChild(marker);}
        }
        timeline.appendChild(row); top+=rowHeight;
    }
    const eventRow=el("div","cm-v2-lane cm-v2-event-row");eventRow.dataset.lane="events";eventRow.style.top=`${top}px`;eventRow.style.height=`${eventRowHeight}px`;
    projection.events.forEach((event,index)=>{const selected=this.v2SelectedEventId===event.id;const marker=el("span",`cm-v2-event ${event.type}${event.enabled?"":" disabled"}${selected?" sel":""}`);marker.style.left=`${worldToTimelinePx(event.worldX,scale)}px`;const renaming=this.v2Rename?.surface==="timeline"&&this.v2Rename.kind==="event"&&this.v2Rename.id===event.id;if(renaming)marker.append(this.v2TimelineRenameInput(event.label,value=>{const scene=getBackgroundSceneV2(globalThis);if(scene)this.applyV2EventEdit(updateV2SceneEvent(scene,event.id,{name:value||undefined}));}));else marker.textContent=String(index+1);marker.title=event.label;marker.setAttribute("aria-label",`Event ${index+1}: ${event.label}, ${event.type}, X ${event.worldX}`);marker.onpointerdown=e=>{if(e.button===2){isolateTimelinePointerEvent(e);this.selectV2Event(event.id,false);return;}this.beginV2EventDrag(e,event.id,scale);};marker.oncontextmenu=e=>this.openV2EventContextMenu(e,event.id,"timeline");eventRow.appendChild(marker);});timeline.appendChild(eventRow);
    const viewport=el("div","cm-v2-viewport-range");const viewportPx=worldToTimelinePx(viewportRange.startX,scale);viewport.style.left="0px";viewport.style.transform=`translate3d(${viewportPx}px, 0, 0)`;viewport.style.width=`${worldToTimelinePx(viewportRange.endX,scale)-viewportPx}px`;viewport.title=`Visible viewport ${Math.round(viewportRange.startX)}..${Math.round(viewportRange.endX)}`;this.v2ViewportEl=viewport;this.v2LastViewportPx=viewportPx;timeline.appendChild(viewport);
    const cursor=el("div","cm-cursor cm-v2-cursor");const cursorPx=worldToTimelinePx(projection.playerX,scale);cursor.style.left="0px";cursor.style.transform=`translate3d(${cursorPx}px, 0, 0)`;cursor.title=`Drag Player X cursor ${Math.round(projection.playerX)}`;cursor.onpointerdown=e=>this.beginCursorDrag(e,timeline,scale,projection.bounds);this.cursorEl=cursor;this.v2CursorEl=cursor;this.v2LastCursorPx=cursorPx;timeline.appendChild(cursor);
    scroll.appendChild(timeline);panel.classList.add("has-y-rail");const rail=this.renderV2YRail();if(rail.dataset.contextKind)panel.dataset.contextKind=rail.dataset.contextKind;panel.append(rail,scroll);return panel;
  }
  private clearV2TimelineIndicatorRefs():void {if(this.cursorEl===this.v2CursorEl)this.cursorEl=null;this.v2CursorEl=null;this.v2ViewportEl=null;this.v2LastCursorPx=null;this.v2LastViewportPx=null;this.v2RenderedTimelineScale=null;}
  private setV2IndicatorX(element:HTMLElement|null,pixelX:number,lastPixelX:number|null):number {if(element&&pixelX!==lastPixelX)element.style.transform=`translate3d(${pixelX}px, 0, 0)`;return pixelX;}
  private updateV2TimelineIndicators():void {const scale=this.v2RenderedTimelineScale;if(!scale)return;const range=timelineViewportRange(this.currentScroll().x,this.logicW);const viewportPx=worldToTimelinePx(range.startX,scale);this.v2LastViewportPx=this.setV2IndicatorX(this.v2ViewportEl,viewportPx,this.v2LastViewportPx);const cursorPx=worldToTimelinePx(this.currentX(),scale);this.v2LastCursorPx=this.setV2IndicatorX(this.v2CursorEl,cursorPx,this.v2LastCursorPx);}
  private toggleV2RoleVisibility(trackIds:readonly string[],visibility:"all"|"none"|"mixed"):void {const scene=getBackgroundSceneV2(globalThis);if(!scene||trackIds.length===0)return;setBackgroundSceneV2(setV2RoleTracksEnabled(scene,trackIds,visibility!=="all"),globalThis);}
  private openV2LaneInsertMenu(trigger:HTMLElement,lane:V2TimelineProjection["lanes"][number]):void {
    this.closeLaneInsertMenu?.();
    const menu=el("div","cm-v2-lane-add-menu");menu.setAttribute("role","menu");menu.setAttribute("aria-label",`Add to ${lane.label}`);
    const close=()=>{menu.remove();document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",keydown);if(this.closeLaneInsertMenu===close)this.closeLaneInsertMenu=null;};
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!menu.contains(event.target)&&!trigger.contains(event.target))close();};
    const keydown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();close();trigger.focus();}};
    const insert=(kind:"segment"|"object")=>{close();const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const track=resolveV2LaneInsertTrack(scene,lane,this.v2SelectedTrackId);if(!track){this.message=`Cannot insert in ${lane.label}: lane has no track.`;this.render();return;}if(BACKGROUND_ASSET_CATALOG.length===0){this.message="Cannot insert: background asset catalog is empty.";this.render();return;}const asset=resolveV2PickerAsset(BACKGROUND_ASSET_CATALOG,this.v2SelectedAssetId);if(!asset){this.message=`Cannot insert: selected asset '${this.v2SelectedAssetId}' is unknown or unresolved.`;this.render();return;}const selectedSegment=track.id===this.v2SelectedTrackId?findV2Segment(scene,track.id,this.v2SelectedSegmentId):null;if(kind==="segment")this.applyV2Edit(insertV2LaneSegment(scene,track.id,this.currentX(),asset,selectedSegment?.id));else this.applyV2ObjectEdit(insertV2LaneObject(scene,track.id,this.currentX(),asset));};
    const segment=button("Segment",()=>insert("segment"));segment.setAttribute("role","menuitem");const object=button("Object",()=>insert("object"));object.setAttribute("role","menuitem");menu.append(segment,object);const rect=trigger.getBoundingClientRect();menu.style.left=`${rect.left}px`;menu.style.top=`${rect.bottom+2}px`;document.body.appendChild(menu);this.closeLaneInsertMenu=close;document.addEventListener("pointerdown",outside);document.addEventListener("keydown",keydown);segment.focus();
  }
  private fitV2Timeline(baseWidthPx:number):void {const timelineScroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");const viewportWidth=timelineScroll?.clientWidth??this.workspace.timeline.clientWidth;const fitPaddingPx=24;const availableWidth=Math.max(1,viewportWidth-fitPaddingPx);this.v2TimelineZoom=timelineFitZoom(availableWidth,baseWidthPx);this.render();const scroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");if(scroll)scroll.scrollLeft=0;}
  private changeV2TimelineZoom(direction:-1|1):void {const currentIndex=PIXEL_BGR_TIMELINE_ZOOM_LEVELS.indexOf(this.v2TimelineZoom as typeof PIXEL_BGR_TIMELINE_ZOOM_LEVELS[number]);const nextIndex=Math.max(0,Math.min(PIXEL_BGR_TIMELINE_ZOOM_LEVELS.length-1,currentIndex+direction));const next=PIXEL_BGR_TIMELINE_ZOOM_LEVELS[nextIndex];if(next===this.v2TimelineZoom)return;const oldScroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");const cursorViewportX=oldScroll&&this.v2LastCursorPx!==null?this.v2LastCursorPx-oldScroll.scrollLeft:null;this.v2TimelineZoom=next;this.render();if(cursorViewportX!==null){const newScroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");if(newScroll&&this.v2LastCursorPx!==null)newScroll.scrollLeft=Math.max(0,this.v2LastCursorPx-cursorViewportX);}}

  private openV2EventInsertMenu(trigger:HTMLElement):void {this.closeLaneInsertMenu?.();const menu=el("div","cm-v2-lane-add-menu");menu.setAttribute("role","menu");menu.setAttribute("aria-label","Add scene event");const close=()=>{menu.remove();if(this.closeLaneInsertMenu===close)this.closeLaneInsertMenu=null;};const insert=(type:"signal"|"level-end")=>{close();const scene=getBackgroundSceneV2(globalThis);if(scene)this.applyV2EventEdit(createV2SceneEvent(scene,this.currentX(),{type}));};menu.append(button("Signal",()=>insert("signal")),button("Level End",()=>insert("level-end")));const rect=trigger.getBoundingClientRect();menu.style.left=`${rect.left}px`;menu.style.top=`${rect.bottom+2}px`;document.body.appendChild(menu);this.closeLaneInsertMenu=close;}
  private openV2EntityToolbar(e:MouseEvent,anchor:HTMLElement,label:string,actions:readonly {name:string;icon:IconNode;iconName:string;action:()=>void;disabled?:boolean;destructive?:boolean}[]):void {e.preventDefault();e.stopPropagation();this.closeEntityContextMenu?.();const toolbar=el("div","cm-v2-entity-toolbar");toolbar.setAttribute("role","toolbar");toolbar.setAttribute("aria-label",`${label} actions`);const close=()=>{toolbar.remove();document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",keydown);if(this.closeEntityContextMenu===close)this.closeEntityContextMenu=null;};const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!toolbar.contains(event.target))close();};const keydown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();close();anchor.focus?.();}};for(const action of actions){const item=this.iconButton(action.name,action.icon,action.iconName,()=>{close();action.action();},action.disabled);if(action.destructive)item.classList.add("destructive");toolbar.appendChild(item);}document.body.appendChild(toolbar);const anchorRect=anchor.getBoundingClientRect();const toolbarRect=toolbar.getBoundingClientRect();const margin=6;const gap=5;const maxLeft=Math.max(margin,window.innerWidth-toolbarRect.width-margin);const desiredLeft=anchorRect.left+(anchorRect.width-toolbarRect.width)/2;const left=Math.min(maxLeft,Math.max(margin,desiredLeft));const above=anchorRect.top-toolbarRect.height-gap;const desiredTop=above>=margin?above:anchorRect.bottom+gap;const maxTop=Math.max(margin,window.innerHeight-toolbarRect.height-margin);toolbar.style.left=`${left}px`;toolbar.style.top=`${Math.min(maxTop,Math.max(margin,desiredTop))}px`;this.closeEntityContextMenu=close;document.addEventListener("pointerdown",outside);document.addEventListener("keydown",keydown);toolbar.querySelector("button")?.focus();}
  private openV2VisualContextMenu(e:MouseEvent,trackId:string,kind:"segment"|"object",itemId:string,surface:"timeline"|"tree"):void {isolateTimelinePointerEvent(e);kind==="segment"?this.selectV2Segment(trackId,itemId,false):this.selectV2Object(trackId,itemId,false);const scene=getBackgroundSceneV2(globalThis);const track=scene&&findV2Track(scene,trackId);const item=kind==="segment"?track?.segments.find(value=>value.id===itemId):track?.objects.find(value=>value.id===itemId);const anchor=e.currentTarget instanceof HTMLElement?e.currentTarget:null;if(!scene||!track||!item||!anchor)return;const locked=item.locked===true;const readonly=kind==="segment"&&!canAuthorV2Segments(track);const disabled=locked||readonly;const edit=(patch:V2SegmentPatch|V2ObjectPatch)=>kind==="segment"?this.applyV2Edit(updateV2Segment(scene,trackId,itemId,patch as V2SegmentPatch)):this.applyV2ObjectEdit(updateV2Object(scene,trackId,itemId,patch as V2ObjectPatch));this.openV2EntityToolbar(e,anchor,v2EntityDisplayName(item),[{name:locked?"Unlock":"Lock",icon:locked?Unlock:Lock,iconName:locked?"Unlock":"Lock",disabled:readonly,action:()=>edit({locked:!locked})},{name:"Duplicate",icon:Copy,iconName:"Copy",disabled,action:()=>kind==="segment"?this.applyV2Edit(duplicateV2Segment(scene,trackId,itemId)):this.applyV2ObjectEdit(duplicateV2Object(scene,trackId,itemId))},{name:"Flip Horizontal",icon:FlipHorizontal2,iconName:"FlipHorizontal2",disabled,action:()=>edit({flipX:!item.flipX})},{name:"Flip Vertical",icon:FlipVertical2,iconName:"FlipVertical2",disabled,action:()=>edit({flipY:!item.flipY})},{name:"Rename",icon:Pencil,iconName:"Pencil",disabled,action:()=>{this.v2Rename={kind,trackId,id:itemId,surface};this.render();}},{name:"Delete",icon:Trash2,iconName:"Trash2",disabled,destructive:true,action:()=>kind==="segment"?this.applyV2Edit(deleteV2Segment(scene,trackId,itemId)):this.applyV2ObjectEdit(deleteV2Object(scene,trackId,itemId))}]);}
  private openV2EventContextMenu(e:MouseEvent,eventId:string,surface:"timeline"|"tree"):void {isolateTimelinePointerEvent(e);this.endV2EventDrag();this.selectV2Event(eventId,false);const scene=getBackgroundSceneV2(globalThis);const event=scene?.events?.find(item=>item.id===eventId);const anchor=e.currentTarget instanceof HTMLElement?e.currentTarget:null;if(!scene||!event||!anchor)return;const locked=event.locked===true;this.openV2EntityToolbar(e,anchor,v2EntityDisplayName(event),[{name:locked?"Unlock":"Lock",icon:locked?Unlock:Lock,iconName:locked?"Unlock":"Lock",action:()=>this.applyV2EventEdit(updateV2SceneEvent(scene,eventId,{locked:!locked}))},{name:"Duplicate",icon:Copy,iconName:"Copy",disabled:locked||event.type==="level-end",action:()=>this.applyV2EventEdit(duplicateV2SceneEvent(scene,eventId))},{name:"Rename",icon:Pencil,iconName:"Pencil",disabled:locked,action:()=>{this.v2Rename={kind:"event",id:eventId,surface};this.render();}},{name:"Delete",icon:Trash2,iconName:"Trash2",disabled:locked,destructive:true,action:()=>this.applyV2EventEdit(deleteV2SceneEvent(scene,eventId))}]);}
  private applyV2EventEdit(result:V2SceneEventEditResult):void {if(!result.ok){this.message=result.error;this.render();return;}this.message="";this.selectV2Event(result.eventId,false);setBackgroundSceneV2(result.scene,globalThis);}
  private beginV2EventDrag(e:PointerEvent,eventId:string,scale:TimelineScale):void {isolateTimelinePointerEvent(e);this.endV2EventDrag();const baseline=getBackgroundSceneV2(globalThis);if(!baseline)return;this.selectV2Event(eventId,false);if(baseline.events?.find(item=>item.id===eventId)?.locked)return;const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2EventDrag={pointerId:e.pointerId,eventId,startClientX:e.clientX,scale,baseline,captureTarget,active:true};window.addEventListener("pointermove",this.onV2EventPointerMove);window.addEventListener("pointerup",this.onV2EventPointerUp);window.addEventListener("pointercancel",this.onV2EventPointerUp);}
  private onV2EventPointerMove=(e:PointerEvent):void=>{const drag=this.v2EventDrag;if(!drag||drag.pointerId!==e.pointerId)return;isolateTimelinePointerEvent(e);const source=drag.baseline.events?.find(event=>event.id===drag.eventId);if(source)this.applyV2EventEdit(updateV2SceneEvent(drag.baseline,drag.eventId,{worldX:Math.max(0,Math.round((source.worldX+timelinePointerDeltaWorld(drag.startClientX,e.clientX,drag.scale))/16)*16)}));};
  private onV2EventPointerUp=(e:PointerEvent):void=>{if(this.v2EventDrag?.pointerId!==e.pointerId)return;isolateTimelinePointerEvent(e);this.endV2EventDrag();this.render();};
  private endV2EventDrag():void {const drag=this.v2EventDrag;if(!drag)return;drag.captureTarget?.releasePointerCapture?.(drag.pointerId);this.v2EventDrag=null;window.removeEventListener("pointermove",this.onV2EventPointerMove);window.removeEventListener("pointerup",this.onV2EventPointerUp);window.removeEventListener("pointercancel",this.onV2EventPointerUp);}

  private selectV2Event(eventId:string,render=true):void {this.v2SelectedEventId=eventId;if(render)this.render();}
  private selectV2Track(trackId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId="";this.v2SelectedObjectId="";this.v2PlacementTarget=null;if(render)this.render();}
  private selectV2Segment(trackId:string,segmentId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId=segmentId;this.v2SelectedObjectId="";const scene=getBackgroundSceneV2(globalThis);const segment=scene?findV2Segment(scene,trackId,segmentId):null;if(segment)this.v2SelectedAssetId=syncV2PickerAssetId(segment.asset.id);if(render)this.render();}
  private selectV2Object(trackId:string,objectId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId="";this.v2SelectedObjectId=objectId;const scene=getBackgroundSceneV2(globalThis);const object=scene?findV2Object(scene,trackId,objectId):null;if(object)this.v2SelectedAssetId=syncV2PickerAssetId(object.asset.id);if(render)this.render();}
  private renderV2ContextualYSurface():HTMLElement {
    const segment=this.selectedV2Segment();
    const object=segment?null:this.selectedV2Object();
    const surface=el("section","cm-v2-selected-y");
    const readout=el("span","cm-v2-y-readout");
    if(!segment&&!object){surface.dataset.contextualY="neutral";readout.textContent="Y —";surface.append(readout);return surface;}
    surface.dataset.contextualY="selection";surface.dataset.contextKind=segment?"segment":"object";
    const id=segment?.segment.id??object!.object.id;
    const value=segment?.segment.offsetY??object!.object.y;
    readout.textContent=`Y ${Math.round(value)}`;
    surface.title=id;surface.append(readout);return surface;
  }
  private renderV2YRail():HTMLElement {const segment=this.selectedV2Segment();const object=segment?null:this.selectedV2Object();const rail=el("div","cm-v2-y-rail");rail.dataset.yRail=segment||object?"selection":"neutral";if(segment||object)rail.dataset.contextKind=segment?"segment":"object";rail.setAttribute("role","slider");rail.setAttribute("aria-label","Relative vertical position scrubber");rail.setAttribute("aria-disabled",String(!segment&&!object));if(!segment&&!object)return rail;const thumb=el("span","cm-v2-y-rail-thumb");thumb.style.transform=`translateY(${this.v2YRailVisualOffset}px)`;rail.appendChild(thumb);rail.onpointerdown=e=>{const segment=this.selectedV2Segment();const object=segment?null:this.selectedV2Object();if(!segment&&!object||segment?.segment.locked||object?.object.locked)return;isolateTimelinePointerEvent(e);this.endV2YRailDrag();const rect=this.workspace.viewport.getBoundingClientRect();const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2YRailVisualOffset=0;this.v2YRailDrag={pointerId:e.pointerId,startClientY:e.clientY,originalY:segment?.segment.offsetY??object!.object.y,logicPerClientPx:rect.height>0?this.logicH/rect.height:1,kind:segment?"segment":"object",trackId:this.v2SelectedTrackId,itemId:segment?.segment.id??object!.object.id,baseline:(segment??object)!.scene,captureTarget,thumb};window.addEventListener("pointermove",this.onV2YRailPointerMove);window.addEventListener("pointerup",this.onV2YRailPointerUp);window.addEventListener("pointercancel",this.onV2YRailPointerUp);};return rail;}
  private onV2YRailPointerMove=(e:PointerEvent):void=>{const drag=this.v2YRailDrag;if(!drag||drag.pointerId!==e.pointerId)return;isolateTimelinePointerEvent(e);this.v2YRailVisualOffset=e.clientY-drag.startClientY;drag.thumb?.style.setProperty("transform",`translateY(${this.v2YRailVisualOffset}px)`);const y=v2YRailValue(drag,e.clientY);if(drag.kind==="segment")this.applyV2Edit(updateV2Segment(drag.baseline,drag.trackId,drag.itemId,{offsetY:y}));else this.applyV2ObjectEdit(updateV2Object(drag.baseline,drag.trackId,drag.itemId,{y}));};
  private onV2YRailPointerUp=(e:PointerEvent):void=>{if(this.v2YRailDrag?.pointerId!==e.pointerId)return;isolateTimelinePointerEvent(e);this.endV2YRailDrag();this.render();};
  private endV2YRailDrag():void {const drag=this.v2YRailDrag;if(!drag)return;drag.captureTarget?.releasePointerCapture?.(drag.pointerId);this.v2YRailDrag=null;this.v2YRailVisualOffset=0;window.removeEventListener("pointermove",this.onV2YRailPointerMove);window.removeEventListener("pointerup",this.onV2YRailPointerUp);window.removeEventListener("pointercancel",this.onV2YRailPointerUp);}
  private renderV2Inspector(scene:BackgroundSceneV2,bounds:{startX:number;endX:number}):HTMLElement {
    const inspector=el("section","cm-v2-inspector");inspector.dataset.inspector="selection";
    if(this.selectedV2Object()){inspector.append(this.inspectorHeading("OBJECT",this.v2SelectedObjectId),this.renderV2ObjectInspector());return inspector;}
    if(this.selectedV2Segment()){inspector.append(this.inspectorHeading("SEGMENT",this.v2SelectedSegmentId),this.renderV2SegmentInspector());return inspector;}
    const track=findV2Track(scene,this.v2SelectedTrackId);
    if(track){inspector.append(this.inspectorHeading("TRACK",track.id),this.renderV2TrackInspector(track));return inspector;}
    inspector.append(this.inspectorHeading("SCENE",""),this.renderPreview([],bounds));
    return inspector;
  }
  private inspectorHeading(kind:string,id:string):HTMLElement {const heading=el("h4","cm-v2-inspector-title");heading.textContent=id?`${kind} · ${id}`:kind;return heading;}
  private renderV2TrackInspector(track:BackgroundTrack):HTMLElement {
    const body=el("div","cm-pixel-props");
    body.append(this.row("name",document.createTextNode(track.name)),this.row("role",document.createTextNode(track.role)),this.row("mode",document.createTextNode(track.mode)),this.row("enabled",document.createTextNode(track.enabled?"yes":"no")),this.row("parallax X",document.createTextNode(String(track.parallax.x))),this.row("parallax Y",document.createTextNode(String(track.parallax.y))),this.row("zBase",document.createTextNode(String(track.zBase))),this.parallaxPolicyInfo());
    return body;
  }
  private applyV2TrackParallaxEdit(result: V2TrackParallaxEditResult): void {
    if(!result.ok){this.message=result.error;this.render();return;}
    this.message="";this.v2SelectedTrackId=result.trackId;setBackgroundSceneV2(result.scene,globalThis);
  }
  private applyV2Edit(result: V2SegmentEditResult): void {
    if (!result.ok) { this.message=result.error; this.render(); return; }
    this.message=""; this.v2SelectedTrackId=result.trackId; this.v2SelectedSegmentId=result.segmentId;
    this.v2SelectedObjectId="";
    setBackgroundSceneV2(result.scene,globalThis);
  }
  private applyV2ObjectEdit(result: V2ObjectEditResult): void {
    if(!result.ok){this.message=result.error;this.render();return;}
    this.message="";this.v2SelectedTrackId=result.trackId;this.v2SelectedSegmentId="";this.v2SelectedObjectId=result.objectId;
    setBackgroundSceneV2(result.scene,globalThis);
  }
  private selectedV2Segment(): {scene:BackgroundSceneV2;segment:BackgroundSegment}|null {
    const scene=getBackgroundSceneV2(globalThis); if(!scene)return null;
    const segment=findV2Segment(scene,this.v2SelectedTrackId,this.v2SelectedSegmentId); return segment?{scene,segment}:null;
  }
  private renderV2SegmentInspector(): HTMLElement {
    const p=el("div","cm-pixel-props"); const selected=this.selectedV2Segment();
    const scene=getBackgroundSceneV2(globalThis); const track=scene?findV2Track(scene,this.v2SelectedTrackId):null;
    if(!selected||!track){p.append("Segment inspector — select a segment. Sequence tracks retain M6 timeline editing; repeat tracks are read-only.",this.parallaxPolicyInfo());return p;}
    p.append(`Track ${track.id} · mode ${track.mode}`,document.createElement("br"),`Segment ID: ${selected.segment.id}`,document.createElement("br"),`Asset: ${selected.segment.asset.id} · ${selected.segment.asset.url}`);
    if(!canAuthorV2Segments(track)){p.append(document.createElement("br"),"Repeat segment authoring is limited/read-only: sequence placement semantics are not applied.",this.parallaxPolicyInfo());return p;}
    const patch=(value:V2SegmentPatch)=>this.applyV2Edit(updateV2Segment(selected.scene,track.id,selected.segment.id,value));
    p.append(this.row("startTrackX",num(selected.segment.startTrackX,16,v=>patch({startTrackX:v}))),this.row("widthPx",num(selected.segment.widthPx,16,v=>patch({widthPx:v}))),this.row("Y",this.numericStepper({value:selected.segment.offsetY,step:1,onCommit:v=>patch({offsetY:v})})),this.row("opacity",num(selected.segment.opacity,.05,v=>patch({opacity:v}))),this.row("localZ",num(selected.segment.localZ,1,v=>patch({localZ:v}))),this.row("fadeInPx",num(selected.segment.fadeInPx??0,1,v=>patch({fadeInPx:v}))),this.row("fadeOutPx",num(selected.segment.fadeOutPx??0,1,v=>patch({fadeOutPx:v}))),this.row("blend",this.select(selected.segment.blend,["normal","additive"],v=>patch({blend:v as "normal"|"additive"}))),this.row("enabled",check(selected.segment.enabled,v=>patch({enabled:v}))));
    const toolbar=el("div","cm-pixel-toolbar");toolbar.append(button("create",()=>this.applyV2Edit(createV2Segment(selected.scene,track.id,selected.segment.startTrackX+selected.segment.widthPx,selected.segment.id))),button("duplicate",()=>this.applyV2Edit(duplicateV2Segment(selected.scene,track.id,selected.segment.id))),button("delete",()=>this.applyV2Edit(deleteV2Segment(selected.scene,track.id,selected.segment.id))),button(this.v2PlacementTarget==="segment"?"exit canvas placement":"place segment on canvas",()=>{this.v2PlacementTarget=this.v2PlacementTarget==="segment"?null:"segment";this.endDrag();this.render();}));p.append(toolbar);
    const overlaps=calculateV2SegmentOverlaps(track.segments).filter(item=>item.segmentIds.includes(selected.segment.id));if(overlaps.length){const warning=el("div","cm-pixel-msg");warning.textContent=`Overlap information: ${overlaps.map(item=>`${item.startX}..${item.endX}`).join(", ")}`;p.append(warning);}if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}p.append(this.parallaxPolicyInfo());return p;
  }
  private selectedV2Object(): {scene:BackgroundSceneV2;object:BackgroundObject}|null {const scene=getBackgroundSceneV2(globalThis);if(!scene)return null;const object=findV2Object(scene,this.v2SelectedTrackId,this.v2SelectedObjectId);return object?{scene,object}:null;}
  private renderV2ObjectInspector(): HTMLElement {
    const p=el("div","cm-pixel-props");const selected=this.selectedV2Object();const scene=getBackgroundSceneV2(globalThis);const track=scene?findV2Track(scene,this.v2SelectedTrackId):null;
    if(!selected||!track){p.append("Object inspector — select an object marker, or create on the selected/default track from the shared asset catalog.");const first=scene?.tracks.find(item=>item.id===this.v2SelectedTrackId)??scene?.tracks[0];const asset=BACKGROUND_ASSET_CATALOG[0];if(first&&asset)p.append(button("create object",()=>this.applyV2ObjectEdit(createV2Object(scene!,first.id,{id:asset.id,url:asset.url},this.currentX(),0))));return p;}
    const object=selected.object;const patch=(value:V2ObjectPatch)=>this.applyV2ObjectEdit(updateV2Object(selected.scene,track.id,object.id,value));const optional=(value:number|undefined,key:"width"|"height")=>{const input=text(value===undefined?"":String(value),raw=>{if(raw.trim()==="")patch({[key]:undefined});else{const parsed=Number(raw);if(Number.isFinite(parsed))patch({[key]:parsed});}});input.type="number";return input;};
    const metadata=this.v2TextureInfo(object.asset.url);p.append(`Track ${track.id} · role ${track.role}`,document.createElement("br"),`Object ID: ${object.id}`,this.row("asset id",document.createTextNode(object.asset.id)),this.row("asset URL",document.createTextNode(object.asset.url)),this.row("texture metadata",document.createTextNode(metadata?`${metadata.state} ${metadata.width}x${metadata.height}`:"loading/unavailable")));
    const assetSelect=this.select(object.asset.id,BACKGROUND_ASSET_CATALOG.map(a=>a.id),id=>{const asset=BACKGROUND_ASSET_CATALOG.find(a=>a.id===id);if(asset)patch({asset:{id:asset.id,url:asset.url}});});p.append(this.row("asset",assetSelect),this.row("startTrackX",num(object.startTrackX,1,v=>patch({startTrackX:v}))),this.row("Y",this.numericStepper({value:object.y,step:1,onCommit:v=>patch({y:v})})),this.row("width",optional(object.width,"width")),this.row("height",optional(object.height,"height")),this.row("localZ",num(object.localZ,1,v=>patch({localZ:v}))),this.row("opacity",num(object.opacity,.05,v=>patch({opacity:v}))),this.row("blend",this.select(object.blend,["normal","additive"],v=>patch({blend:v as "normal"|"additive"}))),this.row("enabled",check(object.enabled,v=>patch({enabled:v}))));
    const toolbar=el("div","cm-pixel-toolbar");toolbar.append(button("create",()=>{const asset=BACKGROUND_ASSET_CATALOG.find(a=>a.id===object.asset.id)!;this.applyV2ObjectEdit(createV2Object(selected.scene,track.id,{id:asset?.id??object.asset.id,url:asset?.url??object.asset.url},object.startTrackX+16,object.y));}),button("duplicate",()=>this.applyV2ObjectEdit(duplicateV2Object(selected.scene,track.id,object.id))),button("delete",()=>{this.v2PlacementTarget=null;this.applyV2ObjectEdit(deleteV2Object(selected.scene,track.id,object.id));}),button(this.v2PlacementTarget==="object"?"exit canvas placement":"place object on canvas",()=>{this.v2PlacementTarget=this.v2PlacementTarget==="object"?null:"object";this.endDrag();this.render();}));p.append(toolbar);if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}return p;
  }
  private parallaxPolicyInfo(): HTMLElement { const info=el("div","cm-v2-info"); info.dataset.policy=V2_PARALLAX_AUTHORING_POLICY; info.textContent="Parallax edits preserve stored track-space geometry; projected world-X timing changes."; return info; }
  private beginV2ObjectDrag(e:PointerEvent,trackId:string,objectId:string,scale:TimelineScale):void { isolateTimelinePointerEvent(e);this.endV2ObjectDrag();const baseline=getBackgroundSceneV2(globalThis);if(!baseline)return;this.selectV2Object(trackId,objectId,false);if(findV2Object(baseline,trackId,objectId)?.locked)return;const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2ObjectDrag={pointerId:e.pointerId,trackId,objectId,startClientX:e.clientX,scale,baseline,captureTarget,active:true};window.addEventListener("pointermove",this.onV2ObjectPointerMove);window.addEventListener("pointerup",this.onV2ObjectPointerUp);window.addEventListener("pointercancel",this.onV2ObjectPointerUp); }
  private onV2ObjectPointerMove=(e:PointerEvent):void=>{const drag=this.v2ObjectDrag;if(!drag||!shouldHandleTimelinePointerEvent(drag,e.pointerId))return;isolateTimelinePointerEvent(e);const object=findV2Object(drag.baseline,drag.trackId,drag.objectId);if(object)this.applyV2ObjectEdit(moveV2Object(drag.baseline,drag.trackId,drag.objectId,object.startTrackX+timelinePointerDeltaWorld(drag.startClientX,e.clientX,drag.scale),object.y));};
  private onV2ObjectPointerUp=(e:PointerEvent):void=>{if(!this.v2ObjectDrag||!shouldHandleTimelinePointerEvent(this.v2ObjectDrag,e.pointerId))return;isolateTimelinePointerEvent(e);this.endV2ObjectDrag();this.render();};
  private endV2ObjectDrag():void {const drag=this.v2ObjectDrag;if(!drag)return;drag.captureTarget?.releasePointerCapture?.(drag.pointerId);this.v2ObjectDrag=null;window.removeEventListener("pointermove",this.onV2ObjectPointerMove);window.removeEventListener("pointerup",this.onV2ObjectPointerUp);window.removeEventListener("pointercancel",this.onV2ObjectPointerUp);}
  private beginV2SegmentDrag(e:PointerEvent,trackId:string,segmentId:string,mode:V2SegmentDragMode,scale:TimelineScale):void { isolateTimelinePointerEvent(e);this.endV2SegmentDrag();const baseline=getBackgroundSceneV2(globalThis);if(!baseline)return;this.selectV2Segment(trackId,segmentId,false);if(findV2Segment(baseline,trackId,segmentId)?.locked)return;const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2SegmentDrag={pointerId:e.pointerId,trackId,segmentId,mode,startClientX:e.clientX,scale,baseline,captureTarget,active:true};window.addEventListener("pointermove",this.onV2SegmentPointerMove);window.addEventListener("pointerup",this.onV2SegmentPointerUp);window.addEventListener("pointercancel",this.onV2SegmentPointerUp); }
  private onV2SegmentPointerMove=(e:PointerEvent):void=>{const drag=this.v2SegmentDrag;if(!drag||!shouldHandleTimelinePointerEvent(drag,e.pointerId))return;isolateTimelinePointerEvent(e);this.applyV2Edit(applyV2SegmentDrag(drag.baseline,drag.trackId,drag.segmentId,drag.mode,timelinePointerDeltaWorld(drag.startClientX,e.clientX,drag.scale)));};
  private onV2SegmentPointerUp=(e:PointerEvent):void=>{if(!this.v2SegmentDrag||!shouldHandleTimelinePointerEvent(this.v2SegmentDrag,e.pointerId))return;isolateTimelinePointerEvent(e);this.endV2SegmentDrag();this.render();};
  private endV2SegmentDrag():void {const drag=this.v2SegmentDrag;if(!drag)return;drag.captureTarget?.releasePointerCapture?.(drag.pointerId);this.v2SegmentDrag=null;window.removeEventListener("pointermove",this.onV2SegmentPointerMove);window.removeEventListener("pointerup",this.onV2SegmentPointerUp);window.removeEventListener("pointercancel",this.onV2SegmentPointerUp);}
  private renderSceneToolbar(): HTMLElement {
    const p=el("div","cm-scene-action-row"); p.dataset.sceneActions="true";
    p.append(
      this.iconButton("Load current scene",FolderOpen,"FolderOpen",()=>this.toggleSceneMenu()),
      this.iconButton("Export scene",Download,"Download",()=>this.exportFile()),
      this.iconButton("Import scene",Upload,"Upload",()=>this.importFile()),
      this.iconButton("Duplicate scene",Copy,"Copy",()=>this.setDraft({...cloneScene(this.draft), id: `${this.draft.id || "scene"}-copy`})),
      this.iconButton("Reset or delete scene",Trash2,"Trash2",()=>{ if(confirm("Reset Scene Lab draft to the B2 demo scene?")){ clearDraft(localStorage); this.owner={kind:"global"}; this.selectedLayerId=""; this.setDraft(createDemoScene()); }}),
      this.iconButton("Close Scene Lab",X,"X",()=>this.close()));
    if(this.sceneMenuOpen) p.appendChild(this.renderSceneMenu());
    return p;
  }
  private renderSceneTab(): HTMLElement { const p=el("div","cm-pixel-panel"); p.append(this.renderPreview()); return p; }
  private selectedChunkId(): string { return this.owner.kind === "chunk" ? (this.owner as {kind:"chunk";chunkId:string}).chunkId : ""; }
  private selectedChunk() { const id=this.selectedChunkId(); return id ? this.draft.chunks.find(c=>c.id===id) ?? null : null; }
  private selectChunk(chunkId: string): void { this.owner={kind:"chunk",chunkId}; this.selectedLayerId=this.currentLayers()[0]?.id ?? ""; this.activeTab="layers"; this.render(); }
  private renderTimelineSection(): HTMLElement {
    const p=el("div","cm-pixel-panel");
    p.append("Chunk timeline — one line, intervals are [startX, startX + length)");
    const currentX=this.currentX();
    const bounds=sceneTimelineBounds(this.draft.chunks, 0);
    const scale=createTimelineScale(this.draft.chunks, currentX, 1000);
    const timeline=el("div","cm-timeline");
    timeline.onpointerdown=(e)=>{ if (this.timelineDrag || this.cursorDrag) return; if (!this.isTimelinePlacementTarget(e.target, timeline)) return; isolateTimelinePointerEvent(e); const rect=timeline.getBoundingClientRect(); const x=Math.round(clickedTimelineCurrentX(e.clientX, rect.left, scale, bounds.startX, bounds.endX, rect.width)); this.setCurrentX(x, true); this.render(); };
    const ruler=el("div","cm-ruler");
    const tickStep=Math.max(100, Math.round((scale.maxX-scale.minX)/5/50)*50);
    for(let x=Math.ceil(scale.minX/tickStep)*tickStep; x<=scale.maxX; x+=tickStep){ const t=el("div","cm-ruler-tick"); t.style.left=`${worldToTimelinePx(x,scale)/10}%`; t.textContent=String(x); ruler.appendChild(t); }
    timeline.appendChild(ruler);
    timeline.appendChild(el("div","cm-chunk-line"));
    for(const r of chunkOverlapRanges(this.draft.chunks)){ const o=el("div","cm-overlap"); o.title=`Overlap ${r.startX}..${r.endX}`; o.style.left=`${worldToTimelinePx(r.startX,scale)/10}%`; o.style.width=`${(worldToTimelinePx(r.endX,scale)-worldToTimelinePx(r.startX,scale))/10}%`; timeline.appendChild(o); }
    for(const block of chunkTimelineBlocks(this.draft.chunks,this.selectedChunkId(),scale)){ const b=button(`${block.id} ${block.startX}..${block.endX}`,()=>this.selectChunk(block.id)); b.className=`cm-chunk-block${block.selected?" sel":""}${this.timelineDrag?.chunkId===block.id?" dragging":""}`; b.style.left=`${block.leftPx/10}%`; b.style.width=`${block.widthPx/10}%`; b.onpointerdown=(e)=>this.beginTimelineDrag(e, block.id, "move", scale); const left=el("span","cm-chunk-handle left"); left.title="Drag left edge"; left.onpointerdown=(e)=>this.beginTimelineDrag(e, block.id, "resize-left", scale); const right=el("span","cm-chunk-handle right"); right.title="Drag right edge"; right.onpointerdown=(e)=>this.beginTimelineDrag(e, block.id, "resize-right", scale); b.append(left,right); timeline.appendChild(b); }
    const markers=el("div","cm-marker-row"); markers.title="Global markers (purple) and selected chunk markers (green)";
    for(const m of this.draft.markers ?? []){ const d=el("div","cm-marker-dot"); d.style.left=`${worldToTimelinePx(m.x,scale)/10}%`; d.title=`global ${m.id} @ ${m.x}`; markers.appendChild(d); }
    const selected=this.selectedChunk();
    if(selected) for(const m of selected.markers ?? []){ const d=el("div","cm-marker-dot chunk"); const x=selected.startX+m.x; d.style.left=`${worldToTimelinePx(x,scale)/10}%`; d.title=`${selected.id}/${m.id} @ ${x}`; markers.appendChild(d); }
    timeline.appendChild(markers);
    const cursor=el("div","cm-cursor"); cursor.style.left=`${worldToTimelinePx(currentX,scale)/10}%`; cursor.title=`Drag Current X cursor ${Math.round(currentX)}`; cursor.onpointerdown=(e)=>this.beginCursorDrag(e, timeline, scale); this.cursorEl=cursor; timeline.appendChild(cursor);
    p.appendChild(timeline);
    const controls=el("div","cm-pixel-toolbar");
    controls.append(button("+ chunk after last",()=>{ const next=addChunk(this.draft); const id=next.chunks[next.chunks.length - 1]?.id; if(id)this.owner={kind:"chunk",chunkId:id}; this.setDraft(next); }), this.renderPreview());
    p.appendChild(controls);
    p.appendChild(this.renderSelectedChunkInspector());
    return p;
  }
  private renderSelectedChunkInspector(): HTMLElement {
    const p=el("div","cm-pixel-panel cm-chunk-inspector"); const c=this.selectedChunk();
    if(!c){ p.append("Select a chunk block to edit chunk details. Global layers remain available in the tabs below."); return p; }
    const overlaps=overlapsForChunk(c.id,this.draft.chunks);
    p.append(`Selected chunk inspector: ${c.id}`,
      this.row("id",text(c.id,v=>this.setDraft(updateChunk(this.draft,c.id,{id:v})))),
      this.row("startX",this.numericStepper({value:c.startX,step:16,onCommit:v=>this.setDraft(updateChunk(this.draft,c.id,{startX:v}))})),
      this.row("length",this.numericStepper({value:c.length,step:16,min:1,onCommit:v=>this.setDraft(updateChunk(this.draft,c.id,{length:v}))})),
      this.row("endX",document.createTextNode(String(chunkEndX(c)))),
      this.row("overlaps",document.createTextNode(overlaps.length ? overlaps.map(o=>`${o.startX}..${o.endX}`).join(", ") : "none")),
      this.row("layers",document.createTextNode(String(c.layers.length))),
      this.row("markers",document.createTextNode(String((c.markers ?? []).length))));
    p.append(button("chunk layers",()=>{this.activeTab="layers";this.render();}), button("add marker",()=>{ this.selectedMarkerId=""; this.activeTab="markers"; this.setDraft(addMarker(this.draft,{kind:"chunk",chunkId:c.id})); }));
    return p;
  }
  private beginTimelineDrag(e: PointerEvent, chunkId: string, mode: ChunkTimelineDragMode, scale: TimelineScale): void {
    const chunk=this.draft.chunks.find(c=>c.id===chunkId); if(!chunk) return;
    isolateTimelinePointerEvent(e);
    this.owner={kind:"chunk",chunkId}; this.selectedLayerId=this.currentLayers()[0]?.id ?? "";
    const captureTarget = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    captureTarget?.setPointerCapture?.(e.pointerId);
    this.timelineDrag={pointerId:e.pointerId,chunkId,mode,startClientX:e.clientX,startX:chunk.startX,length:chunk.length,scale,captureTarget,active:true};
    window.addEventListener("pointermove", this.onTimelinePointerMove);
    window.addEventListener("pointerup", this.onTimelinePointerUp);
    window.addEventListener("pointercancel", this.onTimelinePointerUp);
    this.render();
  }
  private onTimelinePointerMove = (e: PointerEvent): void => {
    const drag=this.timelineDrag; if(!drag || !shouldHandleTimelinePointerEvent(drag, e.pointerId)) return;
    isolateTimelinePointerEvent(e);
    const deltaWorld=timelinePointerDeltaWorld(drag.startClientX, e.clientX, drag.scale);
    const next=applyChunkTimelineDrag({startX:drag.startX,length:drag.length}, drag.mode, deltaWorld, {snapPx:DEFAULT_CHUNK_TIMELINE_SNAP_PX,minStartX:0,minLength:MIN_CHUNK_TIMELINE_LENGTH});
    this.setDraft(updateChunk(this.draft, drag.chunkId, next), false);
  };
  private onTimelinePointerUp = (e: PointerEvent): void => {
    const drag=this.timelineDrag; if(!drag || !shouldHandleTimelinePointerEvent(drag, e.pointerId)) return;
    isolateTimelinePointerEvent(e);
    drag.captureTarget?.releasePointerCapture?.(drag.pointerId);
    this.timelineDrag=null;
    window.removeEventListener("pointermove", this.onTimelinePointerMove);
    window.removeEventListener("pointerup", this.onTimelinePointerUp);
    window.removeEventListener("pointercancel", this.onTimelinePointerUp);
    saveDraft(localStorage,this.draft);
    this.render();
  };
  private endTimelineDrag(): void {
    if(!this.timelineDrag) return;
    this.timelineDrag.captureTarget?.releasePointerCapture?.(this.timelineDrag.pointerId);
    this.timelineDrag=null;
    window.removeEventListener("pointermove", this.onTimelinePointerMove);
    window.removeEventListener("pointerup", this.onTimelinePointerUp);
    window.removeEventListener("pointercancel", this.onTimelinePointerUp);
  }

  private beginCursorDrag(e: PointerEvent, timeline: HTMLElement, scale: TimelineScale, explicitBounds?: {startX:number;endX:number}): void {
    isolateTimelinePointerEvent(e);
    const captureTarget = e.currentTarget instanceof HTMLElement ? e.currentTarget : timeline;
    captureTarget.setPointerCapture?.(e.pointerId);
    const bounds=explicitBounds ?? sceneTimelineBounds(this.draft.chunks, 0);
    this.setTimelineInputGuard(true);
    this.cursorDrag={pointerId:e.pointerId,scale,timeline,minX:bounds.startX,maxX:bounds.endX,captureTarget,active:true};
    window.addEventListener("pointermove", this.onCursorPointerMove, {capture:true, passive:false});
    window.addEventListener("pointerup", this.onCursorPointerUp, {capture:true, passive:false});
    window.addEventListener("pointercancel", this.onCursorPointerUp, {capture:true, passive:false});
    this.updateCursorDrag(e);
  }
  private updateCursorDrag(e: PointerEvent): void {
    const drag=this.cursorDrag; if(!drag || !shouldHandleTimelinePointerEvent(drag, e.pointerId)) return;
    const rect=drag.timeline.getBoundingClientRect();
    const x=Math.round(cursorDragCurrentX({currentClientX:e.clientX,timelineLeft:rect.left,timelineWidthPx:rect.width,scale:drag.scale,minX:drag.minX,maxX:drag.maxX}));
    this.setCurrentX(x, true);
    const leftPx=worldToTimelinePx(x,{...drag.scale,widthPx:Math.max(1,rect.width)});
    if(this.cursorEl===this.v2CursorEl)this.v2LastCursorPx=this.setV2IndicatorX(this.v2CursorEl,leftPx,this.v2LastCursorPx);
    else if(this.cursorEl) this.cursorEl.style.left=`${leftPx}px`;
    this.syncOverlay();
  }
  private onCursorPointerMove = (e: PointerEvent): void => {
    if(!shouldHandleTimelinePointerEvent(this.cursorDrag, e.pointerId)) return;
    isolateTimelinePointerEvent(e);
    this.updateCursorDrag(e);
  };
  private onCursorPointerUp = (e: PointerEvent): void => {
    const drag=this.cursorDrag; if(!drag || !shouldHandleTimelinePointerEvent(drag, e.pointerId)) return;
    isolateTimelinePointerEvent(e);
    drag.captureTarget?.releasePointerCapture?.(drag.pointerId);
    this.cursorDrag=null;
    this.setTimelineInputGuard(false);
    window.removeEventListener("pointermove", this.onCursorPointerMove, true);
    window.removeEventListener("pointerup", this.onCursorPointerUp, true);
    window.removeEventListener("pointercancel", this.onCursorPointerUp, true);
    this.render();
  };
  private endCursorDrag(): void {
    if(!this.cursorDrag) return;
    this.cursorDrag.captureTarget?.releasePointerCapture?.(this.cursorDrag.pointerId);
    this.cursorDrag=null;
    this.setTimelineInputGuard(false);
    window.removeEventListener("pointermove", this.onCursorPointerMove, true);
    window.removeEventListener("pointerup", this.onCursorPointerUp, true);
    window.removeEventListener("pointercancel", this.onCursorPointerUp, true);
  }
  private isTimelinePlacementTarget(target: EventTarget | null, timeline: HTMLElement): boolean {
    return target === timeline || (target instanceof HTMLElement && target.classList.contains("cm-ruler"));
  }
  private renderChunks(): HTMLElement { const p=el("div","cm-pixel-panel"); p.append("Chunks (authored order; end shown) "); const list=el("div","cm-pixel-list"); const g=button("Global layers",()=>this.setOwner({kind:"global"})); if(this.owner.kind==="global") g.className="sel"; list.appendChild(g); for(const c of this.draft.chunks){ const b=button(`${c.id} [${c.startX}..${c.startX+c.length}]`,()=>this.setOwner({kind:"chunk",chunkId:c.id})); if(this.owner.kind==="chunk"&&(this.owner as {kind:"chunk";chunkId:string}).chunkId===c.id)b.className="sel"; list.appendChild(b);} p.appendChild(list); p.append(button("add",()=>this.setDraft(addChunk(this.draft))),button("duplicate",()=>{if(this.owner.kind==="chunk")this.setDraft(duplicateChunk(this.draft,(this.owner as {kind:"chunk";chunkId:string}).chunkId));}),button("delete",()=>{if(this.owner.kind==="chunk"&&confirm(`Delete chunk ${(this.owner as {kind:"chunk";chunkId:string}).chunkId}?`)){this.setDraft(deleteChunk(this.draft,(this.owner as {kind:"chunk";chunkId:string}).chunkId));this.owner={kind:"global"};this.activeTab="chunks";}}),button("↑",()=>{if(this.owner.kind==="chunk")this.setDraft(moveChunk(this.draft,(this.owner as {kind:"chunk";chunkId:string}).chunkId,-1));}),button("↓",()=>{if(this.owner.kind==="chunk")this.setDraft(moveChunk(this.draft,(this.owner as {kind:"chunk";chunkId:string}).chunkId,1));})); if(this.owner.kind==="chunk"){ const c=this.draft.chunks.find(x=>x.id===(this.owner as {kind:"chunk";chunkId:string}).chunkId); if(c){ p.append(el("hr"), "Selected chunk", this.row("id",text(c.id,v=>this.setDraft(updateChunk(this.draft,c.id,{id:v})))),this.row("startX",this.numericStepper({value:c.startX,step:16,onCommit:v=>this.setDraft(updateChunk(this.draft,c.id,{startX:v}))})),this.row("length",this.numericStepper({value:c.length,step:16,min:1,onCommit:v=>this.setDraft(updateChunk(this.draft,c.id,{length:v}))}))); }} return p; }
  private renderLayers(): HTMLElement { const p=el("div","cm-pixel-panel"); p.append(`Layers: ${this.owner.kind}${this.owner.kind==="chunk" ? ` ${(this.owner as {kind:"chunk";chunkId:string}).chunkId}` : ""}`); const list=el("div","cm-pixel-list"); for(const l of this.currentLayers()){ const b=button(`${l.enabled?"✓":"·"} ${l.id} (${l.kind})`,()=>{this.selectedLayerId=l.id;this.activeTab="properties";this.render();}); if(l.id===this.selectedLayerId)b.className="sel"; list.appendChild(b);} p.appendChild(list); p.append(button("add sprite",()=>{this.activeTab="layers"; this.setDraft(addLayer(this.draft,this.owner));}),button("duplicate",()=>this.selectedLayerId&&this.setDraft(duplicateLayer(this.draft,this.owner,this.selectedLayerId))),button("delete",()=>{if(this.selectedLayerId&&confirm(`Delete layer ${this.selectedLayerId}?`)){const next=deleteLayer(this.draft,this.owner,this.selectedLayerId); const nextLayers=layerOwner(next,this.owner); this.selectedLayerId=nextLayers[0]?.id??""; this.activeTab=pixelBgrLabTabAfterLayerDelete(this.activeTab, Boolean(this.selectedLayerId)); this.setDraft(next);}}),button("toggle",()=>this.patchLayer(l=>({...l,enabled:!l.enabled} as BackgroundLayer))),button("↑",()=>this.selectedLayerId&&this.setDraft(moveLayer(this.draft,this.owner,this.selectedLayerId,-1))),button("↓",()=>this.selectedLayerId&&this.setDraft(moveLayer(this.draft,this.owner,this.selectedLayerId,1)))); return p; }
  private row(label:string,node:Node): HTMLDivElement { const r=el("div","cm-pixel-row"); const l=el("label"); l.textContent=label; r.append(l,node); return r; }
  private numericStepper(options: NumericStepperOptions): HTMLElement { const wrap=el("div","cm-pixel-stepper"); const commit=(v:number)=>options.onCommit(v); const input=num(options.displayValue??options.value,options.step,commit); const stepBase=()=>options.displayValue===undefined?Number(input.value):options.value; input.onkeydown=e=>{ if(e.key==="ArrowUp"||e.key==="ArrowDown"){ e.preventDefault(); commit(stepNumericValue(stepBase(), e.key==="ArrowUp" ? 1 : -1, {...options, step: options.step*(e.shiftKey?10:1)})); return; } if(e.key==="Enter") input.blur(); if(e.key==="Escape"){ input.value=String(options.displayValue??options.value); input.blur(); } }; wrap.append(button("−",()=>commit(stepNumericValue(stepBase(),-1,options))),input,button("+",()=>commit(stepNumericValue(stepBase(),1,options)))); return wrap; }
  private renderValidationSummary(errors: any[], warnings: any[]): HTMLElement { const box=el("div","cm-pixel-msg"); if(this.message){ box.append(this.message); return box; } const summary=validationSummaryState(errors,warnings,this.warningsExpanded ?? undefined); this.warningsExpanded = summary.expanded; const b=button(summary.label,()=>{ if(summary.hasDetails){ this.warningsExpanded=toggleValidationExpanded(summary.expanded); this.render(); } }); b.className="cm-pixel-summary"; box.appendChild(b); if(summary.hasDetails&&summary.expanded) box.append(document.createTextNode("\n"), ...[...errors,...warnings].map(i=>document.createTextNode(`${i.level}: ${i.path}: ${i.message}\n`))); return box; }
  private renderProps(): HTMLElement { const p=el("div","cm-pixel-panel cm-pixel-props"); const l=this.selectedLayer(); if(!l){p.append("No selected layer. Choose one in Layers."); return p;} p.append(`Layer properties (${l.kind})`); p.append(this.row("id",text(l.id,v=>this.patchLayer(x=>({...x,id:v} as BackgroundLayer)))),this.row("enabled",check(l.enabled,v=>this.patchLayer(x=>({...x,enabled:v} as BackgroundLayer))))); if(l.kind==="sprite"){ const s=l as SpriteBackgroundLayer; const patch=(f:(x:SpriteBackgroundLayer)=>SpriteBackgroundLayer)=>this.patchLayer(x=>x.kind==="sprite"?f(x):x); p.append(this.row("texture",text(s.texture.url,v=>patch(x=>({...x,texture:{...x.texture,url:v}})))),this.row("opacity",this.numericStepper({value:s.opacity,step:.05,min:0,max:1,onCommit:v=>patch(x=>({...x,opacity:v}))})),this.row("blend",this.select(s.blend,["normal","additive"],v=>patch(x=>({...x,blend:v as any})))),this.row("parallax X",this.numericStepper({value:s.parallax.x,step:.05,onCommit:v=>patch(x=>({...x,parallax:{...x.parallax,x:v}}))})),this.row("parallax Y",this.numericStepper({value:s.parallax.y,step:.05,onCommit:v=>patch(x=>({...x,parallax:{...x.parallax,y:v}}))})),this.row("offset X",this.numericStepper({value:s.offset.x,step:this.nudgeStep,onCommit:v=>patch(x=>({...x,offset:{...x.offset,x:v}}))})),this.row("offset Y",this.numericStepper({value:s.offset.y,step:this.nudgeStep,onCommit:v=>patch(x=>({...x,offset:{...x.offset,y:v}}))})),this.row("repeat X",check(s.repeat.x,v=>patch(x=>({...x,repeat:{...x.repeat,x:v}})))),this.row("repeat Y",check(s.repeat.y,v=>patch(x=>({...x,repeat:{...x.repeat,y:v}})))),this.row("filtering",document.createTextNode(s.texture.filtering))); } else p.append(this.row("typed fields",document.createTextNode(JSON.stringify(l)))); return p; }
  private renderPlacementTab(): HTMLElement { const l=this.selectedLayer(); const p=el("div","cm-pixel-panel cm-pixel-props"); if(l?.kind!=="sprite"){ p.append("Select a sprite layer to use visual placement.", this.renderPreview()); return p; } p.appendChild(this.renderVisualPlacement(l as SpriteBackgroundLayer)); p.appendChild(this.renderPreview()); return p; }


  private markerOwner(): MarkerOwner { return this.owner.kind === "chunk" ? { kind: "chunk", chunkId: (this.owner as {kind:"chunk";chunkId:string}).chunkId } : { kind: "global" }; }
  private layerTargets(): Array<{ id: string; label: string }> { const out = this.draft.globalLayers.map(l => ({ id: globalRuntimeLayerId(l.id), label: `Global / ${l.id}` })); for (const c of this.draft.chunks) for (const l of c.layers) out.push({ id: chunkRuntimeLayerId(c.id, l.id), label: `${c.id} / ${l.id}` }); return out; }
  private targetSelect(value: string, fn: (v: string) => void): HTMLSelectElement { const targets=this.layerTargets(); const s=el("select"); if(value && !targets.some(t=>t.id===value)){ const o=el("option"); o.value=value; o.textContent=`Missing: ${value}`; o.selected=true; s.appendChild(o); } for(const t of targets){ const o=el("option"); o.value=t.id; o.textContent=t.label; o.selected=t.id===value; s.appendChild(o); } s.oninput=()=>fn(s.value); return s; }
  private selectedMarker() { return markerOwner(this.draft, this.markerOwner()).find(m => m.id === this.selectedMarkerId) ?? null; }
  private markerRuntimeId(): string { const owner=this.markerOwner(); return owner.kind === "global" ? globalMarkerRuntimeId(this.selectedMarkerId) : chunkMarkerRuntimeId(owner.chunkId, this.selectedMarkerId); }
  private renderMarkersTab(): HTMLElement { const p=el("div","cm-pixel-panel"); const owner=this.markerOwner(); const markers=markerOwner(this.draft, owner); p.append(`Markers: ${owner.kind}${owner.kind==="chunk"?` ${(owner as {kind:"chunk";chunkId:string}).chunkId}`:""}`); const list=el("div","cm-pixel-list"); for(const m of markers){ const b=button(`${m.enabled?"✓":"·"} ${m.id} @ ${m.x}`,()=>{this.selectedMarkerId=m.id;this.selectedActionIndex=-1;this.render();}); if(m.id===this.selectedMarkerId)b.className="sel"; list.appendChild(b); } p.appendChild(list); p.append(button("add",()=>{this.activeTab="markers";this.setDraft(addMarker(this.draft,owner));}),button("duplicate",()=>this.selectedMarkerId&&this.setDraft(duplicateMarker(this.draft,owner,this.selectedMarkerId))),button("delete",()=>{if(this.selectedMarkerId){const next=deleteMarker(this.draft,owner,this.selectedMarkerId); this.selectedMarkerId=markerOwner(next,owner)[0]?.id??""; this.setDraft(next);}}),button("toggle",()=>this.selectedMarkerId&&this.setDraft(toggleMarker(this.draft,owner,this.selectedMarkerId))),button("↑",()=>this.selectedMarkerId&&this.setDraft(moveMarker(this.draft,owner,this.selectedMarkerId,-1))),button("↓",()=>this.selectedMarkerId&&this.setDraft(moveMarker(this.draft,owner,this.selectedMarkerId,1)))); const m=this.selectedMarker(); if(m){ p.append(el("hr"), this.row("id", text(m.id,v=>this.setDraft(updateMarker(this.draft,owner,m.id,x=>({...x,id:v}))))), this.row("x", this.numericStepper({value:m.x,step:16,onCommit:v=>this.setDraft(updateMarker(this.draft,owner,m.id,x=>({...x,x:v})))})), this.row("enabled", check(m.enabled,v=>this.setDraft(updateMarker(this.draft,owner,m.id,x=>({...x,enabled:v}))))), this.row("once", check(m.once,v=>this.setDraft(updateMarker(this.draft,owner,m.id,x=>({...x,once:v})))))); const actions=el("div","cm-pixel-list"); m.actions.forEach((a,i)=>{ const b=button(`${i+1}. ${a.kind}`,()=>{this.selectedActionIndex=i;this.render();}); if(i===this.selectedActionIndex)b.className="sel"; actions.appendChild(b); }); p.append("Actions",actions, button("add",()=>this.setDraft(addMarkerAction(this.draft,owner,m.id))), button("duplicate",()=>this.setDraft(duplicateMarkerAction(this.draft,owner,m.id,this.selectedActionIndex))), button("delete",()=>this.setDraft(deleteMarkerAction(this.draft,owner,m.id,this.selectedActionIndex))), button("↑",()=>this.setDraft(moveMarkerAction(this.draft,owner,m.id,this.selectedActionIndex,-1))), button("↓",()=>this.setDraft(moveMarkerAction(this.draft,owner,m.id,this.selectedActionIndex,1)))); const a=m.actions[this.selectedActionIndex]; if(a) p.appendChild(this.renderMarkerActionEditor(owner,m.id,this.selectedActionIndex,a)); }
    const debug=(globalThis as any).__CM_BGR_MARKER_DEBUG__ ?? {}; p.append(el("hr"), button("Reset marker runtime",()=>{requestBackgroundMarkerRuntimeReset(globalThis);this.render();}), button("Fire selected marker now",()=>{ if(this.selectedMarkerId)(globalThis as any).__CM_BGR_MARKER_MANUAL_FIRE__=this.markerRuntimeId(); this.render(); }), document.createElement("br"), document.createTextNode(`Last fired marker: ${debug.lastFiredMarker ?? "none"}`), document.createElement("br"), document.createTextNode(`Last environment event: ${debug.lastEnvironmentEvent?.name ?? "none"}`), this.renderPreview()); return p; }
  private renderMarkerActionEditor(owner: MarkerOwner, markerId: string, index: number, action: BackgroundMarkerAction): HTMLElement {
    const p = el("div", "cm-pixel-panel");
    const kinds = ["set-layer-enabled", "set-layer-opacity", "pulse-layer-opacity", "emit-environment-event"];
    p.append(this.row("kind", this.select(action.kind, kinds, (k) => {
      const next = k === "set-layer-enabled" ? { kind: k, layerId: "", enabled: true }
        : k === "pulse-layer-opacity" ? { kind: k, layerId: "", from: 0, to: 1, durationMs: 500 }
        : k === "emit-environment-event" ? { kind: k, event: "environment-event" }
        : { kind: k, layerId: "", opacity: 1 };
      this.setDraft(updateMarkerAction(this.draft, owner, markerId, index, () => next as BackgroundMarkerAction));
    })));
    const patch = (f: (a: BackgroundMarkerAction) => BackgroundMarkerAction) => this.setDraft(updateMarkerAction(this.draft, owner, markerId, index, f));
    if (action.kind === "set-layer-enabled") p.append(this.row("target", this.targetSelect(action.layerId, v => patch(a => ({ ...a, layerId: v } as BackgroundMarkerAction)))), this.row("enabled", check(action.enabled, v => patch(a => ({ ...a, enabled: v } as BackgroundMarkerAction)))));
    else if (action.kind === "set-layer-opacity") p.append(this.row("target", this.targetSelect(action.layerId, v => patch(a => ({ ...a, layerId: v } as BackgroundMarkerAction)))), this.row("opacity", this.numericStepper({ value: action.opacity, step: .05, min: 0, max: 1, onCommit: v => patch(a => ({ ...a, opacity: v } as BackgroundMarkerAction)) })));
    else if (action.kind === "pulse-layer-opacity") p.append(this.row("target", this.targetSelect(action.layerId, v => patch(a => ({ ...a, layerId: v } as BackgroundMarkerAction)))), this.row("from", this.numericStepper({ value: action.from, step: .05, min: 0, max: 1, onCommit: v => patch(a => ({ ...a, from: v } as BackgroundMarkerAction)) })), this.row("to", this.numericStepper({ value: action.to, step: .05, min: 0, max: 1, onCommit: v => patch(a => ({ ...a, to: v } as BackgroundMarkerAction)) })), this.row("duration", this.numericStepper({ value: action.durationMs, step: 50, min: 1, onCommit: v => patch(a => ({ ...a, durationMs: v } as BackgroundMarkerAction)) })));
    else p.append(this.row("event", text(action.event, v => patch(a => ({ ...a, event: v } as BackgroundMarkerAction)))));
    return p;
  }

  private renderVisualPlacement(layer: SpriteBackgroundLayer): HTMLElement {
    const p = el("div", "cm-pixel-panel cm-pixel-visual"); p.append("Visual placement");
    const toggle = button(this.visualPlacement ? "Visual placement: On" : "Visual placement: Off", () => { this.visualPlacement = !this.visualPlacement; if(this.visualPlacement) this.activeTab = "placement"; this.endDrag(); this.syncOverlay(); this.render(); });
    p.appendChild(toggle);
    p.append(this.row("pixel-safe", check(this.pixelSafe, v => { this.pixelSafe = v; this.render(); })), this.row("step", this.numericStepper({value:this.nudgeStep,step:1,min:1,onCommit:v=>{ this.nudgeStep = Math.max(1, Math.round(v)); this.render(); }})));
    const nudges = el("div", "cm-pixel-row");
    for (const [label, dx, dy] of [["←",-1,0],["↑",0,-1],["↓",0,1],["→",1,0]] as const) { const b=button(label,()=>this.nudge(dx*this.nudgeStep,dy*this.nudgeStep)); nudges.className="cm-pixel-row cm-pixel-nudges"; nudges.appendChild(b); }
    p.appendChild(nudges); p.appendChild(button("round offset",()=>this.setDraft(roundSpriteOffset(this.draft,this.owner,this.selectedLayerId))));
    const assetSelect = this.select("", ["", ...BACKGROUND_ASSET_CATALOG.map(a=>a.id)], id => { const a=BACKGROUND_ASSET_CATALOG.find(x=>x.id===id); if(a)this.setDraft(assignAssetToSpriteLayer(this.draft,this.owner,this.selectedLayerId,a.url)); });
    p.append(this.row("asset", assetSelect));
    const match = BACKGROUND_ASSET_CATALOG.find(a=>a.url===layer.texture.url);
    p.append(document.createTextNode(`${match ? match.label : "Manual URL"} — ${layer.texture.url}`));
    const info = this.textureInfo(layer.id);
    p.append(document.createElement("br"), document.createTextNode(info ? `texture ${info.state} ${info.width}x${info.height}` : "texture metadata loading/unavailable"));
    return p;
  }
  private nudge(dx:number,dy:number): void { if(!this.selectedLayerId) return; this.setDraft(nudgeSpriteLayer(this.draft,this.owner,this.selectedLayerId,dx,dy,this.pixelSafe?"integer":"fractional")); }
  private textureInfo(layerId:string): {state:string;width:number;height:number}|null { const fn=(globalThis as any).__CM_BGR_SPRITE_TEXTURES__; const all=typeof fn==="function" ? fn() : null; return all?.[layerId] ?? null; }
  private v2TextureInfo(url:string): {state:string;width:number;height:number}|null {const fn=(globalThis as any).__CM_BGR_V2_TEXTURES__;const all=typeof fn==="function"?fn():null;return Object.values(all??{}).find((item:any)=>item?.url===url) as {state:string;width:number;height:number}|undefined??null;}

  private patchLayer(patcher:(l:BackgroundLayer)=>BackgroundLayer): void { if(this.selectedLayerId) this.setDraft(updateLayer(this.draft,this.owner,this.selectedLayerId,patcher)); }
  private select(value:string, values:string[], fn:(v:string)=>void): HTMLSelectElement { const s=el("select"); for(const v of values){ const o=el("option"); o.value=v;o.textContent=v;o.selected=v===value;s.appendChild(o);} s.oninput=()=>fn(s.value); return s; }
  private toggleGameplayPaused():void {const loop=(globalThis as any).__CM?.loop;loop?.setPaused?.(!this.gameplayPaused());this.render();}
  private onDevTransportKeydown=(e:KeyboardEvent):void=>{if(this.displayMode!=="dev"||e.code!=="Space"||e.repeat)return;const target=e.target;if(target instanceof HTMLElement&&(target.matches("input,textarea,select")||target.isContentEditable))return;e.preventDefault();this.toggleGameplayPaused();};
  private iconButton(label: string, icon: any, iconName: any, fn: () => void, disabled = false, iconSize = 16): HTMLButtonElement { const b=button("",fn); b.className="cm-transport-button"; b.title=label; b.setAttribute("aria-label",label); b.appendChild(createLucideIcon({icon,name:iconName,size:iconSize,className:"cm-transport-icon"})); b.disabled=disabled; return b; }
  private gameplayX(): number { return Number((globalThis as any).__CM?.game?.playerEnt?.pos?.x ?? 0); }
  private gameplayPaused(): boolean { return Boolean((globalThis as any).__CM?.loop?.isPaused?.()); }
  private currentX(): number { return this.gameplayX(); }
  private setCurrentX(x: number, pauseAfterSeek = this.gameplayPaused()): void {
    const sceneV2=getBackgroundSceneV2(globalThis);
    const bounds=sceneV2 ? projectBackgroundV2Timeline(sceneV2,{},this.currentX()).bounds : sceneTimelineBounds(this.draft.chunks,0);
    (globalThis as any).__CM?.game?.seekGameplayToPlayerX?.(x, { bounds, pauseAfterSeek });
    requestBackgroundMarkerRuntimeReset(globalThis);
  }
  private renderPreview(chunks=this.draft.chunks, explicitBounds?: {startX:number;endX:number}, primary=false): HTMLElement { const p=el("div","cm-pixel-toolbar cm-pixel-preview cm-scene-transport"); const paused=this.gameplayPaused(); const start=explicitBounds?.startX??sceneTimelineBounds(chunks,0).startX; const iconSize=primary?30:16; const playPause=this.iconButton(paused?"Play (Space)":"Pause (Space)",paused?Play:Pause,paused?"Play":"Pause",()=>this.toggleGameplayPaused(),false,iconSize); p.append(this.iconButton("Reset to scene start",RotateCcw,"RotateCcw",()=>{(globalThis as any).__CM?.loop?.setPaused?.(true);this.setCurrentX(start,true);this.render();},false,iconSize),playPause); return p; }

  private selectedChunkStart(): number { if (this.owner.kind !== "chunk") return 0; const chunkId=(this.owner as {kind:"chunk";chunkId:string}).chunkId; return this.draft.chunks.find(c=>c.id===chunkId)?.startX ?? 0; }
  private selectedChunkEnd(): number { if (this.owner.kind !== "chunk") return this.logicW; const chunkId=(this.owner as {kind:"chunk";chunkId:string}).chunkId; const c = this.draft.chunks.find(x=>x.id===chunkId); return c ? c.startX + c.length : this.logicW; }
  private currentScroll(): Point { return { x: Number((globalThis as any).__CM?.game?.world?.scrollX ?? 0), y: Number((globalThis as any).__CM?.game?.world?.scrollY ?? 0) }; }
  private editableSprite(): SpriteBackgroundLayer | null { const l=this.selectedLayer(); return l?.kind === "sprite" ? l as SpriteBackgroundLayer : null; }
  private ensureOverlay(): HTMLDivElement { if(this.overlay) return this.overlay; const o=el("div","cm-bgr-placement-overlay"); document.body.appendChild(o); o.addEventListener("pointerdown",e=>this.onPointerDown(e)); o.addEventListener("pointermove",e=>this.onPointerMove(e)); o.addEventListener("pointerup",e=>this.onPointerUp(e)); o.addEventListener("pointercancel",()=>this.endDrag()); window.addEventListener("keydown",this.onOverlayKeyDown); this.overlay=o; return o; }
  private removeOverlay(): void { this.overlay?.remove(); this.overlay=null;window.removeEventListener("keydown",this.onOverlayKeyDown); }
  private endDrag(): void { this.drag=null; }
  private syncOverlay(): void {
    const v2Scene=getBackgroundSceneV2(globalThis);
    if(v2Scene&&this.v2PlacementTarget){this.syncV2Overlay(v2Scene);return;}
    if(v2Scene){this.removeOverlay();return;}
    const layer=this.editableSprite();
    if(!this.visible || !this.visualPlacement || !layer){ this.removeOverlay(); return; }
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas){ this.removeOverlay(); return; }
    const rect=canvas.getBoundingClientRect(); const viewport=resolveCanvasViewportRect(rect,this.logicW,this.logicH); if(!viewport){ this.removeOverlay(); return; }
    const o=this.ensureOverlay(); o.style.left=`${viewport.left}px`; o.style.top=`${viewport.top}px`; o.style.width=`${viewport.width}px`; o.style.height=`${viewport.height}px`; o.style.cursor="default"; o.style.pointerEvents="none"; o.innerHTML="";
    const scroll=this.currentScroll(); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const};
    const origin=layerRenderedOrigin(layer,owner,scroll); const sx=viewport.width/this.logicW, sy=viewport.height/this.logicH;
    const info=this.textureInfo(layer.id); const w=info?.state==="ready"?info.width:1, h=info?.state==="ready"?info.height:1;
    const box=el("div","cm-bgr-placement-box"); box.style.left=`${origin.x*sx}px`; box.style.top=`${origin.y*sy}px`; box.style.width=`${w*sx}px`; box.style.height=`${h*sy}px`; box.style.pointerEvents="auto";box.style.cursor="grab";o.appendChild(box);
    const dot=el("div","cm-bgr-placement-origin"); dot.style.left=`${origin.x*sx}px`; dot.style.top=`${origin.y*sy}px`; o.appendChild(dot);
    const c0=this.selectedChunkStart()-scroll.x, c1=this.selectedChunkEnd()-scroll.x; const chunk=el("div","cm-bgr-placement-chunk"); chunk.style.left=`${c0*sx}px`; chunk.style.width=`${(c1-c0)*sx}px`; o.appendChild(chunk);
    const lab=el("div","cm-bgr-placement-label"); lab.textContent=`${this.owner.kind} ${this.owner.kind==="chunk"?(this.owner as {kind:"chunk";chunkId:string}).chunkId:"global"} · ${layer.id} · viewport 0..${this.logicW}`; o.appendChild(lab);
  }
  private syncV2Overlay(scene:BackgroundSceneV2):void {
    const track=findV2Track(scene,this.v2SelectedTrackId);const segment=this.v2PlacementTarget==="segment"?findV2Segment(scene,this.v2SelectedTrackId,this.v2SelectedSegmentId):null;const object=this.v2PlacementTarget==="object"?findV2Object(scene,this.v2SelectedTrackId,this.v2SelectedObjectId):null;
    if(!track||(!segment&&!object)){this.v2PlacementTarget=null;this.removeOverlay();return;}
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement|null;if(!canvas){this.removeOverlay();return;}const viewport=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH);if(!viewport){this.removeOverlay();return;}
    const targetAsset=segment?.asset??object!.asset;const metadata=this.v2TextureInfo(targetAsset.url);const point=segment?{x:segment.startTrackX,y:segment.offsetY}:{x:object!.startTrackX,y:object!.y};const origin=v2TrackPointToScreen(point,this.currentScroll(),track.parallax);const width=segment?.widthPx??object?.width??metadata?.width??16;const height=object?.height??metadata?.height??16;const sx=viewport.width/this.logicW,sy=viewport.height/this.logicH;
    const overlay=this.ensureOverlay();overlay.style.left=`${viewport.left}px`;overlay.style.top=`${viewport.top}px`;overlay.style.width=`${viewport.width}px`;overlay.style.height=`${viewport.height}px`;overlay.style.cursor="default";overlay.style.pointerEvents="none";overlay.innerHTML="";
    const box=el("div","cm-bgr-placement-box");box.style.left=`${origin.x*sx}px`;box.style.top=`${origin.y*sy}px`;box.style.width=`${Math.max(2,width*sx)}px`;box.style.height=`${Math.max(2,height*sy)}px`;box.style.pointerEvents="auto";box.style.cursor="grab";overlay.appendChild(box);const dot=el("div","cm-bgr-placement-origin");dot.style.left=`${origin.x*sx}px`;dot.style.top=`${origin.y*sy}px`;overlay.appendChild(dot);const label=el("div","cm-bgr-placement-label");label.textContent=`V2 ${this.v2PlacementTarget} · ${track.id} · ${segment?.id??object?.id}`;overlay.appendChild(label);
  }
  private pointerInternal(e: PointerEvent): Point | null { const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas) return null; const vp=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH); return vp?clientPointToInternalPoint({x:e.clientX,y:e.clientY},vp,this.logicW,this.logicH):null; }
  private onPointerDown(e: PointerEvent): void { if(!(e.target instanceof HTMLElement)||!e.target.closest(".cm-bgr-placement-box"))return;const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);const segment=this.v2PlacementTarget==="segment"?findV2Segment(scene,track?.id??"",this.v2SelectedSegmentId):null;const object=this.v2PlacementTarget==="object"?findV2Object(scene,track?.id??"",this.v2SelectedObjectId):null;if(!track||(!segment&&!object)||segment?.locked||object?.locked)return;e.preventDefault();e.stopPropagation();this.overlay?.setPointerCapture?.(e.pointerId);const point=segment?{x:segment.startTrackX,y:segment.offsetY}:{x:object!.startTrackX,y:object!.y};const origin=v2TrackPointToScreen(point,this.currentScroll(),track.parallax);this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}};return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); this.overlay?.setPointerCapture?.(e.pointerId); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const origin=layerRenderedOrigin(layer,owner,this.currentScroll()); this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}}; }
  private onPointerMove(e: PointerEvent): void { if(!this.drag||this.drag.pointerId!==e.pointerId) return;const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);if(!track)return;e.preventDefault();e.stopPropagation();const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y};const authored=screenPointToV2TrackPoint(rendered,this.currentScroll(),track.parallax);if(this.v2PlacementTarget==="segment")this.applyV2Edit(updateV2Segment(scene,track.id,this.v2SelectedSegmentId,{startTrackX:authored.x,offsetY:authored.y}));else this.applyV2ObjectEdit(moveV2Object(scene,track.id,this.v2SelectedObjectId,authored.x,authored.y));return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y}; const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const offset=renderedOriginToAuthoredOffset(rendered,layer,owner,this.currentScroll()); this.setDraft(updateSelectedSpriteOffset(this.draft,this.owner,this.selectedLayerId,offset,this.pixelSafe?"integer":"fractional"),false); }
  private onPointerUp(e: PointerEvent): void { if(this.drag?.pointerId!==e.pointerId) return;e.preventDefault();e.stopPropagation();this.endDrag();if(!getBackgroundSceneV2(globalThis))saveDraft(localStorage,this.draft);this.syncOverlay(); }
  private onKey(e: KeyboardEvent): void { if(!this.visible||!this.visualPlacement||!this.root.contains(document.activeElement)) return; if((document.activeElement as HTMLElement | null)?.tagName === "INPUT") return; const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}; const d=map[e.key]; if(!d) return; e.preventDefault(); this.nudge(d[0]*this.nudgeStep,d[1]*this.nudgeStep); }
  private onOverlayKeyDown=(e:KeyboardEvent):void=>this.onKey(e);
  private onV2YNudgeKeydown=(e:KeyboardEvent):void=>{if(!this.visible||(e.key!=="ArrowUp"&&e.key!=="ArrowDown")||isV2YNudgeTextTarget(e.target))return;const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const delta=(e.key==="ArrowUp"?-1:1)*(e.shiftKey?10:1);const segmentSelected=Boolean(this.v2SelectedSegmentId);const result=nudgeV2SelectionY(scene,this.v2SelectedTrackId,this.v2SelectedSegmentId,this.v2SelectedObjectId,delta);if(!result)return;e.preventDefault();if(segmentSelected)this.applyV2Edit(result as V2SegmentEditResult);else this.applyV2ObjectEdit(result as V2ObjectEditResult);};

  private exportFile(): void { const blob = new Blob([exportBackgroundScene(this.draft)], { type: "application/json" }); const a=el("a"); a.href=URL.createObjectURL(blob); a.download=`${this.draft.id||"background-scene"}.json`; a.click(); URL.revokeObjectURL(a.href); this.message="exported typed BackgroundScene JSON envelope"; this.render(); }
  private importFile(): void { const input=el("input"); input.type="file"; input.accept="application/json"; input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=importBackgroundSceneJson(String(r.result??"")); if(res.ok){this.message="imported scene";this.setDraft(res.scene);} else {this.message=`import failed: ${res.error}`;this.render();}}; r.readAsText(f);}; input.click(); }
}
