import { clearBackgroundPreviewState, getBackgroundPreviewState, getBackgroundScene, setBackgroundPreviewState, setBackgroundScene, subscribeBackgroundState } from "../render/BackgroundState";
import type { BackgroundLayer, SpriteBackgroundLayer } from "../render/webgl/bg/layers/BackgroundLayerTypes";
import type { BackgroundScene } from "../render/webgl/bg/layers/BackgroundSceneTypes";
import { addChunk, addLayer, cloneScene, createDemoScene, deleteChunk, deleteLayer, duplicateChunk, duplicateLayer, layerOwner, moveChunk, moveLayer, type LayerOwner, updateChunk, updateLayer } from "./PixelBgrLabState";
import { clearDraft, exportBackgroundScene, importBackgroundSceneJson, loadDraft, saveDraft } from "./PixelBgrLabSerialization";
import { validateBackgroundScene } from "./PixelBgrLabValidation";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function button(text: string, fn: () => void): HTMLButtonElement { const b = el("button"); b.type = "button"; b.textContent = text; b.onclick = fn; return b; }
function num(value: number, step: number, fn: (v:number)=>void): HTMLInputElement { const i = el("input"); i.type="number"; i.step=String(step); i.value=String(value); i.oninput=()=>fn(Number(i.value)); return i; }
function text(value: string, fn: (v:string)=>void): HTMLInputElement { const i = el("input"); i.value=value; i.oninput=()=>fn(i.value); return i; }
function check(value: boolean, fn: (v:boolean)=>void): HTMLInputElement { const i = el("input"); i.type="checkbox"; i.checked=value; i.oninput=()=>fn(i.checked); return i; }

export class PixelBgrLabUI {
  private root: HTMLDivElement;
  private visible = false;
  private draft: BackgroundScene;
  private owner: LayerOwner = { kind: "global" };
  private selectedLayerId = "";
  private message = "";
  private unsub: () => void;
  private openListeners = new Set<(open: boolean) => void>();

