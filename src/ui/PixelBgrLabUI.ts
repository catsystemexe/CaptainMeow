import { clearBackgroundPreviewState, getBackgroundPreviewState, getBackgroundScene, requestBackgroundMarkerRuntimeReset, setBackgroundPreviewState, setBackgroundScene, subscribeBackgroundState } from "../render/BackgroundState";
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
  private drag: { pointerId: number; anchor: Point } | null = null;
  private warningsExpanded: boolean | null = null;
  private activeTab: PixelBgrLabTab = "scene";
  private readonly logicW = 896;
  private readonly logicH = 504;

  constructor() {
    this.draft = loadDraft(localStorage) ?? getBackgroundScene(globalThis) ?? createDemoScene();
    this.applyIfValid();
    this.root = el("div", "cm-pixel-bgr-lab");
    this.root.style.display = "none";
    const style = el("style");
    style.textContent = `.cm-bgr-placement-overlay{position:fixed;z-index:100000;pointer-events:none;box-sizing:border-box}.cm-bgr-placement-box{position:absolute;border:2px solid #ffe66d;box-sizing:border-box}.cm-bgr-placement-origin{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;background:#ff4d6d;border-radius:50%}.cm-bgr-placement-chunk{position:absolute;top:0;bottom:0;border-left:2px dashed #66e3ff;border-right:2px dashed #66e3ff;background:rgba(102,227,255,.04)}.cm-bgr-placement-label{position:absolute;left:4px;top:4px;color:#eaf6ff;background:rgba(0,0,0,.65);font:12px monospace;padding:2px 4px}.cm-pixel-bgr-lab{position:fixed;top:8px;right:8px;bottom:8px;width:clamp(360px,34vw,520px);max-width:min(520px,calc(100vw - 96px));min-width:min(420px,calc(100vw - 96px));z-index:100001;background:rgba(4,8,16,.94);color:#eaf6ff;border:1px solid rgba(120,220,255,.28);border-radius:8px;font:12px/1.25 ui-monospace,Menlo,Consolas,monospace;padding:8px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;min-height:0}.cm-pixel-bgr-lab h3{margin:0;color:#8ee8ff}.cm-pixel-bgr-lab button{margin:1px;min-height:26px;padding:2px 7px;background:#12344a;color:#eaf6ff;border:1px solid #2e83aa;border-radius:4px}.cm-pixel-bgr-lab input,.cm-pixel-bgr-lab select,.cm-pixel-bgr-lab textarea{min-height:26px;background:#071521;color:#eaf6ff;border:1px solid #28516d;border-radius:3px;font:inherit;box-sizing:border-box;max-width:100%}.cm-pixel-titlebar{display:flex;gap:6px;align-items:center;justify-content:space-between;min-width:0}.cm-pixel-scene-summary{opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cm-pixel-tabs{display:flex;gap:3px;flex-wrap:wrap;margin:6px 0}.cm-pixel-tab[aria-selected="true"]{background:#235b80;border-color:#8ee8ff;color:#fff}.cm-pixel-tab-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:2px}.cm-pixel-panel{border:1px solid rgba(120,220,255,.18);border-radius:6px;padding:5px;overflow:auto;min-height:0;margin-bottom:6px;box-sizing:border-box}.cm-pixel-props{overflow-y:visible;overflow-x:hidden}.cm-pixel-row{display:flex;gap:4px;align-items:center;margin:3px 0;min-width:0}.cm-pixel-row label{min-width:82px;opacity:.78}.cm-pixel-row input,.cm-pixel-row select{flex:1 1 auto;min-width:0}.cm-pixel-list button{display:block;width:100%;text-align:left;margin:1px 0;padding:2px 5px;overflow:hidden;text-overflow:ellipsis}.cm-pixel-list button.sel{background:#235b80}.cm-pixel-msg{white-space:pre-wrap;color:#ffd166;max-height:150px;overflow:auto;overflow-wrap:anywhere;border:1px solid rgba(255,209,102,.18);border-radius:4px;padding:3px 5px;margin:3px 0}.cm-pixel-summary{width:100%;text-align:left}.cm-pixel-toolbar{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:4px 0;min-width:0}.cm-pixel-toolbar input{width:190px}.cm-pixel-stepper{display:grid;grid-template-columns:28px minmax(72px,1fr) 28px;gap:3px;align-items:center;width:100%}.cm-pixel-stepper input{width:100%;text-align:right}.cm-pixel-stepper button{min-width:28px;padding:0}.cm-pixel-visual{margin-top:6px;padding-top:5px}.cm-pixel-nudges button{min-width:32px}.cm-pixel-preview{margin-top:5px}`
    this.root.appendChild(style);
    document.body.appendChild(this.root);
    this.unsub = subscribeBackgroundState(() => { if (!this.visible) this.render(); });
    this.render();
  }
  open(): void { if (this.visible) return; this.visible = true; this.root.style.display = ""; this.render(); this.syncOverlay(); this.notifyOpenChange(); }
  close(): void { this.visualPlacement = false; this.endDrag(); this.removeOverlay(); if (!this.visible) { clearBackgroundPreviewState(globalThis); return; } this.visible = false; clearBackgroundPreviewState(globalThis); this.root.style.display = "none"; this.notifyOpenChange(); }
  show(): void { this.open(); }
  hide(): void { this.close(); }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
  onOpenChange(listener: (open: boolean) => void): () => void { this.openListeners.add(listener); listener(this.visible); return () => this.openListeners.delete(listener); }
  dispose(): void { this.endDrag(); this.removeOverlay(); this.unsub(); this.openListeners.clear(); this.root.remove(); }
  private notifyOpenChange(): void { for (const listener of [...this.openListeners]) listener(this.visible); }
  private setDraft(scene: BackgroundScene, persist = true): void { this.draft = cloneScene(scene); if (persist) saveDraft(localStorage, this.draft); this.applyIfValid(); this.render(); this.syncOverlay(); }
  private applyIfValid(): void { if (validateBackgroundScene(this.draft).valid) setBackgroundScene(cloneScene(this.draft), globalThis); }
  private currentLayers(): BackgroundLayer[] { return layerOwner(this.draft, this.owner); }
  private selectedLayer(): BackgroundLayer | null { return this.currentLayers().find(l=>l.id===this.selectedLayerId) ?? null; }
  private setOwner(owner: LayerOwner): void { this.owner = owner; this.selectedLayerId = this.currentLayers()[0]?.id ?? ""; this.activeTab = owner.kind === "chunk" ? "layers" : "chunks"; this.render(); }
  private setActiveTab(tab: PixelBgrLabTab): void { this.activeTab = normalizePixelBgrLabTab(tab, this.activeTab); this.render(); }
  private render(): void {
    while (this.root.childNodes.length > 1) this.root.removeChild(this.root.lastChild!);
    this.activeTab = normalizePixelBgrLabTab(this.activeTab, pixelBgrLabTabForSelection(Boolean(this.selectedLayer()), this.selectedLayer()?.kind));
    const titlebar = el("div", "cm-pixel-titlebar");
    const h = el("h3"); h.textContent = "Pixel BGR Lab [F8]";
    const summary = el("span", "cm-pixel-scene-summary"); summary.textContent = this.draft.id || "untitled scene";
    titlebar.append(h, summary, button("close",()=>this.close()));
    this.root.appendChild(titlebar);
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
  private renderSceneTab(): HTMLElement { const p=el("div","cm-pixel-panel"); const validation = validateBackgroundScene(this.draft); p.append(this.row("scene id", text(this.draft.id, v=>this.setDraft({...this.draft,id:v})))); const actions=el("div","cm-pixel-toolbar"); actions.append(button("load current",()=>this.setDraft(getBackgroundScene(globalThis)??this.draft)), button("reset B2 demo",()=>{ clearDraft(localStorage); this.owner={kind:"global"}; this.selectedLayerId=""; this.setDraft(createDemoScene()); }), button("import",()=>this.importFile()), button("export",()=>this.exportFile())); p.append(actions, this.renderValidationSummary(validation.errors, validation.warnings), this.renderPreview()); return p; }
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

  private patchLayer(patcher:(l:BackgroundLayer)=>BackgroundLayer): void { if(this.selectedLayerId) this.setDraft(updateLayer(this.draft,this.owner,this.selectedLayerId,patcher)); }
  private select(value:string, values:string[], fn:(v:string)=>void): HTMLSelectElement { const s=el("select"); for(const v of values){ const o=el("option"); o.value=v;o.textContent=v;o.selected=v===value;s.appendChild(o);} s.oninput=()=>fn(s.value); return s; }
  private renderPreview(): HTMLElement { const p=el("div","cm-pixel-toolbar cm-pixel-preview"); const st=getBackgroundPreviewState(globalThis); p.append("Preview",button(st.enabled?"use gameplay scroll":"use preview scroll",()=>{setBackgroundPreviewState({enabled:!st.enabled,paused:true},globalThis);this.render();}),button(st.paused?"play":"pause",()=>{setBackgroundPreviewState({enabled:true,paused:!st.paused},globalThis);this.render();}),this.row("scrollX",this.numericStepper({value:st.scrollX,step:16,onCommit:v=>setBackgroundPreviewState({enabled:true,scrollX:v},globalThis)})),this.row("speed",this.numericStepper({value:st.speed,step:10,onCommit:v=>setBackgroundPreviewState({speed:v},globalThis)})),button("reset",()=>{setBackgroundPreviewState({enabled:true,paused:true,scrollX:0},globalThis);this.render();})); return p; }

  private selectedChunkStart(): number { if (this.owner.kind !== "chunk") return 0; const chunkId=(this.owner as {kind:"chunk";chunkId:string}).chunkId; return this.draft.chunks.find(c=>c.id===chunkId)?.startX ?? 0; }
  private selectedChunkEnd(): number { if (this.owner.kind !== "chunk") return this.logicW; const chunkId=(this.owner as {kind:"chunk";chunkId:string}).chunkId; const c = this.draft.chunks.find(x=>x.id===chunkId); return c ? c.startX + c.length : this.logicW; }
  private currentScroll(): Point { const st=getBackgroundPreviewState(globalThis); return { x: st.enabled ? st.scrollX : ((globalThis as any).__CM?.game?.world?.scrollX ?? 0), y: 0 }; }
  private editableSprite(): SpriteBackgroundLayer | null { const l=this.selectedLayer(); return l?.kind === "sprite" ? l as SpriteBackgroundLayer : null; }
  private ensureOverlay(): HTMLDivElement { if(this.overlay) return this.overlay; const o=el("div","cm-bgr-placement-overlay"); document.body.appendChild(o); o.addEventListener("pointerdown",e=>this.onPointerDown(e)); o.addEventListener("pointermove",e=>this.onPointerMove(e)); o.addEventListener("pointerup",e=>this.onPointerUp(e)); o.addEventListener("pointercancel",()=>this.endDrag()); window.addEventListener("keydown",e=>this.onKey(e)); this.overlay=o; return o; }
  private removeOverlay(): void { this.overlay?.remove(); this.overlay=null; }
  private endDrag(): void { this.drag=null; }
  private syncOverlay(): void {
    const layer=this.editableSprite();
    if(!this.visible || !this.visualPlacement || !layer){ this.removeOverlay(); return; }
    const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas){ this.removeOverlay(); return; }
    const rect=canvas.getBoundingClientRect(); const viewport=resolveCanvasViewportRect(rect,this.logicW,this.logicH); if(!viewport){ this.removeOverlay(); return; }
    const o=this.ensureOverlay(); o.style.left=`${viewport.left}px`; o.style.top=`${viewport.top}px`; o.style.width=`${viewport.width}px`; o.style.height=`${viewport.height}px`; o.style.cursor="grab"; o.innerHTML="";
    const scroll=this.currentScroll(); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const};
    const origin=layerRenderedOrigin(layer,owner,scroll); const sx=viewport.width/this.logicW, sy=viewport.height/this.logicH;
    const info=this.textureInfo(layer.id); const w=info?.state==="ready"?info.width:1, h=info?.state==="ready"?info.height:1;
    const box=el("div","cm-bgr-placement-box"); box.style.left=`${origin.x*sx}px`; box.style.top=`${origin.y*sy}px`; box.style.width=`${w*sx}px`; box.style.height=`${h*sy}px`; o.appendChild(box);
    const dot=el("div","cm-bgr-placement-origin"); dot.style.left=`${origin.x*sx}px`; dot.style.top=`${origin.y*sy}px`; o.appendChild(dot);
    const c0=this.selectedChunkStart()-scroll.x, c1=this.selectedChunkEnd()-scroll.x; const chunk=el("div","cm-bgr-placement-chunk"); chunk.style.left=`${c0*sx}px`; chunk.style.width=`${(c1-c0)*sx}px`; o.appendChild(chunk);
    const lab=el("div","cm-bgr-placement-label"); lab.textContent=`${this.owner.kind} ${this.owner.kind==="chunk"?(this.owner as {kind:"chunk";chunkId:string}).chunkId:"global"} · ${layer.id} · viewport 0..${this.logicW}`; o.appendChild(lab);
  }
  private pointerInternal(e: PointerEvent): Point | null { const canvas=document.querySelector("canvas#game") as HTMLCanvasElement | null; if(!canvas) return null; const vp=resolveCanvasViewportRect(canvas.getBoundingClientRect(),this.logicW,this.logicH); return vp?clientPointToInternalPoint({x:e.clientX,y:e.clientY},vp,this.logicW,this.logicH):null; }
  private onPointerDown(e: PointerEvent): void { const layer=this.editableSprite(); const p=this.pointerInternal(e); if(!layer||!p) return; e.preventDefault(); this.overlay?.setPointerCapture?.(e.pointerId); setBackgroundPreviewState({enabled:true,paused:true},globalThis); const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const origin=layerRenderedOrigin(layer,owner,this.currentScroll()); this.drag={pointerId:e.pointerId,anchor:{x:p.x-origin.x,y:p.y-origin.y}}; }
  private onPointerMove(e: PointerEvent): void { if(!this.drag||this.drag.pointerId!==e.pointerId) return; const layer=this.editableSprite(); const p=this.pointerInternal(e); if(!layer||!p) return; e.preventDefault(); const rendered={x:p.x-this.drag.anchor.x,y:p.y-this.drag.anchor.y}; const owner=this.owner.kind==="chunk" ? {kind:"chunk" as const, chunkStartX:this.selectedChunkStart()} : {kind:"global" as const}; const offset=renderedOriginToAuthoredOffset(rendered,layer,owner,this.currentScroll()); this.setDraft(updateSelectedSpriteOffset(this.draft,this.owner,this.selectedLayerId,offset,this.pixelSafe?"integer":"fractional"),false); }
  private onPointerUp(e: PointerEvent): void { if(this.drag?.pointerId!==e.pointerId) return; this.endDrag(); saveDraft(localStorage,this.draft); this.syncOverlay(); }
  private onKey(e: KeyboardEvent): void { if(!this.visible||!this.visualPlacement||!this.root.contains(document.activeElement)) return; if((document.activeElement as HTMLElement | null)?.tagName === "INPUT") return; const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}; const d=map[e.key]; if(!d) return; e.preventDefault(); this.nudge(d[0]*this.nudgeStep,d[1]*this.nudgeStep); }

  private exportFile(): void { const blob = new Blob([exportBackgroundScene(this.draft)], { type: "application/json" }); const a=el("a"); a.href=URL.createObjectURL(blob); a.download=`${this.draft.id||"background-scene"}.json`; a.click(); URL.revokeObjectURL(a.href); this.message="exported typed BackgroundScene JSON envelope"; this.render(); }
  private importFile(): void { const input=el("input"); input.type="file"; input.accept="application/json"; input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=importBackgroundSceneJson(String(r.result??"")); if(res.ok){this.message="imported scene";this.setDraft(res.scene);} else {this.message=`import failed: ${res.error}`;this.render();}}; r.readAsText(f);}; input.click(); }
}
