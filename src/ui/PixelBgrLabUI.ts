import { clearBackgroundPreviewState, getBackgroundScene, getBackgroundSceneV2, getBackgroundState, requestBackgroundMarkerRuntimeReset, setBackgroundScene, setBackgroundSceneV2, subscribeBackgroundState } from "../render/BackgroundState";
import type { BackgroundState } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import { Copy, Download, Eye, EyeOff, FolderOpen, Minus, Pause, Play, Plus, RotateCcw, Square, Trash2, Upload, X } from "lucide";
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
import { applyChunkTimelineDrag, chunkEndX, chunkOverlapRanges, chunkTimelineBlocks, clickedTimelineCurrentX, createExactTimelineScale, createTimelineScale, cursorDragCurrentX, DEFAULT_CHUNK_TIMELINE_SNAP_PX, formatTimelineWorldX, isolateTimelinePointerEvent, MIN_CHUNK_TIMELINE_LENGTH, overlapsForChunk, sceneTimelineBounds, shouldHandleTimelinePointerEvent, timelineMajorTickInterval, timelinePointerDeltaWorld, timelinePxToWorld, timelineViewportRange, worldToTimelinePx, type ChunkTimelineDragMode, type TimelineScale } from "./PixelBgrTimeline";
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

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function button(text: string, fn: () => void): HTMLButtonElement { const b = el("button"); b.type = "button"; b.textContent = text; b.onclick = fn; return b; }
type NumericStepperOptions = NumericStepOptions & { value: number; onCommit: (v:number)=>void };
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
export const PIXEL_BGR_TIMELINE_ZOOM_LEVELS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2] as const;

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
  private v2PlacementTarget: "segment" | "object" | null = null;
  private v2TimelineZoom = 0.1;
  private v2SegmentDrag: { pointerId:number; trackId:string; segmentId:string; mode:V2SegmentDragMode; startClientX:number; scale:TimelineScale; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; active:boolean } | null = null;
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
  private sceneMenuOpen = false;
  private closeLaneInsertMenu: (() => void) | null = null;

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
    this.root.style.display = "none";
    const style = el("style");
    style.textContent = `.cm-bgr-placement-overlay{position:fixed;z-index:100000;pointer-events:none;overflow:hidden;box-sizing:border-box}.cm-bgr-placement-box{position:absolute;border:2px solid #ffe66d;box-sizing:border-box}.cm-bgr-placement-origin{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;background:#ff4d6d;border-radius:50%}.cm-bgr-placement-chunk{position:absolute;top:0;bottom:0;border-left:2px dashed #66e3ff;border-right:2px dashed #66e3ff;background:rgba(102,227,255,.04)}.cm-bgr-placement-label{position:absolute;left:4px;top:4px;color:#eaf6ff;background:rgba(0,0,0,.65);font:12px monospace;padding:2px 4px}.cm-pixel-bgr-lab{position:relative;width:100%;height:100%;background:#040810;color:#eaf6ff;font:11px/1.2 ui-monospace,Menlo,Consolas,monospace;padding:4px;box-sizing:border-box;overflow:visible;display:flex;flex-direction:column;min-height:0;pointer-events:none}.cm-pixel-bgr-lab>:not(style){pointer-events:auto}.cm-pixel-bgr-lab h3{margin:0;color:#8ee8ff}.cm-pixel-bgr-lab button{margin:0;min-height:22px;padding:1px 3px;background:transparent;color:#eaf6ff;border:0;border-radius:0}.cm-pixel-bgr-lab input,.cm-pixel-bgr-lab select,.cm-pixel-bgr-lab textarea{min-height:26px;background:#071521;color:#eaf6ff;border:1px solid #28516d;border-radius:3px;font:inherit;box-sizing:border-box;max-width:100%}.cm-pixel-titlebar{display:flex;gap:6px;align-items:center;justify-content:space-between;min-width:0}.cm-pixel-scene-summary{opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-pixel-tabs{display:flex;flex-direction:column;align-items:flex-start;gap:0;margin:2px 0}.cm-pixel-tab[aria-selected="true"]{color:#fff;text-decoration:underline}.cm-pixel-tab-body{flex:0 0 auto;min-height:0;overflow:visible}.cm-pixel-panel{padding:4px 0;overflow:visible;min-height:0;margin-bottom:4px;box-sizing:border-box}.cm-pixel-props{overflow:visible}.cm-pixel-row{display:flex;gap:3px;flex-wrap:wrap;align-items:center;margin:3px 0;min-width:0}.cm-pixel-row label{min-width:68px;opacity:.78}.cm-pixel-row input,.cm-pixel-row select{flex:1 1 auto;min-width:0}.cm-pixel-list button{display:block;width:100%;text-align:left;margin:1px 0;padding:2px 5px;overflow:hidden;text-overflow:ellipsis}.cm-pixel-list button.sel{background:#235b80}.cm-pixel-msg{white-space:pre-wrap;color:#ffd166;overflow-wrap:anywhere;border:1px solid rgba(255,209,102,.18);border-radius:4px;padding:3px 5px;margin:3px 0}.cm-pixel-summary{width:100%;text-align:left}.cm-pixel-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:4px 0;min-width:0}.cm-pixel-toolbar input{width:min(190px,100%)}.cm-pixel-stepper{display:grid;grid-template-columns:28px minmax(72px,1fr) 28px;gap:3px;align-items:center;width:100%}.cm-pixel-stepper input{width:100%;text-align:right}.cm-pixel-stepper button{min-width:28px;padding:0}.cm-pixel-visual{margin-top:6px;padding-top:5px}.cm-pixel-nudges button{min-width:32px}.cm-pixel-preview{margin-top:5px}.cm-scene-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap}.cm-scene-toolbar input[type=text]{width:min(160px,100%)}.cm-timeline{position:relative;height:138px;border:1px solid rgba(120,220,255,.22);border-radius:6px;margin:6px 0;background:rgba(3,12,22,.78);overflow:hidden;user-select:none}.cm-ruler{position:absolute;left:0;right:0;top:0;height:26px;border-bottom:1px solid rgba(120,220,255,.16)}.cm-ruler-tick{position:absolute;top:0;height:100%;border-left:1px solid rgba(120,220,255,.22);font-size:10px;color:#9fdff2;padding-left:3px}.cm-chunk-line{position:absolute;left:0;right:0;top:42px;height:42px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035)}.cm-chunk-block{position:absolute;top:46px;height:34px;cursor:grab;border:1px solid #52d7ff;border-radius:5px;background:rgba(45,132,180,.72);color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px;box-sizing:border-box;font-size:11px}.cm-chunk-block:hover{filter:brightness(1.18)}.cm-chunk-block.dragging{cursor:grabbing;filter:brightness(1.3)}.cm-chunk-block.sel{border-color:#ffe66d;box-shadow:0 0 0 2px rgba(255,230,109,.28);background:rgba(72,153,211,.9)}.cm-chunk-handle{position:absolute;top:0;bottom:0;width:10px;background:rgba(255,255,255,.22);border:0;padding:0;min-height:0;margin:0}.cm-chunk-handle.left{left:0;cursor:ew-resize}.cm-chunk-handle.right{right:0;cursor:ew-resize}.cm-overlap{position:absolute;top:42px;height:42px;background:repeating-linear-gradient(135deg,rgba(255,75,90,.65),rgba(255,75,90,.65) 4px,rgba(255,75,90,.28) 4px,rgba(255,75,90,.28) 8px);border-left:1px solid #ff4d6d;border-right:1px solid #ff4d6d;pointer-events:none}.cm-marker-row{position:absolute;left:0;right:0;top:96px;height:30px;border-top:1px solid rgba(120,220,255,.16)}.cm-marker-dot{position:absolute;top:6px;width:8px;height:18px;margin-left:-4px;border-radius:4px;background:#a78bfa}.cm-marker-dot.chunk{background:#4ade80}.cm-transport-button{display:inline-grid;place-items:center;min-width:28px;width:28px;padding:0}.cm-transport-button svg{width:16px;height:16px}.cm-mode-pill{padding:2px 6px;border:1px solid rgba(255,209,102,.35);border-radius:999px;color:#ffd166}.cm-current-x{font-weight:700;color:#fff}.cm-cursor{position:absolute;top:0;bottom:0;width:0;border-left:2px solid #45a3ff;pointer-events:auto;cursor:ew-resize}.cm-cursor::after{content:"";position:absolute;top:25px;left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #45a3ff}.cm-chunk-inspector{border-color:rgba(255,230,109,.28)}`
    style.textContent += `.cm-scene-action-row{position:relative}.cm-scene-menu{position:absolute;z-index:4;top:100%;left:0;min-width:142px;padding:2px;background:#071521;border:1px solid #28516d;box-shadow:0 4px 10px rgba(0,0,0,.45)}.cm-scene-menu button{display:block;width:100%;padding:4px 6px;text-align:left;white-space:nowrap}.cm-scene-menu button:hover,.cm-scene-menu button:focus-visible{background:#163b52;color:#fff}.cm-v2-workspace{flex:1 1 auto;min-height:0;overflow:visible}.cm-v2-inspector{min-width:0;padding:5px 2px;margin:0;border:0;border-radius:0;overflow:visible}.cm-v2-inspector-title{margin:0 0 5px;color:#8ee8ff;font-size:11px;letter-spacing:.04em}.cm-v2-panel{flex:1 0 auto;width:100%;min-width:0;overflow:hidden;display:block;padding:2px 0;margin:0;border:0;border-radius:0;box-sizing:border-box}.cm-v2-timeline-gutter{width:100%;height:128px;display:grid;grid-template-rows:20px repeat(4,27px);overflow:visible;box-sizing:border-box;background:#000}.cm-v2-zoom-controls{display:flex;align-items:center;justify-content:center;gap:4px}.cm-v2-zoom-button,.cm-v2-eye,.cm-v2-lane-add{display:inline-grid;place-items:center;width:18px;min-width:18px;height:18px;min-height:0!important;padding:0!important;background:transparent;border:0;border-radius:0;color:#ddd;appearance:none;-webkit-appearance:none}.cm-v2-zoom-button:disabled,.cm-v2-eye:disabled{opacity:.35;color:#ddd}.cm-v2-zoom-button svg,.cm-v2-eye svg{width:13px;height:13px;stroke:currentColor}.cm-v2-eye[data-visibility="mixed"]{opacity:.55}.cm-v2-eye[data-visibility="none"]{opacity:.45}.cm-v2-gutter-row{position:relative;height:27px;display:grid;grid-template-columns:minmax(0,1fr) 18px 38px 18px;align-items:center;column-gap:2px;min-width:0;color:#ddd;font-size:10px;white-space:nowrap}.cm-v2-role-label{min-width:0;overflow:hidden;text-overflow:ellipsis}.cm-v2-parallax{width:38px!important;min-width:38px!important;height:18px!important;min-height:18px!important;padding:0 1px!important;border:0!important;background:#000!important;color:#eaf6ff!important;text-align:right;-moz-appearance:textfield}.cm-v2-parallax::-webkit-inner-spin-button,.cm-v2-parallax::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.cm-v2-lane-add-menu{position:fixed;z-index:100002;min-width:72px;padding:2px;background:#071521;border:1px solid #28516d;box-shadow:0 3px 8px rgba(0,0,0,.55);font:11px/1.2 ui-monospace,Menlo,Consolas,monospace}.cm-v2-lane-add-menu button{display:block;width:100%;min-height:20px;padding:2px 5px;border:0;border-radius:0;background:transparent;color:#eaf6ff;text-align:left;white-space:nowrap}.cm-v2-lane-add-menu button:hover,.cm-v2-lane-add-menu button:focus-visible{background:#163b52}.cm-v2-selected-y{margin:3px 0 2px;padding:2px 0;border-top:1px solid rgba(142,232,255,.18);border-bottom:1px solid rgba(142,232,255,.18)}.cm-v2-selected-y-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8ee8ff}.cm-v2-selected-y-row{display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:2px}.cm-v2-selected-y-row .cm-pixel-stepper{grid-template-columns:18px minmax(38px,1fr) 18px;gap:2px}.cm-v2-selected-y-row button{width:18px;min-width:18px;min-height:18px!important;padding:0!important}.cm-v2-selected-y-row input{width:100%;min-height:20px!important;padding:0 2px;text-align:right}.cm-v2-timeline-scroll{width:100%;max-width:100%;height:145px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable;box-sizing:border-box}.cm-bgr-workspace-timeline .cm-v2-timeline-scroll{flex:0 0 auto;min-height:0}.cm-v2-timeline{position:relative;height:128px;background:rgba(3,12,22,.78);user-select:none;pointer-events:auto}.cm-v2-ruler{height:20px;border:0;pointer-events:auto}.cm-v2-ruler .cm-ruler-tick{height:14px;font-size:9px;color:#bbb;border-color:rgba(255,255,255,.22);padding-left:2px}.cm-v2-lane{position:absolute;left:0;right:0;box-sizing:border-box;overflow:visible}.cm-v2-lane-label{display:inline-flex;align-items:center;min-width:0;height:23px;color:#ddd;font-size:10px;white-space:nowrap;pointer-events:auto}.cm-v2-lane-track-button{overflow:hidden;text-overflow:ellipsis}.cm-v2-lane-track-select{position:sticky;left:3px;z-index:3;width:min(164px,45%);margin:2px 0 0 3px}.cm-v2-lane-track-button{min-width:0;height:19px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.cm-v2-lane-track-select{min-width:0;max-width:164px;height:19px;padding:0 2px;border:1px solid rgba(255,255,255,.28);border-radius:2px;background:#111;color:#ddd;font:9px ui-monospace,Menlo,Consolas,monospace}.cm-v2-overlap{position:absolute;top:5px;height:16px;background:repeating-linear-gradient(135deg,rgba(194,35,57,.58),rgba(194,35,57,.58) 3px,rgba(255,255,255,.12) 3px,rgba(255,255,255,.12) 6px);pointer-events:none;z-index:3}.cm-v2-segment,.cm-v2-object{position:absolute;top:4px;height:17px;box-sizing:border-box;border:1px solid #aeb6bf;border-radius:2px;background:#f7f8fa;color:#17202a;font-size:9px;line-height:13px;padding:1px 3px;overflow:hidden;text-overflow:clip;white-space:nowrap;pointer-events:none;z-index:2}.cm-v2-segment.readonly{border-color:#d6bd68;background:#fff3bd;color:#332b12}.cm-v2-segment.editable{pointer-events:auto;cursor:grab}.cm-v2-segment-label{position:absolute;top:4px;height:17px;box-sizing:border-box;padding:1px 3px;color:#17202a;font-size:9px;line-height:13px;overflow:hidden;white-space:nowrap;pointer-events:none;z-index:4}.cm-v2-segment.sel,.cm-v2-object.sel{outline:2px solid #ffe66d;outline-offset:1px;box-shadow:0 0 5px rgba(255,230,109,.7)}.cm-v2-segment-handle{position:absolute;top:0;bottom:0;width:6px;background:rgba(20,28,36,.28);z-index:5}.cm-v2-segment-handle.left{left:0;cursor:ew-resize}.cm-v2-segment-handle.right{right:0;cursor:ew-resize}.cm-v2-object{top:6px;height:13px;min-width:8px;border-color:#3f8fc4;background:#65b9ed;color:#102638;line-height:9px}.cm-v2-segment.disabled,.cm-v2-object.disabled{opacity:.35;filter:saturate(.3)}.cm-v2-foreground{background:rgba(255,209,102,.025)}.cm-v2-viewport-range{position:absolute;will-change:transform;top:0;bottom:0;box-sizing:border-box;border-left:1px solid rgba(255,255,255,.65);border-right:1px solid rgba(255,255,255,.65);background:rgba(255,255,255,.055);pointer-events:none;z-index:6}.cm-v2-cursor{top:0;will-change:transform;bottom:0;border-left:2px solid #fff;filter:drop-shadow(0 0 2px rgba(0,0,0,.95));z-index:8}.cm-v2-cursor::after{top:0;border-top:0;border-bottom:8px solid #fff}.cm-scene-compact-section{margin:2px 0;border:0;padding:0}.cm-scene-section-title{display:none}.cm-scene-environment-row{display:flex;align-items:center;gap:4px;white-space:nowrap}.cm-scene-environment-row input[type=number]{width:48px;min-height:22px}.cm-scene-action-row{display:flex;align-items:center;gap:2px;flex-wrap:nowrap;margin:3px 0}.cm-scene-action-row .cm-transport-button{flex:1 1 0;width:auto;min-width:0;min-height:22px}.cm-scene-transport{flex-wrap:nowrap;margin:3px 0}`;
    this.root.appendChild(style);
    // The Lab remains the transitional state/handler owner while its rendered
    // surfaces are mounted into the stable P1.2 workspace regions.
    this.workspace.left.insertBefore(this.root, this.workspace.gutter);
    document.body.appendChild(this.workspace.root);
    this.viewportResizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.notifyPresentationChange());
    this.viewportResizeObserver?.observe(this.workspace.viewport);
    this.unsub = subscribeBackgroundState(() => { if (this.visible) this.render(); });
    window.addEventListener("keydown",this.onV2YNudgeKeydown);
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
    this.displayMode = mode;
    this.visible = mode === "dev";
    setPixelBgrWorkspaceDisplayMode(this.workspace.root, mode);
    const modeSwitch=this.workspace.modeToggle.querySelector<HTMLButtonElement>("button[data-mode=toggle]");
    modeSwitch?.setAttribute("aria-checked",String(mode === "dev"));
    this.root.style.display = mode === "dev" ? "" : "none";
    if (mode === "game") {
      this.closeSceneMenu(false);
      this.endTimelineDrag(); this.endV2SegmentDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay();
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
    this.workspace.right.appendChild(panel);
  }
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
  dispose(): void { this.closeSceneMenu(false); this.endTimelineDrag(); this.endV2SegmentDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay(); this.clearV2TimelineIndicatorRefs(); this.unsub(); this.viewportResizeObserver?.disconnect(); this.openListeners.clear(); this.presentationListeners.clear(); if (this.enemyLabPanel) { this.enemyLabPanel.style.cssText = this.enemyLabOriginalStyle; document.body.appendChild(this.enemyLabPanel); this.enemyLabPanel = null; } this.workspace.root.remove(); }
  private notifyOpenChange(): void { for (const listener of [...this.openListeners]) listener(this.visible); }
  private notifyPresentationChange(): void { for (const listener of [...this.presentationListeners]) listener(); }
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
    while (this.root.childNodes.length > 1) this.root.removeChild(this.root.lastChild!);
    this.clearV2TimelineIndicatorRefs();
    this.workspace.timeline.replaceChildren();
    this.workspace.gutter.replaceChildren();
    this.activeTab = normalizePixelBgrLabTab(this.activeTab, pixelBgrLabTabForSelection(Boolean(this.selectedLayer()), this.selectedLayer()?.kind));
    if (!PIXEL_BGR_LEFT_TOOLS.includes(this.activeTab)) this.activeTab = "scene";
    const titlebar = el("div", "cm-pixel-titlebar");
    const h = el("h3"); h.textContent = "Scene Lab [F8]";
    const v2Scene = getBackgroundSceneV2(globalThis);
    this.workspace.root.dataset.timelineMode = v2Scene ? "v2" : "disabled";
    const summary = el("span", "cm-pixel-scene-summary"); summary.textContent = v2Scene?.id ?? this.draft.id ?? "untitled scene";
    titlebar.append(h, summary);
    this.root.appendChild(titlebar);
    if (v2Scene) {
      const projection=projectBackgroundV2Timeline(v2Scene,{},this.currentX());
      this.workspace.timeline.appendChild(this.renderV2Timeline(projection));
      this.root.append(this.renderV2Toolbar(),this.renderV2Environment(v2Scene));
      const contextualY=this.renderV2ContextualYSurface();if(contextualY)this.root.appendChild(contextualY);
      this.root.append(this.renderLeftTools(),this.renderPreview([],projection.bounds));
      this.syncOverlay();
      return;
    }
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
    actions.append(
      this.iconButton("Load current scene",FolderOpen,"FolderOpen",()=>this.toggleSceneMenu()),
      this.iconButton("Export scene",Download,"Download",()=>this.exportV2File()),
      this.iconButton("Import scene",Upload,"Upload",()=>this.importV2File()),
      this.iconButton("Duplicate scene",Copy,"Copy",()=>this.duplicateV2()),
      this.iconButton("Reset or delete scene",Trash2,"Trash2",()=>this.clearSavedV2()),
      this.iconButton("Close Scene Lab",X,"X",()=>this.close()));
    if(this.sceneMenuOpen) actions.appendChild(this.renderSceneMenu());
    p.append(heading,actions);
    return p;
  }
  private renderLeftTools(): HTMLElement {
    const tools=el("nav","cm-pixel-tabs"); tools.setAttribute("aria-label","Scene Lab tools");
    for(const tab of PIXEL_BGR_LEFT_TOOLS){const item=button(PIXEL_BGR_LAB_TAB_LABELS[tab],()=>this.setActiveTab(tab));item.className="cm-pixel-tab";item.setAttribute("aria-current",this.activeTab===tab?"page":"false");tools.append(item);}
    return tools;
  }
  private applyV2EnvironmentEdit(result: V2EnvironmentEditResult): void {
    if (!result.ok) { this.message=result.error; this.render(); return; }
    this.message=""; setBackgroundSceneV2(result.scene,globalThis);
  }
  private renderV2Environment(scene: BackgroundSceneV2): HTMLElement {
    const p=el("section","cm-scene-compact-section");
    const starfield=scene.environment.starfield;
    const row=el("div","cm-scene-environment-row");
    row.append("Environment", " starfield", check(Boolean(starfield),enabled=>this.applyV2EnvironmentEdit(enabled?enableV2Starfield(scene):disableV2Starfield(scene))));
    if(starfield){const seed=num(starfield.seed,1,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{seed:value})));seed.title="Starfield seed";seed.setAttribute("aria-label","Starfield seed");const density=num(starfield.density,.05,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{density:value})));density.title="Starfield density";density.setAttribute("aria-label","Starfield density");row.append(seed,density,this.iconButton("Randomize starfield seed",RotateCcw,"RotateCcw",()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);this.applyV2EnvironmentEdit(randomizeV2StarfieldSeed(scene,values[0]));}));}
    const backdropRow=el("div","cm-scene-environment-row");
    const backdrop=scene.staticBackdrop;
    backdropRow.append("Static Bgr");
    const backdropEye=this.iconButton(backdrop?.enabled?"Hide Static Bgr":"Show Static Bgr",backdrop?.enabled?Eye:EyeOff,backdrop?.enabled?"Eye":"EyeOff",()=>{if(!backdrop)return;const result=setV2StaticBackdropEnabled(scene,!backdrop.enabled);if(result.ok)setBackgroundSceneV2(result.scene,globalThis);});
    backdropEye.className="cm-v2-eye";backdropEye.disabled=!backdrop;backdropEye.setAttribute("aria-pressed",backdrop?.enabled?"true":"false");
    backdropRow.append(backdropEye,backdrop?.asset.id??"unavailable");
    p.append(row,backdropRow);
    if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}return p;
  }
  private saveV2():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const result=saveBackgroundSceneV2(localStorage,scene);this.message=result.ok?`saved scene ${scene.id}`:`save failed: ${result.error}`;this.render();}
  private loadV2():void {const result=loadBackgroundSceneV2(localStorage);if(result.ok){this.message=`loaded saved scene ${result.scene.id}`;setBackgroundSceneV2(result.scene,globalThis);}else{this.message=`load failed: ${result.error}`;this.render();}}
  private toggleSceneMenu():void {this.sceneMenuOpen?this.closeSceneMenu():this.openSceneMenu();}
  private openSceneMenu():void {if(this.sceneMenuOpen)return;this.sceneMenuOpen=true;document.addEventListener("pointerdown",this.onSceneMenuOutside);document.addEventListener("keydown",this.onSceneMenuKeydown);this.render();}
  private closeSceneMenu(render=true):void {if(!this.sceneMenuOpen)return;this.sceneMenuOpen=false;document.removeEventListener("pointerdown",this.onSceneMenuOutside);document.removeEventListener("keydown",this.onSceneMenuKeydown);if(render)this.render();}
  private onSceneMenuOutside=(event:PointerEvent):void=>{const target=event.target;if(!(target instanceof Element)||(!target.closest(".cm-scene-menu")&&!target.closest('button[aria-label="Load current scene"]')))this.closeSceneMenu();};
  private onSceneMenuKeydown=(event:KeyboardEvent):void=>{if(event.key==="Escape"){event.preventDefault();this.closeSceneMenu();}};
  private selectScene(entry:SceneLabCatalogEntry):void {this.closeSceneMenu(false);this.message="";if(entry.version===2)setBackgroundSceneV2(entry.create(),globalThis);else{this.owner={kind:"global"};this.selectedLayerId="";this.setDraft(entry.create());}}
  private renderSceneMenu():HTMLElement {const menu=el("div","cm-scene-menu");menu.setAttribute("role","menu");menu.setAttribute("aria-label","Available scenes");for(const entry of SCENE_LAB_SCENE_CATALOG){const item=button(entry.label,()=>this.selectScene(entry));item.setAttribute("role","menuitem");menu.appendChild(item);}const saved=loadBackgroundSceneV2(localStorage);if(saved.ok){const item=button(`Saved: ${saved.scene.id}`,()=>{this.closeSceneMenu(false);this.loadV2();});item.setAttribute("role","menuitem");menu.appendChild(item);}return menu;}
  private clearSavedV2():void {clearBackgroundSceneV2(localStorage);this.message="cleared saved scene (active scene unchanged)";this.render();}
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
    const zoomOut=this.iconButton("Zoom out",Minus,"Minus",()=>this.changeV2TimelineZoom(-1),this.v2TimelineZoom===PIXEL_BGR_TIMELINE_ZOOM_LEVELS[0]);zoomOut.className="cm-v2-zoom-button";
    const zoomIn=this.iconButton("Zoom in",Plus,"Plus",()=>this.changeV2TimelineZoom(1),this.v2TimelineZoom===PIXEL_BGR_TIMELINE_ZOOM_LEVELS[PIXEL_BGR_TIMELINE_ZOOM_LEVELS.length-1]);zoomIn.className="cm-v2-zoom-button";
    zoomControls.append(zoomOut,zoomIn);gutter.appendChild(zoomControls);
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
      gutterRow.append(label,eye,parallax,add);gutter.appendChild(gutterRow);
    }
    this.workspace.gutter.appendChild(gutter);
    const scroll=el("div","cm-v2-timeline-scroll");
    const timeline=el("div","cm-v2-timeline"); timeline.style.width=`${scale.widthPx}px`;
    const rowHeight=27;
    const headerHeight=20;
    timeline.style.height=`${headerHeight+projection.lanes.length*rowHeight}px`;
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
          for(const segment of track.segments){const editable=track.mode==="sequence";const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedSegmentId===segment.id&&!this.v2SelectedObjectId;const block=el("span",`cm-v2-segment${segment.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}${editable?" editable":" readonly"}`);block.style.left=`${worldToTimelinePx(segment.startX,scale)}px`;block.style.width=`${Math.max(2,worldToTimelinePx(segment.endX,scale)-worldToTimelinePx(segment.startX,scale))}px`;const label=el("span","cm-v2-segment-label");label.style.left=block.style.left;label.style.width=block.style.width;label.textContent=segment.id;block.title=`${track.id}/${segment.id} ${segment.startX}..${segment.endX} · z ${segment.effectiveZ}${editable?"":" · repeat read-only"}`;block.onpointerdown=e=>{this.v2PlacementTarget=null;if(!editable){isolateTimelinePointerEvent(e);this.selectV2Segment(track.id,segment.id);return;}this.beginV2SegmentDrag(e,track.id,segment.id,"move",scale);};if(editable){const left=el("span","cm-v2-segment-handle left");left.title="Resize left edge";left.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-left",scale);const right=el("span","cm-v2-segment-handle right");right.title="Resize right edge";right.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-right",scale);block.append(left,right);}row.append(block,label);}
          for(const object of track.objects){const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedObjectId===object.id;const marker=el("span",`cm-v2-object${object.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}`);marker.style.pointerEvents="auto";marker.style.cursor="pointer";marker.style.left=`${worldToTimelinePx(object.x,scale)}px`;marker.style.width=`${object.width===null?8:Math.max(2,worldToTimelinePx(object.x+object.width,scale)-worldToTimelinePx(object.x,scale))}px`;marker.textContent=object.id;marker.title=`${track.id}/${object.id} @ ${object.x}${object.width===null?" · point marker":` · width ${object.width}`} · z ${object.effectiveZ}`;marker.onpointerdown=e=>{isolateTimelinePointerEvent(e);this.v2PlacementTarget=null;this.selectV2Object(track.id,object.id);};row.appendChild(marker);}
        }
        timeline.appendChild(row); top+=rowHeight;
    }
    const viewport=el("div","cm-v2-viewport-range");const viewportPx=worldToTimelinePx(viewportRange.startX,scale);viewport.style.left="0px";viewport.style.transform=`translate3d(${viewportPx}px, 0, 0)`;viewport.style.width=`${worldToTimelinePx(viewportRange.endX,scale)-viewportPx}px`;viewport.title=`Visible viewport ${Math.round(viewportRange.startX)}..${Math.round(viewportRange.endX)}`;this.v2ViewportEl=viewport;this.v2LastViewportPx=viewportPx;timeline.appendChild(viewport);
    const cursor=el("div","cm-cursor cm-v2-cursor");const cursorPx=worldToTimelinePx(projection.playerX,scale);cursor.style.left="0px";cursor.style.transform=`translate3d(${cursorPx}px, 0, 0)`;cursor.title=`Drag Player X cursor ${Math.round(projection.playerX)}`;cursor.onpointerdown=e=>this.beginCursorDrag(e,timeline,scale,projection.bounds);this.cursorEl=cursor;this.v2CursorEl=cursor;this.v2LastCursorPx=cursorPx;timeline.appendChild(cursor);
    scroll.appendChild(timeline); panel.appendChild(scroll); return panel;
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
    const insert=(kind:"segment"|"object")=>{close();const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const track=resolveV2LaneInsertTrack(scene,lane,this.v2SelectedTrackId);if(!track){this.message=`Cannot insert in ${lane.label}: lane has no track.`;this.render();return;}const selectedSegment=track.id===this.v2SelectedTrackId?findV2Segment(scene,track.id,this.v2SelectedSegmentId):null;const selectedObject=track.id===this.v2SelectedTrackId?findV2Object(scene,track.id,this.v2SelectedObjectId):null;const catalog=BACKGROUND_ASSET_CATALOG[0];if(!catalog){this.message="Cannot insert: background asset catalog is empty.";this.render();return;}const asset=kind==="segment"?(selectedSegment?.asset??catalog):(selectedObject?.asset??catalog);if(kind==="segment")this.applyV2Edit(insertV2LaneSegment(scene,track.id,this.currentX(),asset,selectedSegment?.id));else this.applyV2ObjectEdit(insertV2LaneObject(scene,track.id,this.currentX(),asset));};
    const segment=button("Segment",()=>insert("segment"));segment.setAttribute("role","menuitem");const object=button("Object",()=>insert("object"));object.setAttribute("role","menuitem");menu.append(segment,object);const rect=trigger.getBoundingClientRect();menu.style.left=`${rect.left}px`;menu.style.top=`${rect.bottom+2}px`;document.body.appendChild(menu);this.closeLaneInsertMenu=close;document.addEventListener("pointerdown",outside);document.addEventListener("keydown",keydown);segment.focus();
  }
  private changeV2TimelineZoom(direction:-1|1):void {const currentIndex=PIXEL_BGR_TIMELINE_ZOOM_LEVELS.indexOf(this.v2TimelineZoom as typeof PIXEL_BGR_TIMELINE_ZOOM_LEVELS[number]);const nextIndex=Math.max(0,Math.min(PIXEL_BGR_TIMELINE_ZOOM_LEVELS.length-1,currentIndex+direction));const next=PIXEL_BGR_TIMELINE_ZOOM_LEVELS[nextIndex];if(next===this.v2TimelineZoom)return;const oldScroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");const cursorViewportX=oldScroll&&this.v2LastCursorPx!==null?this.v2LastCursorPx-oldScroll.scrollLeft:null;this.v2TimelineZoom=next;this.render();if(cursorViewportX!==null){const newScroll=this.workspace.timeline.querySelector<HTMLElement>(".cm-v2-timeline-scroll");if(newScroll&&this.v2LastCursorPx!==null)newScroll.scrollLeft=Math.max(0,this.v2LastCursorPx-cursorViewportX);}}

  private selectV2Track(trackId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId="";this.v2SelectedObjectId="";this.v2PlacementTarget=null;if(render)this.render();}
  private selectV2Segment(trackId:string,segmentId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId=segmentId;this.v2SelectedObjectId="";if(render)this.render();}
  private selectV2Object(trackId:string,objectId:string,render=true):void {this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId="";this.v2SelectedObjectId=objectId;if(render)this.render();}
  private renderV2ContextualYSurface():HTMLElement|null {
    const segment=this.selectedV2Segment();
    const object=segment?null:this.selectedV2Object();
    if(!segment&&!object)return null;
    const surface=el("section","cm-v2-selected-y");surface.dataset.contextualY="selection";
    const id=segment?.segment.id??object!.object.id;
    const title=el("div","cm-v2-selected-y-title");title.textContent=`Selected · ${id}`;
    const row=el("div","cm-v2-selected-y-row");row.append("Y");
    if(segment){
      const track=findV2Track(segment.scene,this.v2SelectedTrackId);if(!track)return null;
      row.appendChild(this.numericStepper({value:segment.segment.offsetY,step:1,onCommit:value=>this.applyV2Edit(updateV2Segment(segment.scene,track.id,segment.segment.id,{offsetY:value}))}));
    }else{
      const track=findV2Track(object!.scene,this.v2SelectedTrackId);if(!track)return null;
      row.appendChild(this.numericStepper({value:object!.object.y,step:1,onCommit:value=>this.applyV2ObjectEdit(updateV2Object(object!.scene,track.id,object!.object.id,{y:value}))}));
    }
    surface.append(title,row);return surface;
  }
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
  private beginV2SegmentDrag(e:PointerEvent,trackId:string,segmentId:string,mode:V2SegmentDragMode,scale:TimelineScale):void { isolateTimelinePointerEvent(e);this.endV2SegmentDrag();const baseline=getBackgroundSceneV2(globalThis);if(!baseline)return;this.selectV2Segment(trackId,segmentId,false);const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2SegmentDrag={pointerId:e.pointerId,trackId,segmentId,mode,startClientX:e.clientX,scale,baseline,captureTarget,active:true};window.addEventListener("pointermove",this.onV2SegmentPointerMove);window.addEventListener("pointerup",this.onV2SegmentPointerUp);window.addEventListener("pointercancel",this.onV2SegmentPointerUp); }
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
  private numericStepper(options: NumericStepperOptions): HTMLElement { const wrap=el("div","cm-pixel-stepper"); const commit=(v:number)=>options.onCommit(v); const input=num(options.value,options.step,commit); input.onkeydown=e=>{ if(e.key==="ArrowUp"||e.key==="ArrowDown"){ e.preventDefault(); commit(stepNumericValue(Number(input.value), e.key==="ArrowUp" ? 1 : -1, {...options, step: options.step*(e.shiftKey?10:1)})); return; } if(e.key==="Enter") input.blur(); if(e.key==="Escape"){ input.value=String(options.value); input.blur(); } }; wrap.append(button("−",()=>commit(stepNumericValue(Number(input.value),-1,options))),input,button("+",()=>commit(stepNumericValue(Number(input.value),1,options)))); return wrap; }
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
  private iconButton(label: string, icon: any, iconName: any, fn: () => void, disabled = false): HTMLButtonElement { const b=button("",fn); b.className="cm-transport-button"; b.title=label; b.setAttribute("aria-label",label); b.appendChild(createLucideIcon({icon,name:iconName,size:16,className:"cm-transport-icon"})); b.disabled=disabled; return b; }
  private gameplayX(): number { return Number((globalThis as any).__CM?.game?.playerEnt?.pos?.x ?? 0); }
  private gameplayPaused(): boolean { return Boolean((globalThis as any).__CM?.loop?.isPaused?.()); }
  private currentX(): number { return this.gameplayX(); }
  private setCurrentX(x: number, pauseAfterSeek = this.gameplayPaused()): void {
    const sceneV2=getBackgroundSceneV2(globalThis);
    const bounds=sceneV2 ? projectBackgroundV2Timeline(sceneV2,{},this.currentX()).bounds : sceneTimelineBounds(this.draft.chunks,0);
    (globalThis as any).__CM?.game?.seekGameplayToPlayerX?.(x, { bounds, pauseAfterSeek });
    requestBackgroundMarkerRuntimeReset(globalThis);
  }
  private renderPreview(chunks=this.draft.chunks, explicitBounds?: {startX:number;endX:number}): HTMLElement { const p=el("div","cm-pixel-toolbar cm-pixel-preview cm-scene-transport"); const paused=this.gameplayPaused(); const start=explicitBounds?.startX??sceneTimelineBounds(chunks,0).startX; const playPause=this.iconButton(paused?"Play":"Pause",paused?Play:Pause,paused?"Play":"Pause",()=>{ (globalThis as any).__CM?.loop?.setPaused?.(!paused); this.render(); }); p.append(this.iconButton("Reset to scene start",RotateCcw,"RotateCcw",()=>{this.setCurrentX(start,paused);this.render();}),playPause,this.iconButton("Stop and return to scene start",Square,"Square",()=>{this.setCurrentX(start,true);this.render();})); return p; }

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
  private onPointerDown(e: PointerEvent): void { if(!(e.target instanceof HTMLElement)||!e.target.closest(".cm-bgr-placement-box"))return;const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);const segment=this.v2PlacementTarget==="segment"?findV2Segment(scene,track?.id??"",this.v2SelectedSegmentId):null;const object=this.v2PlacementTarget==="object"?findV2Object(scene,track?.id??"",this.v2SelectedObjectId):null;if(!track||(!segment&&!object))return;e.preventDefault();e.stopPropagation();this.overlay?.setPointerCapture?.(e.pointerId);const point=segment?{x:segment.startTrackX,y:segment.offsetY}:{x:object!.startTrackX,y:object!.y};const origin=v2TrackPointToScreen(point,this.currentScroll(),track.parallax);this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}};return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); this.overlay?.setPointerCapture?.(e.pointerId); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const origin=layerRenderedOrigin(layer,owner,this.currentScroll()); this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}}; }
  private onPointerMove(e: PointerEvent): void { if(!this.drag||this.drag.pointerId!==e.pointerId) return;const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);if(!track)return;e.preventDefault();e.stopPropagation();const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y};const authored=screenPointToV2TrackPoint(rendered,this.currentScroll(),track.parallax);if(this.v2PlacementTarget==="segment")this.applyV2Edit(updateV2Segment(scene,track.id,this.v2SelectedSegmentId,{startTrackX:authored.x,offsetY:authored.y}));else this.applyV2ObjectEdit(moveV2Object(scene,track.id,this.v2SelectedObjectId,authored.x,authored.y));return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y}; const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const offset=renderedOriginToAuthoredOffset(rendered,layer,owner,this.currentScroll()); this.setDraft(updateSelectedSpriteOffset(this.draft,this.owner,this.selectedLayerId,offset,this.pixelSafe?"integer":"fractional"),false); }
  private onPointerUp(e: PointerEvent): void { if(this.drag?.pointerId!==e.pointerId) return;e.preventDefault();e.stopPropagation();this.endDrag();if(!getBackgroundSceneV2(globalThis))saveDraft(localStorage,this.draft);this.syncOverlay(); }
  private onKey(e: KeyboardEvent): void { if(!this.visible||!this.visualPlacement||!this.root.contains(document.activeElement)) return; if((document.activeElement as HTMLElement | null)?.tagName === "INPUT") return; const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}; const d=map[e.key]; if(!d) return; e.preventDefault(); this.nudge(d[0]*this.nudgeStep,d[1]*this.nudgeStep); }
  private onOverlayKeyDown=(e:KeyboardEvent):void=>this.onKey(e);
  private onV2YNudgeKeydown=(e:KeyboardEvent):void=>{if(!this.visible||(e.key!=="ArrowUp"&&e.key!=="ArrowDown")||isV2YNudgeTextTarget(e.target))return;const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const delta=(e.key==="ArrowUp"?-1:1)*(e.shiftKey?10:1);const segmentSelected=Boolean(this.v2SelectedSegmentId);const result=nudgeV2SelectionY(scene,this.v2SelectedTrackId,this.v2SelectedSegmentId,this.v2SelectedObjectId,delta);if(!result)return;e.preventDefault();if(segmentSelected)this.applyV2Edit(result as V2SegmentEditResult);else this.applyV2ObjectEdit(result as V2ObjectEditResult);};

  private exportFile(): void { const blob = new Blob([exportBackgroundScene(this.draft)], { type: "application/json" }); const a=el("a"); a.href=URL.createObjectURL(blob); a.download=`${this.draft.id||"background-scene"}.json`; a.click(); URL.revokeObjectURL(a.href); this.message="exported typed BackgroundScene JSON envelope"; this.render(); }
  private importFile(): void { const input=el("input"); input.type="file"; input.accept="application/json"; input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=importBackgroundSceneJson(String(r.result??"")); if(res.ok){this.message="imported scene";this.setDraft(res.scene);} else {this.message=`import failed: ${res.error}`;this.render();}}; r.readAsText(f);}; input.click(); }
}