  constructor() {
    this.draft = loadDraft(localStorage) ?? getBackgroundScene(globalThis) ?? createDemoScene();
    this.applyIfValid();
    this.root = el("div", "cm-pixel-bgr-lab");
    this.root.style.display = "none";
    const style = el("style");
    style.textContent = `.cm-pixel-bgr-lab{position:fixed;inset:12px 12px auto auto;width:min(980px,calc(100vw - 24px));height:min(720px,calc(100vh - 24px));z-index:100001;background:rgba(4,8,16,.92);color:#eaf6ff;border:1px solid rgba(120,220,255,.28);border-radius:10px;font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;padding:10px;box-sizing:border-box;overflow:hidden}.cm-pixel-bgr-lab h3{margin:0;color:#8ee8ff}.cm-pixel-bgr-lab button{margin:2px;background:#12344a;color:#eaf6ff;border:1px solid #2e83aa;border-radius:4px}.cm-pixel-bgr-lab input,.cm-pixel-bgr-lab select,.cm-pixel-bgr-lab textarea{background:#071521;color:#eaf6ff;border:1px solid #28516d;border-radius:3px;font:inherit;box-sizing:border-box}.cm-pixel-bgr-grid{display:grid;grid-template-columns:220px 260px 1fr;gap:8px;height:calc(100% - 82px)}.cm-pixel-panel{border:1px solid rgba(120,220,255,.18);border-radius:6px;padding:6px;overflow:auto}.cm-pixel-row{display:flex;gap:5px;align-items:center;margin:4px 0}.cm-pixel-row label{min-width:88px;opacity:.78}.cm-pixel-list button{display:block;width:100%;text-align:left;margin:2px 0}.cm-pixel-list button.sel{background:#235b80}.cm-pixel-msg{white-space:pre-wrap;color:#ffd166;max-height:42px;overflow:auto}.cm-pixel-toolbar{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:6px 0}.cm-pixel-toolbar input{width:210px}.cm-pixel-preview input[type=range]{width:260px}`;
    this.root.appendChild(style);
    document.body.appendChild(this.root);
    this.unsub = subscribeBackgroundState(() => { if (!this.visible) this.render(); });
    this.render();
  }
  open(): void { if (this.visible) return; this.visible = true; this.root.style.display = ""; this.render(); this.notifyOpenChange(); }
  close(): void { if (!this.visible) { clearBackgroundPreviewState(globalThis); return; } this.visible = false; clearBackgroundPreviewState(globalThis); this.root.style.display = "none"; this.notifyOpenChange(); }
  show(): void { this.open(); }
  hide(): void { this.close(); }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
  onOpenChange(listener: (open: boolean) => void): () => void { this.openListeners.add(listener); listener(this.visible); return () => this.openListeners.delete(listener); }
  dispose(): void { this.unsub(); this.openListeners.clear(); this.root.remove(); }
  private notifyOpenChange(): void { for (const listener of [...this.openListeners]) listener(this.visible); }
  private setDraft(scene: BackgroundScene): void { this.draft = cloneScene(scene); saveDraft(localStorage, this.draft); this.applyIfValid(); this.render(); }
  private applyIfValid(): void { if (validateBackgroundScene(this.draft).valid) setBackgroundScene(cloneScene(this.draft), globalThis); }
  private currentLayers(): BackgroundLayer[] { return layerOwner(this.draft, this.owner); }
  private selectedLayer(): BackgroundLayer | null { return this.currentLayers().find(l=>l.id===this.selectedLayerId) ?? null; }
  private setOwner(owner: LayerOwner): void { this.owner = owner; this.selectedLayerId = this.currentLayers()[0]?.id ?? ""; this.render(); }
  private render(): void {
    while (this.root.childNodes.length > 1) this.root.removeChild(this.root.lastChild!);
    const h = el("h3"); h.textContent = "Pixel BGR Lab [F8]"; this.root.appendChild(h);
    const validation = validateBackgroundScene(this.draft);
    const toolbar = el("div", "cm-pixel-toolbar");
    toolbar.append("scene id", text(this.draft.id, v=>this.setDraft({...this.draft,id:v})), button("load current",()=>this.setDraft(getBackgroundScene(globalThis)??this.draft)), button("reset B2 demo",()=>{ clearDraft(localStorage); this.setDraft(createDemoScene()); }), button("import",()=>this.importFile()), button("export",()=>this.exportFile()), button("close",()=>this.close()));
    const status = el("span"); status.textContent = validation.valid ? `PASS (${validation.warnings.length} warnings)` : `ERRORS ${validation.errors.length}`; toolbar.appendChild(status); this.root.appendChild(toolbar);
    const msg = el("div","cm-pixel-msg"); msg.textContent = this.message || [...validation.errors,...validation.warnings].slice(0,4).map(i=>`${i.level}: ${i.path}: ${i.message}`).join("\n"); this.root.appendChild(msg);
    const grid = el("div","cm-pixel-bgr-grid"); this.root.appendChild(grid);
    grid.appendChild(this.renderChunks()); grid.appendChild(this.renderLayers()); grid.appendChild(this.renderProps());
    this.root.appendChild(this.renderPreview());
  }
  private renderChunks(): HTMLElement { const p=el("div","cm-pixel-panel"); p.append("Chunks (authored order; end shown) "); const list=el("div","cm-pixel-list"); const g=button("Global layers",()=>this.setOwner({kind:"global"})); if(this.owner.kind==="global") g.className="sel"; list.appendChild(g); for(const c of this.draft.chunks){ const b=button(`${c.id} [${c.startX}..${c.startX+c.length}]`,()=>this.setOwner({kind:"chunk",chunkId:c.id})); if(this.owner.kind==="chunk"&&this.owner.chunkId===c.id)b.className="sel"; list.appendChild(b);} p.appendChild(list); p.append(button("add",()=>this.setDraft(addChunk(this.draft))),button("duplicate",()=>{if(this.owner.kind==="chunk")this.setDraft(duplicateChunk(this.draft,this.owner.chunkId));}),button("delete",()=>{if(this.owner.kind==="chunk"&&confirm(`Delete chunk ${this.owner.chunkId}?`)){this.setDraft(deleteChunk(this.draft,this.owner.chunkId));this.owner={kind:"global"};}}),button("↑",()=>{if(this.owner.kind==="chunk")this.setDraft(moveChunk(this.draft,this.owner.chunkId,-1));}),button("↓",()=>{if(this.owner.kind==="chunk")this.setDraft(moveChunk(this.draft,this.owner.chunkId,1));})); return p; }
  private renderLayers(): HTMLElement { const p=el("div","cm-pixel-panel"); p.append(`Layers: ${this.owner.kind}`); const list=el("div","cm-pixel-list"); for(const l of this.currentLayers()){ const b=button(`${l.enabled?"✓":"·"} ${l.id} (${l.kind})`,()=>{this.selectedLayerId=l.id;this.render();}); if(l.id===this.selectedLayerId)b.className="sel"; list.appendChild(b);} p.appendChild(list); p.append(button("add sprite",()=>this.setDraft(addLayer(this.draft,this.owner))),button("duplicate",()=>this.selectedLayerId&&this.setDraft(duplicateLayer(this.draft,this.owner,this.selectedLayerId))),button("delete",()=>{if(this.selectedLayerId&&confirm(`Delete layer ${this.selectedLayerId}?`))this.setDraft(deleteLayer(this.draft,this.owner,this.selectedLayerId));}),button("toggle",()=>this.patchLayer(l=>({...l,enabled:!l.enabled} as BackgroundLayer))),button("↑",()=>this.selectedLayerId&&this.setDraft(moveLayer(this.draft,this.owner,this.selectedLayerId,-1))),button("↓",()=>this.selectedLayerId&&this.setDraft(moveLayer(this.draft,this.owner,this.selectedLayerId,1)))); return p; }
  private row(label:string,node:Node): HTMLDivElement { const r=el("div","cm-pixel-row"); const l=el("label"); l.textContent=label; r.append(l,node); return r; }
  private renderProps(): HTMLElement { const p=el("div","cm-pixel-panel"); if(this.owner.kind==="chunk"){ const c=this.draft.chunks.find(x=>x.id===this.owner.kind||x.id===(this.owner as any).chunkId); if(c){ p.append("Chunk properties"); p.append(this.row("id",text(c.id,v=>this.setDraft(updateChunk(this.draft,c.id,{id:v})))),this.row("startX",num(c.startX,1,v=>this.setDraft(updateChunk(this.draft,c.id,{startX:v})))),this.row("length",num(c.length,1,v=>this.setDraft(updateChunk(this.draft,c.id,{length:v}))))); }} const l=this.selectedLayer(); p.append(el("hr")); if(!l){p.append("No selected layer"); return p;} p.append(`Layer properties (${l.kind})`); p.append(this.row("id",text(l.id,v=>this.patchLayer(x=>({...x,id:v} as BackgroundLayer)))),this.row("enabled",check(l.enabled,v=>this.patchLayer(x=>({...x,enabled:v} as BackgroundLayer))))); if(l.kind==="sprite"){ const s=l as SpriteBackgroundLayer; const patch=(f:(x:SpriteBackgroundLayer)=>SpriteBackgroundLayer)=>this.patchLayer(x=>x.kind==="sprite"?f(x):x); p.append(this.row("texture",text(s.texture.url,v=>patch(x=>({...x,texture:{...x.texture,url:v}})))),this.row("opacity",num(s.opacity,.01,v=>patch(x=>({...x,opacity:v})))),this.row("blend",this.select(s.blend,["normal","additive"],v=>patch(x=>({...x,blend:v as any})))),this.row("parallax X",num(s.parallax.x,.01,v=>patch(x=>({...x,parallax:{...x.parallax,x:v}})))),this.row("parallax Y",num(s.parallax.y,.01,v=>patch(x=>({...x,parallax:{...x.parallax,y:v}})))),this.row("offset X",num(s.offset.x,1,v=>patch(x=>({...x,offset:{...x.offset,x:v}})))),this.row("offset Y",num(s.offset.y,1,v=>patch(x=>({...x,offset:{...x.offset,y:v}})))),this.row("repeat X",check(s.repeat.x,v=>patch(x=>({...x,repeat:{...x.repeat,x:v}})))),this.row("repeat Y",check(s.repeat.y,v=>patch(x=>({...x,repeat:{...x.repeat,y:v}})))),this.row("filtering",document.createTextNode(s.texture.filtering))); } else p.append(this.row("typed fields",document.createTextNode(JSON.stringify(l)))); return p; }
  private patchLayer(patcher:(l:BackgroundLayer)=>BackgroundLayer): void { if(this.selectedLayerId) this.setDraft(updateLayer(this.draft,this.owner,this.selectedLayerId,patcher)); }
  private select(value:string, values:string[], fn:(v:string)=>void): HTMLSelectElement { const s=el("select"); for(const v of values){ const o=el("option"); o.value=v;o.textContent=v;o.selected=v===value;s.appendChild(o);} s.oninput=()=>fn(s.value); return s; }
  private renderPreview(): HTMLElement { const p=el("div","cm-pixel-toolbar cm-pixel-preview"); const st=getBackgroundPreviewState(globalThis); p.append("Preview",button(st.enabled?"use gameplay scroll":"use preview scroll",()=>{setBackgroundPreviewState({enabled:!st.enabled,paused:true},globalThis);this.render();}),button(st.paused?"play":"pause",()=>{setBackgroundPreviewState({enabled:true,paused:!st.paused},globalThis);this.render();}),this.row("scrollX",num(st.scrollX,1,v=>setBackgroundPreviewState({enabled:true,scrollX:v},globalThis))),this.row("speed",num(st.speed,1,v=>setBackgroundPreviewState({speed:v},globalThis))),button("reset",()=>{setBackgroundPreviewState({enabled:true,paused:true,scrollX:0},globalThis);this.render();})); return p; }
  private exportFile(): void { const blob = new Blob([exportBackgroundScene(this.draft)], { type: "application/json" }); const a=el("a"); a.href=URL.createObjectURL(blob); a.download=`${this.draft.id||"background-scene"}.json`; a.click(); URL.revokeObjectURL(a.href); this.message="exported typed BackgroundScene JSON envelope"; this.render(); }
  private importFile(): void { const input=el("input"); input.type="file"; input.accept="application/json"; input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=importBackgroundSceneJson(String(r.result??"")); if(res.ok){this.message="imported scene";this.setDraft(res.scene);} else {this.message=`import failed: ${res.error}`;this.render();}}; r.readAsText(f);}; input.click(); }
}
