import assert from "node:assert/strict";
import { type CMEventMap } from "../engine/core/events";
import { createWorldState } from "../game/data/WorldState";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";

class FakeStyle { cssText = ""; [key: string]: any; setProperty(k: string, v: string) { this[k] = v; } }
class FakeElement {
  id = ""; textContent = ""; value = ""; type = ""; min = ""; max = ""; step = ""; rows = 0; readOnly = false; disabled = false; tabIndex = 0; style = new FakeStyle(); children: FakeElement[] = []; parentNode: FakeElement | null = null; attributes = new Map<string,string>(); listeners = new Map<string, Array<(ev?: any)=>void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(c:T):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; this.children.push(c); if (this.tagName === "SELECT" && !this.value && c.tagName === "OPTION") this.value = c.value; return c; }
  insertBefore<T extends FakeElement>(c:T,b:FakeElement|null):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; const i=b?this.children.indexOf(b):-1; if(i>=0)this.children.splice(i,0,c); else this.children.push(c); return c; }
  replaceChildren(...cs:FakeElement[]){ for (const c of this.children) c.parentNode = null; this.children=[]; for(const c of cs)this.appendChild(c); }
  remove(){ if(this.parentNode)this.parentNode.children=this.parentNode.children.filter((x)=>x!==this); this.parentNode=null; }
  setAttribute(n:string,v:string){this.attributes.set(n,v);} getAttribute(n:string){return this.attributes.get(n)??null;}
  addEventListener(n:string,fn:(ev?:any)=>void){this.listeners.set(n,[...(this.listeners.get(n)??[]),fn]);} removeEventListener(){}
  click(){ if (this.disabled) return; for(const fn of this.listeners.get("click")??[]) fn({target:this, preventDefault(){}, stopPropagation(){}}); }
  dispatchEvent(ev:{type:string}){ for(const fn of this.listeners.get(ev.type)??[]) fn({...ev,target:this,preventDefault(){},stopPropagation(){}}); return true; }
  focus(){ (globalThis.document as any).activeElement = this; }
  contains(node:FakeElement|null):boolean{ for(let c=node;c;c=c.parentNode) if(c===this)return true; return false; }
  getBoundingClientRect(){ return { left: 100, right: 300, top: 40, width: 200, height: 26 }; }
  querySelector(sel:string):FakeElement|null{ if(sel.startsWith("#"))return this.findById(sel.slice(1)); if(sel==='[role="listbox"]')return this.findAll((e)=>e.attributes.get("role")==="listbox")[0]??null; return null; }
  querySelectorAll(sel:string):FakeElement[]{ if(sel==="button,input,select,textarea")return this.findAll((e)=>["BUTTON","INPUT","SELECT","TEXTAREA"].includes(e.tagName)); if(sel==="button,input,select")return this.findAll((e)=>["BUTTON","INPUT","SELECT"].includes(e.tagName)); return []; }
  findById(id:string):FakeElement|null{ if(this.id===id)return this; for(const c of this.children){const f=c.findById(id); if(f)return f;} return null; }
  findAll(p:(e:FakeElement)=>boolean):FakeElement[]{ return [...(p(this)?[this]:[]),...this.children.flatMap((c)=>c.findAll(p))]; }
}
function installDom(){ const body=new FakeElement("BODY"); const timers:any[]=[]; const doc:any={body, activeElement:null, createElement:(t:string)=>new FakeElement(t.toUpperCase()), getElementById:(id:string)=>body.findById(id), addEventListener(){}, removeEventListener(){}}; (globalThis as any).document=doc; (globalThis as any).window={ innerWidth:1200, innerHeight:800, setInterval:(fn:any)=>{timers.push(fn); return timers.length;}, clearInterval(){}, addEventListener(){}, removeEventListener(){}, confirm:()=>true, __CM:{store:{debugForEachAlive:()=>{}}, enemyGroups:null, game:{loop:{tick:0}, spawn:{spawnPreviewEnemy:()=>null}}}}; return {doc,timers}; }
function clickButtonByText(root: FakeElement, text: string) { const button = root.findAll((el) => el.tagName === "BUTTON" && el.textContent === text)[0]; assert(button, `button ${text} exists`); button.click(); return button; }
function mount() { const {doc,timers}=installDom(); const emitted: {type:keyof CMEventMap,payload:any}[]=[]; const summoner=new DevSummoner({emitNext:(type:keyof CMEventMap,payload:any)=>emitted.push({type,payload})} as any, createWorldState(), 896, 504); summoner.init(); const panel=doc.getElementById(DEV_SUMMONER_PANEL_ID)!; clickButtonByText(panel, "FSM"); const newPresetButton = panel.findById("ds-fsm-preset-toolbar")!.findAll((el) => el.tagName === "BUTTON" && el.textContent === "+")[0]; newPresetButton.click(); return {panel, doc, timers, emitted}; }
const triggerValue = (panel: FakeElement) => panel.findAll((el) => el.getAttribute("aria-label") === "Increase scrX").at(-1)!.parentNode!.children[2].textContent!;
const stateSummary = (panel: FakeElement) => panel.findAll((el) => el.getAttribute("data-fsm-state-trigger-summary") === "enter")[0].textContent!;
const { panel, emitted } = mount();
for (const candidate of panel.findAll((el) => el.getAttribute("data-fsm-state-row") === "1")) {
  candidate.click();
  const maybe = panel.findAll((el) => el.tagName === "BUTTON" && el.getAttribute("aria-label") === "Increase scrX").at(-1);
  if (maybe && !maybe.disabled) break;
}
const row = panel.findAll((el) => el.getAttribute("data-fsm-state-row") === "1").at(-1)!;
const inc = panel.findAll((el) => el.tagName === "BUTTON" && el.getAttribute("aria-label") === "Increase scrX").at(-1)!;
const dec = panel.findAll((el) => el.tagName === "BUTTON" && el.getAttribute("aria-label") === "Decrease scrX").at(-1)!;
assert(inc && dec, "time trigger buttons exist");
const incListeners = inc.listeners.get("click")?.length ?? 0;
const initialEditor = panel.findById("ds-fsm-selected-state-editor");
assert.equal(triggerValue(panel), "700", "initial visible trigger value");
for (const expected of ["710", "720", "730", "740", "750"]) { (inc.listeners.get("click") ?? [])[0]?.({ stopPropagation(){}, preventDefault(){} }); assert.equal(triggerValue(panel), expected, `visible updates to ${expected}`); assert.equal(panel.findAll((el) => el.getAttribute("aria-label") === "Increase scrX").at(-1), inc, "increase button node is stable"); }
for (const expected of ["740", "730", "720", "710", "700", "690"]) { (dec.listeners.get("click") ?? [])[0]?.({ stopPropagation(){}, preventDefault(){} }); assert.equal(triggerValue(panel), expected, `visible decrements to ${expected}`); }
for (let i = 0; i < 80; i++) (dec.listeners.get("click") ?? [])[0]?.({ stopPropagation(){}, preventDefault(){} }); assert.equal(triggerValue(panel), "0", "visible remains clamped at min");
assert.equal(panel.findById("ds-fsm-dirty-badge")?.textContent, "DIRTY", "dirty badge is active");
clickButtonByText(panel, "SPAWN");
assert(emitted.length > 0, "spawn emits with current draft available");
assert.equal(panel.findById("ds-fsm-selected-state-editor"), initialEditor, "state editor remains open and stable");
assert.equal(inc.listeners.get("click")?.length ?? 0, incListeners, "trigger listener count is stable");
const spacing = panel.findById("ds-fsm-state-spacing")!; const spacingListeners = spacing.listeners.get("input")?.length ?? 0; spacing.value = "80"; spacing.dispatchEvent({type:"input"}); assert.equal(spacing.listeners.get("input")?.length ?? 0, spacingListeners, "existing live state slider remains stable");
console.log("FsmTriggerTimeLiveUpdate smoke passed");
