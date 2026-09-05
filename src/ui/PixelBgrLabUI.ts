import { clearBackgroundPreviewState, getBackgroundScene, getBackgroundSceneV2, getBackgroundState, requestBackgroundMarkerRuntimeReset, setBackgroundScene, setBackgroundSceneV2, subscribeBackgroundState } from "../render/BackgroundState";
import type { BackgroundState } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide";
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
import { applyChunkTimelineDrag, chunkEndX, chunkJumpState, chunkOverlapRanges, chunkTimelineBlocks, clickedTimelineCurrentX, createTimelineScale, cursorDragCurrentX, DEFAULT_CHUNK_TIMELINE_SNAP_PX, isolateTimelinePointerEvent, MIN_CHUNK_TIMELINE_LENGTH, overlapsForChunk, sceneTimelineBounds, shouldHandleTimelinePointerEvent, timelinePointerDeltaWorld, timelinePxToWorld, worldToTimelinePx, type ChunkTimelineDragMode, type TimelineScale } from "./PixelBgrTimeline";
import { projectBackgroundV2Timeline, type V2TimelineProjection } from "./PixelBgrV2TimelineProjection";
import { applyV2SegmentDrag, calculateV2SegmentOverlaps, canAuthorV2Segments, createV2Segment, deleteV2Segment, duplicateV2Segment, findV2Segment, findV2Track, updateV2Segment, V2_PARALLAX_AUTHORING_POLICY, type V2SegmentDragMode, type V2SegmentEditResult, type V2SegmentPatch } from "./PixelBgrV2SegmentEditing";
import { createV2Object, deleteV2Object, duplicateV2Object, findV2Object, moveV2Object, updateV2Object, type V2ObjectEditResult, type V2ObjectPatch } from "./PixelBgrV2ObjectEditing";
import { screenPointToV2TrackPoint, v2TrackPointToScreen } from "./PixelBgrV2PlacementCoordinates";
import type { BackgroundObject, BackgroundSceneV2, BackgroundSegment } from "../render/bg/v2/BackgroundV2Types";
import { PixelBgrRenderCoordinator } from "./PixelBgrRenderCoordinator";
import { disableV2Starfield, enableV2Starfield, randomizeV2StarfieldSeed, updateV2Starfield, type V2EnvironmentEditResult } from "./PixelBgrV2EnvironmentEditing";
import { clearBackgroundSceneV2, loadBackgroundSceneV2, parseBackgroundSceneV2, saveBackgroundSceneV2, serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function button(text: string, fn: () => void): HTMLButtonElement { const b = el("button"); b.type = "button"; b.textContent = text; b.onclick = fn; return b; }
type NumericStepperOptions = NumericStepOptions & { value: number; onCommit: (v:number)=>void };
function num(value: number, step: number, fn: (v:number)=>void): HTMLInputElement { const i = el("input"); i.type="number"; i.step=String(step); i.value=String(value); i.onchange=()=>{ const v=Number(i.value); if(Number.isFinite(v)) fn(v); else i.value=String(value); }; i.onkeydown=e=>{ if(e.key==="Enter") i.blur(); if(e.key==="Escape") { i.value=String(value); i.blur(); } }; return i; }
function text(value: string, fn: (v:string)=>void): HTMLInputElement { const i = el("input"); i.value=value; i.oninput=()=>fn(i.value); return i; }
function check(value: boolean, fn: (v:boolean)=>void): HTMLInputElement { const i = el("input"); i.type="checkbox"; i.checked=value; i.oninput=()=>fn(i.checked); return i; }

export type PixelBgrLabTab = "scene" | "chunks" | "layers" | "properties" | "placement" | "markers";
export const PIXEL_BGR_LAB_TABS: readonly PixelBgrLabTab[] = ["scene", "chunks", "layers", "properties", "placement", "markers"] as const;
export const PIXEL_BGR_LAB_TAB_LABELS: Record<PixelBgrLabTab, string> = { scene: "Scene", chunks: "Chunks", layers: "Layers", properties: "Properties", placement: "Placement", markers: "Markers" };
export function normalizePixelBgrLabTab(value: unknown, fallback: PixelBgrLabTab = "scene"): PixelBgrLabTab { return typeof value === "string" && (PIXEL_BGR_LAB_TABS as readonly string[]).includes(value) ? value as PixelBgrLabTab : fallback; }
export function pixelBgrLabTabForSelection(hasSelectedLayer: boolean, selectedLayerKind?: string, placementRequested = false): PixelBgrLabTab { if (placementRequested && selectedLayerKind === "sprite") return "placement"; return hasSelectedLayer ? "properties" : "scene"; }
export function pixelBgrLabTabAfterLayerDelete(current: PixelBgrLabTab, hasSelectedLayer: boolean): PixelBgrLabTab { return hasSelectedLayer ? current : current === "properties" || current === "placement" ? "layers" : current; }
export function shouldApplyPixelBgrV1Draft(state: BackgroundState | null): boolean { return state?.source?.kind !== "scene-v2"; }

export class PixelBgrLabUI {
  private root: HTMLDivElement;
  private visible = false;
  private draft: BackgroundScene;
  private owner: LayerOwner = { kind: "global" };
  private selectedLayerId = "";
  private selectedMarkerId = "";
  private selectedActionIndex = -1;
  private message = "";
  private unsub: () => void;
  private openListeners = new Set<(open: boolean) => void>();
  private visualPlacement = false;
  private pixelSafe = true;
  private nudgeStep = 1;
  private overlay: HTMLDivElement | null = null;
  private timelineDrag: { pointerId: number; chunkId: string; mode: ChunkTimelineDragMode; startClientX: number; startX: number; length: number; scale: TimelineScale; captureTarget: HTMLElement | null; active: boolean } | null = null;
  private v2SelectedTrackId = "";
  private v2SelectedSegmentId = "";
  private v2SelectedObjectId = "";
  private v2PlacementTarget: "segment" | "object" | null = null;
  private v2SegmentDrag: { pointerId:number; trackId:string; segmentId:string; mode:V2SegmentDragMode; startClientX:number; scale:TimelineScale; baseline:BackgroundSceneV2; captureTarget:HTMLElement|null; active:boolean } | null = null;
  private cursorDrag: { pointerId: number; scale: TimelineScale; timeline: HTMLElement; minX: number; maxX: number; captureTarget: HTMLElement | null; active: boolean } | null = null;
  private currentXLabel: HTMLElement | null = null;
  private cursorEl: HTMLElement | null = null;
  private drag: { pointerId: number; anchor: Point } | null = null;
  private warningsExpanded: boolean | null = null;
  private activeTab: PixelBgrLabTab = "scene";
  private overlayOpacity = 0.94;
  private readonly logicW = 896;
  private readonly logicH = 504;
  private readonly renderCoordinator = new PixelBgrRenderCoordinator();

  constructor() {
    const activeState = getBackgroundState(globalThis);
    this.draft = loadDraft(localStorage) ?? getBackgroundScene(globalThis) ?? createDemoScene();
    if (shouldApplyPixelBgrV1Draft(activeState)) this.applyIfValid();
    this.root = el("div", "cm-pixel-bgr-lab");
    this.root.style.display = "none";
    const style = el("style");
    style.textContent = `.cm-bgr-placement-overlay{position:fixed;z-index:100000;pointer-events:none;box-sizing:border-box}.cm-bgr-placement-box{position:absolute;border:2px solid #ffe66d;box-sizing:border-box}.cm-bgr-placement-origin{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;background:#ff4d6d;border-radius:50%}.cm-bgr-placement-chunk{position:absolute;top:0;bottom:0;border-left:2px dashed #66e3ff;border-right:2px dashed #66e3ff;background:rgba(102,227,255,.04)}.cm-bgr-placement-label{position:absolute;left:4px;top:4px;color:#eaf6ff;background:rgba(0,0,0,.65);font:12px monospace;padding:2px 4px}.cm-pixel-bgr-lab{position:fixed;top:min(156px,max(8px,calc(100vh - 120px)));right:8px;bottom:8px;width:min(400px,calc(100vw - 16px));height:auto;max-height:620px;z-index:100001;background:rgba(4,8,16,var(--cm-scene-lab-opacity,.94));color:#eaf6ff;border:1px solid rgba(120,220,255,.28);border-radius:8px;font:12px/1.25 ui-monospace,Menlo,Consolas,monospace;padding:8px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;min-height:0;pointer-events:none}.cm-pixel-bgr-lab>:not(style){pointer-events:auto}.cm-pixel-bgr-lab h3{margin:0;color:#8ee8ff}.cm-pixel-bgr-lab button{margin:1px;min-height:26px;padding:2px 7px;background:#12344a;color:#eaf6ff;border:1px solid #2e83aa;border-radius:4px}.cm-pixel-bgr-lab input,.cm-pixel-bgr-lab select,.cm-pixel-bgr-lab textarea{min-height:26px;background:#071521;color:#eaf6ff;border:1px solid #28516d;border-radius:3px;font:inherit;box-sizing:border-box;max-width:100%}.cm-pixel-titlebar{display:flex;gap:6px;align-items:center;justify-content:space-between;min-width:0}.cm-pixel-scene-summary{opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-pixel-tabs{display:flex;gap:3px;flex-wrap:wrap;margin:6px 0}.cm-pixel-tab[aria-selected="true"]{background:#235b80;border-color:#8ee8ff;color:#fff}.cm-pixel-tab-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:2px}.cm-pixel-panel{border:1px solid rgba(120,220,255,.18);border-radius:6px;padding:5px;overflow:auto;min-height:0;margin-bottom:6px;box-sizing:border-box}.cm-pixel-props{overflow-y:visible;overflow-x:hidden}.cm-pixel-row{display:flex;gap:4px;align-items:center;margin:3px 0;min-width:0}.cm-pixel-row label{min-width:82px;opacity:.78}.cm-pixel-row input,.cm-pixel-row select{flex:1 1 auto;min-width:0}.cm-pixel-list button{display:block;width:100%;text-align:left;margin:1px 0;padding:2px 5px;overflow:hidden;text-overflow:ellipsis}.cm-pixel-list button.sel{background:#235b80}.cm-pixel-msg{white-space:pre-wrap;color:#ffd166;max-height:150px;overflow:auto;overflow-wrap:anywhere;border:1px solid rgba(255,209,102,.18);border-radius:4px;padding:3px 5px;margin:3px 0}.cm-pixel-summary{width:100%;text-align:left}.cm-pixel-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:4px 0;min-width:0}.cm-pixel-toolbar input{width:190px}.cm-pixel-stepper{display:grid;grid-template-columns:28px minmax(72px,1fr) 28px;gap:3px;align-items:center;width:100%}.cm-pixel-stepper input{width:100%;text-align:right}.cm-pixel-stepper button{min-width:28px;padding:0}.cm-pixel-visual{margin-top:6px;padding-top:5px}.cm-pixel-nudges button{min-width:32px}.cm-pixel-preview{margin-top:5px}.cm-scene-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap}.cm-scene-toolbar input[type=text]{width:160px}.cm-timeline{position:relative;height:138px;border:1px solid rgba(120,220,255,.22);border-radius:6px;margin:6px 0;background:rgba(3,12,22,.78);overflow:hidden;user-select:none}.cm-ruler{position:absolute;left:0;right:0;top:0;height:26px;border-bottom:1px solid rgba(120,220,255,.16)}.cm-ruler-tick{position:absolute;top:0;height:100%;border-left:1px solid rgba(120,220,255,.22);font-size:10px;color:#9fdff2;padding-left:3px}.cm-chunk-line{position:absolute;left:0;right:0;top:42px;height:42px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035)}.cm-chunk-block{position:absolute;top:46px;height:34px;cursor:grab;border:1px solid #52d7ff;border-radius:5px;background:rgba(45,132,180,.72);color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px;box-sizing:border-box;font-size:11px}.cm-chunk-block:hover{filter:brightness(1.18)}.cm-chunk-block.dragging{cursor:grabbing;filter:brightness(1.3)}.cm-chunk-block.sel{border-color:#ffe66d;box-shadow:0 0 0 2px rgba(255,230,109,.28);background:rgba(72,153,211,.9)}.cm-chunk-handle{position:absolute;top:0;bottom:0;width:10px;background:rgba(255,255,255,.22);border:0;padding:0;min-height:0;margin:0}.cm-chunk-handle.left{left:0;cursor:ew-resize}.cm-chunk-handle.right{right:0;cursor:ew-resize}.cm-overlap{position:absolute;top:42px;height:42px;background:repeating-linear-gradient(135deg,rgba(255,75,90,.65),rgba(255,75,90,.65) 4px,rgba(255,75,90,.28) 4px,rgba(255,75,90,.28) 8px);border-left:1px solid #ff4d6d;border-right:1px solid #ff4d6d;pointer-events:none}.cm-marker-row{position:absolute;left:0;right:0;top:96px;height:30px;border-top:1px solid rgba(120,220,255,.16)}.cm-marker-dot{position:absolute;top:6px;width:8px;height:18px;margin-left:-4px;border-radius:4px;background:#a78bfa}.cm-marker-dot.chunk{background:#4ade80}.cm-transport-button{display:inline-grid;place-items:center;min-width:28px;width:28px;padding:0}.cm-transport-button svg{width:16px;height:16px}.cm-mode-pill{padding:2px 6px;border:1px solid rgba(255,209,102,.35);border-radius:999px;color:#ffd166}.cm-current-x{font-weight:700;color:#fff}.cm-cursor{position:absolute;top:0;bottom:0;width:0;border-left:2px solid #45a3ff;pointer-events:auto;cursor:ew-resize}.cm-cursor::after{content:"";position:absolute;top:25px;left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #45a3ff}.cm-chunk-inspector{border-color:rgba(255,230,109,.28)}`
    style.textContent += `.cm-v2-workspace{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;padding-right:2px}.cm-v2-panel{flex:0 0 auto;overflow:visible}.cm-v2-timeline-scroll{width:100%;max-width:100%;height:auto;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable;margin-top:6px;border:1px solid rgba(120,220,255,.22);border-radius:6px;box-sizing:border-box}.cm-v2-timeline{position:relative;min-height:136px;background:rgba(3,12,22,.78);user-select:none;pointer-events:auto}.cm-v2-ruler{pointer-events:auto}.cm-v2-lane{position:absolute;left:0;right:0;border-top:1px solid rgba(120,220,255,.13);box-sizing:border-box;overflow:hidden}.cm-v2-lane-label{position:sticky;left:4px;z-index:4;display:inline-block;width:132px;padding:3px 4px;color:#8ee8ff;background:rgba(3,12,22,.92);white-space:nowrap;pointer-events:none}.cm-v2-track-label{position:sticky;left:144px;z-index:3;display:inline-block;max-width:190px;padding:3px 4px;color:#bad7e3;background:rgba(3,12,22,.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}.cm-v2-overlap{position:absolute;top:17px;height:16px;background:repeating-linear-gradient(135deg,rgba(255,75,90,.7),rgba(255,75,90,.7) 4px,rgba(255,75,90,.25) 4px,rgba(255,75,90,.25) 8px);pointer-events:none;z-index:1}.cm-v2-segment,.cm-v2-object{position:absolute;top:17px;height:16px;box-sizing:border-box;border:1px solid #52d7ff;border-radius:3px;background:rgba(45,132,180,.78);color:#fff;font-size:10px;padding:1px 3px;overflow:hidden;white-space:nowrap;pointer-events:none;z-index:2}.cm-v2-segment.editable{pointer-events:auto;cursor:grab}.cm-v2-segment.sel{border-color:#ffe66d;box-shadow:0 0 0 2px rgba(255,230,109,.3)}.cm-v2-segment-handle{position:absolute;top:0;bottom:0;width:8px;background:rgba(255,255,255,.22)}.cm-v2-segment-handle.left{left:0;cursor:ew-resize}.cm-v2-segment-handle.right{right:0;cursor:ew-resize}.cm-v2-object{top:5px;height:12px;border-color:#c084fc;background:rgba(126,72,170,.82)}.cm-v2-segment.disabled,.cm-v2-object.disabled{opacity:.35;filter:saturate(.3)}.cm-v2-info{display:inline-block;padding:3px 6px;color:#b6cbd4;opacity:.8;pointer-events:none}.cm-v2-gameplay{background:rgba(69,163,255,.055)}.cm-v2-foreground{background:rgba(255,209,102,.04)}.cm-v2-cursor{z-index:8}`;
    this.root.appendChild(style);
    document.body.appendChild(this.root);
    this.unsub = subscribeBackgroundState(() => { if (this.visible) this.render(); });
    this.render();
  }
  open(): void { if (this.visible) return; this.visible = true; this.root.style.display = ""; this.render(); this.syncOverlay(); this.notifyOpenChange(); }
  close(): void { this.visualPlacement = false; this.v2PlacementTarget=null; this.endTimelineDrag(); this.endV2SegmentDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay(); if (!this.visible) { clearBackgroundPreviewState(globalThis); return; } this.visible = false; clearBackgroundPreviewState(globalThis); this.root.style.display = "none"; this.notifyOpenChange(); }
  show(): void { this.open(); }
  hide(): void { this.close(); }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
  updateRuntimeOverlay(): void { if (this.visible && this.overlay) this.syncOverlay(); }
  onOpenChange(listener: (open: boolean) => void): () => void { this.openListeners.add(listener); listener(this.visible); return () => this.openListeners.delete(listener); }
  dispose(): void { this.endTimelineDrag(); this.endV2SegmentDrag(); this.endCursorDrag(); this.endDrag(); this.removeOverlay(); this.unsub(); this.openListeners.clear(); this.root.remove(); }
  private notifyOpenChange(): void { for (const listener of [...this.openListeners]) listener(this.visible); }
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
    while (this.root.childNodes.length > 1) this.root.removeChild(this.root.lastChild!);
    this.root.style.setProperty("--cm-scene-lab-opacity", String(this.overlayOpacity));
    this.activeTab = normalizePixelBgrLabTab(this.activeTab, pixelBgrLabTabForSelection(Boolean(this.selectedLayer()), this.selectedLayer()?.kind));
    const titlebar = el("div", "cm-pixel-titlebar");
    const h = el("h3"); h.textContent = "Scene Lab [F8]";
    const v2Scene = getBackgroundSceneV2(globalThis);
    const summary = el("span", "cm-pixel-scene-summary"); summary.textContent = v2Scene?.id ?? this.draft.id ?? "untitled scene";
    titlebar.append(h, summary);
    this.root.appendChild(titlebar);
    if (v2Scene) {
      const workspace=el("div","cm-v2-workspace");
      workspace.append(this.renderV2Environment(v2Scene),this.renderV2Timeline(projectBackgroundV2Timeline(v2Scene,{},this.currentX())));
      this.root.append(this.renderV2Toolbar(),workspace);
      this.syncOverlay();
      return;
    }
    this.root.appendChild(this.renderSceneToolbar());
    this.root.appendChild(this.renderTimelineSection());
    const tabs = el("div", "cm-pixel-tabs"); tabs.setAttribute("role", "tablist");
    for (const tab of PIXEL_BGR_LAB_TABS) {
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
    const p=el("div","cm-pixel-panel cm-scene-toolbar");
    const badge=el("span","cm-mode-pill"); badge.textContent="V2 · SCENE AUTHORING";
    p.append(badge,
      button("save V2",()=>this.saveV2()), button("load saved V2",()=>this.loadV2()),
      button("clear saved V2",()=>this.clearSavedV2()), button("export V2",()=>this.exportV2File()),
      button("import V2",()=>this.importV2File()), button("close",()=>this.close()));
    const opacity=el("input"); opacity.type="range"; opacity.min="0.35"; opacity.max="1"; opacity.step="0.01"; opacity.value=String(this.overlayOpacity); opacity.oninput=()=>{ this.overlayOpacity=Number(opacity.value); this.root.style.setProperty("--cm-scene-lab-opacity",String(this.overlayOpacity)); };
    p.append(this.row("UI opacity",opacity));
    return p;
  }
  private applyV2EnvironmentEdit(result: V2EnvironmentEditResult): void {
    if (!result.ok) { this.message=result.error; this.render(); return; }
    this.message=""; setBackgroundSceneV2(result.scene,globalThis);
  }
  private renderV2Environment(scene: BackgroundSceneV2): HTMLElement {
    const p=el("div","cm-pixel-panel"); p.append("V2 · ENVIRONMENT",document.createElement("br"));
    const starfield=scene.environment.starfield;
    p.append(this.row("starfield enabled",check(Boolean(starfield),enabled=>this.applyV2EnvironmentEdit(enabled?enableV2Starfield(scene):disableV2Starfield(scene)))));
    if (!starfield) p.append("Starfield disabled / not configured.");
    else {
      p.append(this.row("seed",num(starfield.seed,1,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{seed:value})))),
        this.row("density",num(starfield.density,.05,value=>this.applyV2EnvironmentEdit(updateV2Starfield(scene,{density:value})))),
        button("randomize seed",()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);this.applyV2EnvironmentEdit(randomizeV2StarfieldSeed(scene,values[0]));}),
        button("remove starfield",()=>this.applyV2EnvironmentEdit(disableV2Starfield(scene))));
    }
    const note=el("div","cm-v2-info");note.textContent="Screen-space logical viewport; density is normalized 0..1; save/load is explicit.";p.append(note);
    if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}return p;
  }
  private saveV2():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const result=saveBackgroundSceneV2(localStorage,scene);this.message=result.ok?`saved V2 scene ${scene.id}`:`save failed: ${result.error}`;this.render();}
  private loadV2():void {const result=loadBackgroundSceneV2(localStorage);if(result.ok){this.message=`loaded saved V2 scene ${result.scene.id}`;setBackgroundSceneV2(result.scene,globalThis);}else{this.message=`load failed: ${result.error}`;this.render();}}
  private clearSavedV2():void {clearBackgroundSceneV2(localStorage);this.message="cleared saved V2 scene (active scene unchanged)";this.render();}
  private exportV2File():void {const scene=getBackgroundSceneV2(globalThis);if(!scene)return;const blob=new Blob([serializeBackgroundSceneV2(scene)],{type:"application/json"});const a=el("a");a.href=URL.createObjectURL(blob);a.download=`${scene.id||"background-scene"}.background-v2.json`;a.click();URL.revokeObjectURL(a.href);this.message=`exported V2 scene ${scene.id}`;this.render();}
  private importV2File():void {const input=el("input");input.type="file";input.accept="application/json";input.onchange=()=>{const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const result=parseBackgroundSceneV2(String(reader.result??""));if(result.ok){this.message=`imported V2 scene ${result.scene.id}`;setBackgroundSceneV2(result.scene,globalThis);}else{this.message=`V2 import failed: ${result.error}`;this.render();}};reader.readAsText(file);};input.click();}

  private renderV2Timeline(projection: V2TimelineProjection): HTMLElement {
    const panel=el("div","cm-pixel-panel cm-v2-panel");
    panel.append("V2 segment timeline + independent object canvas authoring · environment configured above");
    const contentSpan=Math.max(720,projection.bounds.endX-projection.bounds.startX);
    const widthPx=Math.max(1000,Math.ceil(contentSpan));
    const scale=createTimelineScale([{startX:projection.bounds.startX,length:Math.max(1,contentSpan)}],projection.playerX,widthPx);
    const scroll=el("div","cm-v2-timeline-scroll");
    const timeline=el("div","cm-v2-timeline"); timeline.style.width=`${widthPx}px`;
    const rowHeight=36;
    const headerHeight=28;
    const trackRows=projection.lanes.reduce((sum,lane)=>sum+Math.max(1,lane.tracks.length),0);
    timeline.style.height=`${headerHeight+trackRows*rowHeight}px`;
    timeline.onpointerdown=(e)=>{ const target=e.target; const seekTarget=target===timeline||(target instanceof HTMLElement&&(target.classList.contains("cm-ruler")||target.classList.contains("cm-v2-lane"))); if(this.cursorDrag||!seekTarget)return; isolateTimelinePointerEvent(e); const rect=timeline.getBoundingClientRect(); const x=Math.round(clickedTimelineCurrentX(e.clientX,rect.left,scale,projection.bounds.startX,projection.bounds.endX,rect.width)); this.setCurrentX(x,true); this.render(); };
    const ruler=el("div","cm-v2-ruler cm-ruler");
    const tickStep=Math.max(100,Math.round((scale.maxX-scale.minX)/8/50)*50);
    for(let x=Math.ceil(scale.minX/tickStep)*tickStep;x<=scale.maxX;x+=tickStep){const tick=el("div","cm-ruler-tick");tick.style.left=`${worldToTimelinePx(x,scale)}px`;tick.textContent=String(x);ruler.appendChild(tick);} timeline.appendChild(ruler);
    let top=headerHeight;
    for(const lane of projection.lanes){
      const rows=lane.tracks.length?lane.tracks:[null];
      rows.forEach((track,index)=>{
        const row=el("div",`cm-v2-lane cm-v2-${String(lane.role)}`); row.style.top=`${top}px`; row.style.height=`${rowHeight}px`;
        const label=el("span","cm-v2-lane-label"); label.textContent=index===0?lane.label:""; row.appendChild(label);
        if(track){
          const identity=el("span","cm-v2-track-label"); identity.textContent=`${track.id} · ${track.mode}${track.enabled?"":" · disabled"}`; row.appendChild(identity);
          for(const overlap of calculateV2SegmentOverlaps(track.segments.map(item=>({id:item.id,startTrackX:item.startX,widthPx:item.widthPx})))){const warning=el("span","cm-v2-overlap");warning.style.left=`${worldToTimelinePx(overlap.startX,scale)}px`;warning.style.width=`${Math.max(2,worldToTimelinePx(overlap.endX,scale)-worldToTimelinePx(overlap.startX,scale))}px`;warning.title=`Overlap ${overlap.startX}..${overlap.endX}: ${overlap.segmentIds.join(", ")}`;row.appendChild(warning);}
          for(const segment of track.segments){const editable=track.mode==="sequence";const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedSegmentId===segment.id&&!this.v2SelectedObjectId;const block=el("span",`cm-v2-segment${segment.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}${editable?" editable":""}`);block.style.left=`${worldToTimelinePx(segment.startX,scale)}px`;block.style.width=`${Math.max(2,worldToTimelinePx(segment.endX,scale)-worldToTimelinePx(segment.startX,scale))}px`;block.textContent=segment.id;block.title=`${track.id}/${segment.id} ${segment.startX}..${segment.endX} · z ${segment.effectiveZ}${editable?"":" · repeat read-only"}`;block.onpointerdown=e=>{this.v2SelectedObjectId="";this.v2PlacementTarget=null;if(!editable){isolateTimelinePointerEvent(e);this.v2SelectedTrackId=track.id;this.v2SelectedSegmentId=segment.id;this.render();return;}this.beginV2SegmentDrag(e,track.id,segment.id,"move",scale);};if(editable){const left=el("span","cm-v2-segment-handle left");left.title="Resize left edge";left.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-left",scale);const right=el("span","cm-v2-segment-handle right");right.title="Resize right edge";right.onpointerdown=e=>this.beginV2SegmentDrag(e,track.id,segment.id,"resize-right",scale);block.append(left,right);}row.appendChild(block);}
          for(const object of track.objects){const selected=this.v2SelectedTrackId===track.id&&this.v2SelectedObjectId===object.id;const marker=el("span",`cm-v2-object${object.enabled&&track.enabled?"":" disabled"}${selected?" sel":""}`);marker.style.pointerEvents="auto";marker.style.cursor="pointer";marker.style.left=`${worldToTimelinePx(object.x,scale)}px`;marker.style.width=`${object.width===null?8:Math.max(2,worldToTimelinePx(object.x+object.width,scale)-worldToTimelinePx(object.x,scale))}px`;marker.textContent=object.id;marker.title=`${track.id}/${object.id} @ ${object.x}${object.width===null?" · point marker":` · width ${object.width}`} · z ${object.effectiveZ}`;marker.onpointerdown=e=>{isolateTimelinePointerEvent(e);this.v2SelectedTrackId=track.id;this.v2SelectedSegmentId="";this.v2SelectedObjectId=object.id;this.v2PlacementTarget=null;this.render();};row.appendChild(marker);}
        } else if(lane.role==="environment") {
          const info=el("span","cm-v2-info"); info.textContent=projection.environmentLabels.join(" · "); row.appendChild(info);
        } else if(lane.role==="gameplay") {
          const info=el("span","cm-v2-info"); info.textContent="Gameplay chunks/markers: unavailable in current gameplay model"; row.appendChild(info);
        }
        timeline.appendChild(row); top+=rowHeight;
      });
    }
    const cursor=el("div","cm-cursor cm-v2-cursor"); cursor.style.left=`${worldToTimelinePx(projection.playerX,scale)}px`; cursor.title=`Drag Player X cursor ${Math.round(projection.playerX)}`; cursor.onpointerdown=e=>this.beginCursorDrag(e,timeline,scale,projection.bounds); this.cursorEl=cursor; timeline.appendChild(cursor);
    scroll.appendChild(timeline); panel.append(scroll,this.renderV2SegmentInspector(),this.renderV2ObjectInspector(),this.renderPreview([],projection.bounds)); return panel;
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
    const p=el("div","cm-pixel-panel cm-chunk-inspector"); const selected=this.selectedV2Segment();
    const scene=getBackgroundSceneV2(globalThis); const track=scene?findV2Track(scene,this.v2SelectedTrackId):null;
    if(!selected||!track){p.append("Segment inspector — select a segment. Sequence tracks retain M6 timeline editing; repeat tracks are read-only.",this.parallaxPolicyInfo());return p;}
    p.append(`Track ${track.id} · mode ${track.mode}`,document.createElement("br"),`Segment ID: ${selected.segment.id}`,document.createElement("br"),`Asset: ${selected.segment.asset.id} · ${selected.segment.asset.url}`);
    if(!canAuthorV2Segments(track)){p.append(document.createElement("br"),"Repeat segment authoring is limited/read-only: sequence placement semantics are not applied.",this.parallaxPolicyInfo());return p;}
    const patch=(value:V2SegmentPatch)=>this.applyV2Edit(updateV2Segment(selected.scene,track.id,selected.segment.id,value));
    p.append(this.row("startTrackX",num(selected.segment.startTrackX,16,v=>patch({startTrackX:v}))),this.row("widthPx",num(selected.segment.widthPx,16,v=>patch({widthPx:v}))),this.row("offsetY",num(selected.segment.offsetY,1,v=>patch({offsetY:v}))),this.row("opacity",num(selected.segment.opacity,.05,v=>patch({opacity:v}))),this.row("localZ",num(selected.segment.localZ,1,v=>patch({localZ:v}))),this.row("fadeInPx",num(selected.segment.fadeInPx??0,1,v=>patch({fadeInPx:v}))),this.row("fadeOutPx",num(selected.segment.fadeOutPx??0,1,v=>patch({fadeOutPx:v}))),this.row("blend",this.select(selected.segment.blend,["normal","additive"],v=>patch({blend:v as "normal"|"additive"}))),this.row("enabled",check(selected.segment.enabled,v=>patch({enabled:v}))));
    const toolbar=el("div","cm-pixel-toolbar");toolbar.append(button("create",()=>this.applyV2Edit(createV2Segment(selected.scene,track.id,selected.segment.startTrackX+selected.segment.widthPx,selected.segment.id))),button("duplicate",()=>this.applyV2Edit(duplicateV2Segment(selected.scene,track.id,selected.segment.id))),button("delete",()=>this.applyV2Edit(deleteV2Segment(selected.scene,track.id,selected.segment.id))),button(this.v2PlacementTarget==="segment"?"exit canvas placement":"place segment on canvas",()=>{this.v2PlacementTarget=this.v2PlacementTarget==="segment"?null:"segment";this.endDrag();this.render();}));p.append(toolbar);
    const overlaps=calculateV2SegmentOverlaps(track.segments).filter(item=>item.segmentIds.includes(selected.segment.id));if(overlaps.length){const warning=el("div","cm-pixel-msg");warning.textContent=`Overlap information: ${overlaps.map(item=>`${item.startX}..${item.endX}`).join(", ")}`;p.append(warning);}if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}p.append(this.parallaxPolicyInfo());return p;
  }
  private selectedV2Object(): {scene:BackgroundSceneV2;object:BackgroundObject}|null {const scene=getBackgroundSceneV2(globalThis);if(!scene)return null;const object=findV2Object(scene,this.v2SelectedTrackId,this.v2SelectedObjectId);return object?{scene,object}:null;}
  private renderV2ObjectInspector(): HTMLElement {
    const p=el("div","cm-pixel-panel cm-chunk-inspector");const selected=this.selectedV2Object();const scene=getBackgroundSceneV2(globalThis);const track=scene?findV2Track(scene,this.v2SelectedTrackId):null;
    if(!selected||!track){p.append("Object inspector — select an object marker, or create on the selected/default track from the shared asset catalog.");const first=scene?.tracks.find(item=>item.id===this.v2SelectedTrackId)??scene?.tracks[0];const asset=BACKGROUND_ASSET_CATALOG[0];if(first&&asset)p.append(button("create object",()=>this.applyV2ObjectEdit(createV2Object(scene!,first.id,{id:asset.id,url:asset.url},this.currentX(),0))));return p;}
    const object=selected.object;const patch=(value:V2ObjectPatch)=>this.applyV2ObjectEdit(updateV2Object(selected.scene,track.id,object.id,value));const optional=(value:number|undefined,key:"width"|"height")=>{const input=text(value===undefined?"":String(value),raw=>{if(raw.trim()==="")patch({[key]:undefined});else{const parsed=Number(raw);if(Number.isFinite(parsed))patch({[key]:parsed});}});input.type="number";return input;};
    const metadata=this.v2TextureInfo(object.asset.url);p.append(`Track ${track.id} · role ${track.role}`,document.createElement("br"),`Object ID: ${object.id}`,this.row("asset id",document.createTextNode(object.asset.id)),this.row("asset URL",document.createTextNode(object.asset.url)),this.row("texture metadata",document.createTextNode(metadata?`${metadata.state} ${metadata.width}x${metadata.height}`:"loading/unavailable")));
    const assetSelect=this.select(object.asset.id,BACKGROUND_ASSET_CATALOG.map(a=>a.id),id=>{const asset=BACKGROUND_ASSET_CATALOG.find(a=>a.id===id);if(asset)patch({asset:{id:asset.id,url:asset.url}});});p.append(this.row("asset",assetSelect),this.row("startTrackX",num(object.startTrackX,1,v=>patch({startTrackX:v}))),this.row("y",num(object.y,1,v=>patch({y:v}))),this.row("width",optional(object.width,"width")),this.row("height",optional(object.height,"height")),this.row("localZ",num(object.localZ,1,v=>patch({localZ:v}))),this.row("opacity",num(object.opacity,.05,v=>patch({opacity:v}))),this.row("blend",this.select(object.blend,["normal","additive"],v=>patch({blend:v as "normal"|"additive"}))),this.row("enabled",check(object.enabled,v=>patch({enabled:v}))));
    const toolbar=el("div","cm-pixel-toolbar");toolbar.append(button("create",()=>{const asset=BACKGROUND_ASSET_CATALOG.find(a=>a.id===object.asset.id)!;this.applyV2ObjectEdit(createV2Object(selected.scene,track.id,{id:asset?.id??object.asset.id,url:asset?.url??object.asset.url},object.startTrackX+16,object.y));}),button("duplicate",()=>this.applyV2ObjectEdit(duplicateV2Object(selected.scene,track.id,object.id))),button("delete",()=>{this.v2PlacementTarget=null;this.applyV2ObjectEdit(deleteV2Object(selected.scene,track.id,object.id));}),button(this.v2PlacementTarget==="object"?"exit canvas placement":"place object on canvas",()=>{this.v2PlacementTarget=this.v2PlacementTarget==="object"?null:"object";this.endDrag();this.render();}));p.append(toolbar);if(this.message){const message=el("div","cm-pixel-msg");message.textContent=this.message;p.append(message);}return p;
  }
  private parallaxPolicyInfo(): HTMLElement { const info=el("div","cm-v2-info"); info.dataset.policy=V2_PARALLAX_AUTHORING_POLICY; info.textContent="Parallax is read-only in M6. Any future change must explicitly choose: keep track-space positions, or preserve visual alignment with a defined rebase."; return info; }
  private beginV2SegmentDrag(e:PointerEvent,trackId:string,segmentId:string,mode:V2SegmentDragMode,scale:TimelineScale):void { isolateTimelinePointerEvent(e);this.endV2SegmentDrag();const baseline=getBackgroundSceneV2(globalThis);if(!baseline)return;this.v2SelectedTrackId=trackId;this.v2SelectedSegmentId=segmentId;const captureTarget=e.currentTarget instanceof HTMLElement?e.currentTarget:null;captureTarget?.setPointerCapture?.(e.pointerId);this.v2SegmentDrag={pointerId:e.pointerId,trackId,segmentId,mode,startClientX:e.clientX,scale,baseline,captureTarget,active:true};window.addEventListener("pointermove",this.onV2SegmentPointerMove);window.addEventListener("pointerup",this.onV2SegmentPointerUp);window.addEventListener("pointercancel",this.onV2SegmentPointerUp); }
  private onV2SegmentPointerMove=(e:PointerEvent):void=>{const drag=this.v2SegmentDrag;if(!drag||!shouldHandleTimelinePointerEvent(drag,e.pointerId))return;isolateTimelinePointerEvent(e);this.applyV2Edit(applyV2SegmentDrag(drag.baseline,drag.trackId,drag.segmentId,drag.mode,timelinePointerDeltaWorld(drag.startClientX,e.clientX,drag.scale)));};
  private onV2SegmentPointerUp=(e:PointerEvent):void=>{if(!this.v2SegmentDrag||!shouldHandleTimelinePointerEvent(this.v2SegmentDrag,e.pointerId))return;isolateTimelinePointerEvent(e);this.endV2SegmentDrag();this.render();};
  private endV2SegmentDrag():void {const drag=this.v2SegmentDrag;if(!drag)return;drag.captureTarget?.releasePointerCapture?.(drag.pointerId);this.v2SegmentDrag=null;window.removeEventListener("pointermove",this.onV2SegmentPointerMove);window.removeEventListener("pointerup",this.onV2SegmentPointerUp);window.removeEventListener("pointercancel",this.onV2SegmentPointerUp);}
  private renderSceneToolbar(): HTMLElement {
    const p=el("div","cm-pixel-panel cm-scene-toolbar");
    p.append("Scene", text(this.draft.id, v=>this.setDraft({...this.draft,id:v})),
      button("load current",()=>this.setDraft(getBackgroundScene(globalThis)??this.draft)),
      button("export",()=>this.exportFile()), button("import",()=>this.importFile()),
      button("duplicate",()=>this.setDraft({...cloneScene(this.draft), id: `${this.draft.id || "scene"}-copy`})),
      button("delete/reset",()=>{ if(confirm("Reset Scene Lab draft to the B2 demo scene?")){ clearDraft(localStorage); this.owner={kind:"global"}; this.selectedLayerId=""; this.setDraft(createDemoScene()); }}),
      button("close",()=>this.close()));
    const opacity = el("input"); opacity.type="range"; opacity.min="0.35"; opacity.max="1"; opacity.step="0.01"; opacity.value=String(this.overlayOpacity); opacity.oninput=()=>{ this.overlayOpacity=Number(opacity.value); this.root.style.setProperty("--cm-scene-lab-opacity", String(this.overlayOpacity)); };
    p.append(this.row("UI opacity", opacity));
    return p;
  }
  private renderSceneTab(): HTMLElement { const p=el("div","cm-pixel-panel"); const validation = validateBackgroundScene(this.draft); p.append(this.renderValidationSummary(validation.errors, validation.warnings), this.renderPreview()); return p; }
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
    if(this.cursorEl) this.cursorEl.style.left=`${leftPx}px`;
    if(this.currentXLabel) this.currentXLabel.textContent=`Player X: ${Math.round(x)} px`;
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
  private renderPreview(chunks=this.draft.chunks, explicitBounds?: {startX:number;endX:number}): HTMLElement { const p=el("div","cm-pixel-toolbar cm-pixel-preview"); const currentX=this.currentX(); const jumps=chunkJumpState(chunks,currentX); const paused=this.gameplayPaused(); const label=el("span","cm-current-x"); label.textContent=`Player X: ${Math.round(currentX)} px`; this.currentXLabel=label; const playPause=this.iconButton(paused?"Play":"Pause",paused?Play:Pause,paused?"Play":"Pause",()=>{ (globalThis as any).__CM?.loop?.setPaused?.(!paused); this.render(); }); p.append(label,this.iconButton("Previous chunk",SkipBack,"SkipBack",()=>{ if(jumps.previousX!==null){ this.setCurrentX(jumps.previousX, paused); this.render(); }},!jumps.canPrevious),playPause,this.iconButton("Stop and return to scene start",Square,"Square",()=>{ const start=explicitBounds?.startX??sceneTimelineBounds(chunks,0).startX; this.setCurrentX(start, true); this.render(); }),this.iconButton("Next chunk",SkipForward,"SkipForward",()=>{ if(jumps.nextX!==null){ this.setCurrentX(jumps.nextX, paused); this.render(); }},!jumps.canNext)); return p; }

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
    if(v2Scene){this.syncV2SelectionOverlay(v2Scene);return;}
    const layer=this.editableSprite();
    if(!this.visible || !this.visualPlacement || !layer){ this.removeOverlay(); return; }
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas){ this.removeOverlay(); return; }
    const rect=canvas.getBoundingClientRect(); const viewport=resolveCanvasViewportRect(rect,this.logicW,this.logicH); if(!viewport){ this.removeOverlay(); return; }
    const o=this.ensureOverlay(); o.style.left=`${viewport.left}px`; o.style.top=`${viewport.top}px`; o.style.width=`${viewport.width}px`; o.style.height=`${viewport.height}px`; o.style.cursor="grab"; o.style.pointerEvents="auto"; o.innerHTML="";
    const scroll=this.currentScroll(); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const};
    const origin=layerRenderedOrigin(layer,owner,scroll); const sx=viewport.width/this.logicW, sy=viewport.height/this.logicH;
    const info=this.textureInfo(layer.id); const w=info?.state==="ready"?info.width:1, h=info?.state==="ready"?info.height:1;
    const box=el("div","cm-bgr-placement-box"); box.style.left=`${origin.x*sx}px`; box.style.top=`${origin.y*sy}px`; box.style.width=`${w*sx}px`; box.style.height=`${h*sy}px`; o.appendChild(box);
    const dot=el("div","cm-bgr-placement-origin"); dot.style.left=`${origin.x*sx}px`; dot.style.top=`${origin.y*sy}px`; o.appendChild(dot);
    const c0=this.selectedChunkStart()-scroll.x, c1=this.selectedChunkEnd()-scroll.x; const chunk=el("div","cm-bgr-placement-chunk"); chunk.style.left=`${c0*sx}px`; chunk.style.width=`${(c1-c0)*sx}px`; o.appendChild(chunk);
    const lab=el("div","cm-bgr-placement-label"); lab.textContent=`${this.owner.kind} ${this.owner.kind==="chunk"?(this.owner as {kind:"chunk";chunkId:string}).chunkId:"global"} · ${layer.id} · viewport 0..${this.logicW}`; o.appendChild(lab);
  }
  private syncV2SelectionOverlay(scene:BackgroundSceneV2):void {
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement|null;if(!this.visible||!canvas){this.removeOverlay();return;}const viewport=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH);if(!viewport){this.removeOverlay();return;}const overlay=this.ensureOverlay();overlay.style.left=`${viewport.left}px`;overlay.style.top=`${viewport.top}px`;overlay.style.width=`${viewport.width}px`;overlay.style.height=`${viewport.height}px`;overlay.style.cursor="default";overlay.style.pointerEvents="none";overlay.innerHTML="";const sx=viewport.width/this.logicW,sy=viewport.height/this.logicH;
    for(const track of scene.tracks){if(!track.enabled)continue;for(const target of [...track.segments.map(segment=>({kind:"segment" as const,id:segment.id,point:{x:segment.startTrackX,y:segment.offsetY},asset:segment.asset,width:segment.widthPx,height:undefined,enabled:segment.enabled})),...track.objects.map(object=>({kind:"object" as const,id:object.id,point:{x:object.startTrackX,y:object.y},asset:object.asset,width:object.width,height:object.height,enabled:object.enabled}))]){if(!target.enabled)continue;const origin=v2TrackPointToScreen(target.point,this.currentScroll(),track.parallax);const metadata=this.v2TextureInfo(target.asset.url);const width=target.width??metadata?.width??16,height=target.height??metadata?.height??16;const box=el("div","cm-bgr-placement-box");box.style.left=`${origin.x*sx}px`;box.style.top=`${origin.y*sy}px`;box.style.width=`${Math.max(4,width*sx)}px`;box.style.height=`${Math.max(4,height*sy)}px`;box.style.borderColor=target.kind==="object"?"#c084fc":"#52d7ff";box.style.opacity=this.v2SelectedTrackId===track.id&&(target.kind==="object"?this.v2SelectedObjectId===target.id:this.v2SelectedSegmentId===target.id)?"1":".55";box.title=`${target.kind} ${track.id}/${target.id}`;overlay.appendChild(box);}}
    const label=el("div","cm-bgr-placement-label");label.textContent="V2 canvas selection · cyan segments · purple objects";overlay.appendChild(label);
  }
  private syncV2Overlay(scene:BackgroundSceneV2):void {
    const track=findV2Track(scene,this.v2SelectedTrackId);const segment=this.v2PlacementTarget==="segment"?findV2Segment(scene,this.v2SelectedTrackId,this.v2SelectedSegmentId):null;const object=this.v2PlacementTarget==="object"?findV2Object(scene,this.v2SelectedTrackId,this.v2SelectedObjectId):null;
    if(!track||(!segment&&!object)){this.v2PlacementTarget=null;this.removeOverlay();return;}
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement|null;if(!canvas){this.removeOverlay();return;}const viewport=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH);if(!viewport){this.removeOverlay();return;}
    const targetAsset=segment?.asset??object!.asset;const metadata=this.v2TextureInfo(targetAsset.url);const point=segment?{x:segment.startTrackX,y:segment.offsetY}:{x:object!.startTrackX,y:object!.y};const origin=v2TrackPointToScreen(point,this.currentScroll(),track.parallax);const width=segment?.widthPx??object?.width??metadata?.width??16;const height=object?.height??metadata?.height??16;const sx=viewport.width/this.logicW,sy=viewport.height/this.logicH;
    const overlay=this.ensureOverlay();overlay.style.left=`${viewport.left}px`;overlay.style.top=`${viewport.top}px`;overlay.style.width=`${viewport.width}px`;overlay.style.height=`${viewport.height}px`;overlay.style.cursor="grab";overlay.style.pointerEvents="auto";overlay.innerHTML="";
    const box=el("div","cm-bgr-placement-box");box.style.left=`${origin.x*sx}px`;box.style.top=`${origin.y*sy}px`;box.style.width=`${Math.max(2,width*sx)}px`;box.style.height=`${Math.max(2,height*sy)}px`;overlay.appendChild(box);const dot=el("div","cm-bgr-placement-origin");dot.style.left=`${origin.x*sx}px`;dot.style.top=`${origin.y*sy}px`;overlay.appendChild(dot);const label=el("div","cm-bgr-placement-label");label.textContent=`V2 ${this.v2PlacementTarget} · ${track.id} · ${segment?.id??object?.id}`;overlay.appendChild(label);
  }
  private pointerInternal(e: PointerEvent): Point | null { const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas) return null; const vp=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH); return vp?clientPointToInternalPoint({x:e.clientX,y:e.clientY},vp,this.logicW,this.logicH):null; }
  private onPointerDown(e: PointerEvent): void { const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);const segment=this.v2PlacementTarget==="segment"?findV2Segment(scene,track?.id??"",this.v2SelectedSegmentId):null;const object=this.v2PlacementTarget==="object"?findV2Object(scene,track?.id??"",this.v2SelectedObjectId):null;if(!track||(!segment&&!object))return;e.preventDefault();e.stopPropagation();this.overlay?.setPointerCapture?.(e.pointerId);const point=segment?{x:segment.startTrackX,y:segment.offsetY}:{x:object!.startTrackX,y:object!.y};const origin=v2TrackPointToScreen(point,this.currentScroll(),track.parallax);this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}};return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); this.overlay?.setPointerCapture?.(e.pointerId); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const origin=layerRenderedOrigin(layer,owner,this.currentScroll()); this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}}; }
  private onPointerMove(e: PointerEvent): void { if(!this.drag||this.drag.pointerId!==e.pointerId) return;const p=this.pointerInternal(e);if(!p)return;const scene=getBackgroundSceneV2(globalThis);if(scene&&this.v2PlacementTarget){const track=findV2Track(scene,this.v2SelectedTrackId);if(!track)return;e.preventDefault();e.stopPropagation();const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y};const authored=screenPointToV2TrackPoint(rendered,this.currentScroll(),track.parallax);if(this.v2PlacementTarget==="segment")this.applyV2Edit(updateV2Segment(scene,track.id,this.v2SelectedSegmentId,{startTrackX:authored.x,offsetY:authored.y}));else this.applyV2ObjectEdit(moveV2Object(scene,track.id,this.v2SelectedObjectId,authored.x,authored.y));return;}const layer=this.editableSprite();if(!layer)return;e.preventDefault(); const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y}; const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const offset=renderedOriginToAuthoredOffset(rendered,layer,owner,this.currentScroll()); this.setDraft(updateSelectedSpriteOffset(this.draft,this.owner,this.selectedLayerId,offset,this.pixelSafe?"integer":"fractional"),false); }
  private onPointerUp(e: PointerEvent): void { if(this.drag?.pointerId!==e.pointerId) return;e.preventDefault();e.stopPropagation();this.endDrag();if(!getBackgroundSceneV2(globalThis))saveDraft(localStorage,this.draft);this.syncOverlay(); }
  private onKey(e: KeyboardEvent): void { if(!this.visible||!this.visualPlacement||!this.root.contains(document.activeElement)) return; if((document.activeElement as HTMLElement | null)?.tagName === "INPUT") return; const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}; const d=map[e.key]; if(!d) return; e.preventDefault(); this.nudge(d[0]*this.nudgeStep,d[1]*this.nudgeStep); }
  private onOverlayKeyDown=(e:KeyboardEvent):void=>this.onKey(e);

  private exportFile(): void { const blob = new Blob([exportBackgroundScene(this.draft)], { type: "application/json" }); const a=el("a"); a.href=URL.createObjectURL(blob); a.download=`${this.draft.id||"background-scene"}.json`; a.click(); URL.revokeObjectURL(a.href); this.message="exported typed BackgroundScene JSON envelope"; this.render(); }
  private importFile(): void { const input=el("input"); input.type="file"; input.accept="application/json"; input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=importBackgroundSceneJson(String(r.result??"")); if(res.ok){this.message="imported scene";this.setDraft(res.scene);} else {this.message=`import failed: ${res.error}`;this.render();}}; r.readAsText(f);}; input.click(); }
}
