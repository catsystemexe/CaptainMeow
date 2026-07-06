import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { EnemySystem } from "../game/systems/EnemySystem";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";

const DT = 1 / 60;
class FakeStyle { cssText = ""; [key: string]: any; setProperty(k: string, v: string) { this[k] = v; } }
class FakeElement { id = ""; textContent = ""; value = ""; type = ""; min = ""; max = ""; step = ""; rows = 0; readOnly = false; disabled = false; tabIndex = 0; style = new FakeStyle(); children: FakeElement[] = []; parentNode: FakeElement | null = null; attributes = new Map<string,string>(); listeners = new Map<string, Array<(ev?: any)=>void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(c:T):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; this.children.push(c); return c; }
  insertBefore<T extends FakeElement>(c:T,b:FakeElement|null):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; const i=b?this.children.indexOf(b):-1; if(i>=0)this.children.splice(i,0,c); else this.children.push(c); return c; }
  replaceChildren(...cs:FakeElement[]){ this.children=[]; for(const c of cs)this.appendChild(c); }
  remove(){ if(this.parentNode)this.parentNode.children=this.parentNode.children.filter((x)=>x!==this); this.parentNode=null; }
  setAttribute(n:string,v:string){this.attributes.set(n,v);} getAttribute(n:string){return this.attributes.get(n)??null;}
  addEventListener(n:string,fn:(ev?:any)=>void){this.listeners.set(n,[...(this.listeners.get(n)??[]),fn]);} removeEventListener(){}
  click(){ for(const fn of this.listeners.get("click")??[]) fn({target:this, preventDefault(){}, stopPropagation(){}}); }
  dispatchEvent(ev:{type:string}){ for(const fn of this.listeners.get(ev.type)??[]) fn({...ev,target:this,preventDefault(){},stopPropagation(){}}); return true; }
  contains(node:FakeElement|null):boolean{ for(let c=node;c;c=c.parentNode) if(c===this)return true; return false; }
  getBoundingClientRect(){ return { left: 100, right: 300, top: 40, width: 200, height: 26 }; }
  querySelector(sel:string):FakeElement|null{ if(sel.startsWith("#"))return this.findById(sel.slice(1)); if(sel==='[role="listbox"]')return this.findAll((e)=>e.attributes.get("role")==="listbox")[0]??null; return null; }
  querySelectorAll(sel:string):FakeElement[]{ if(sel==="button,input,select,textarea")return this.findAll((e)=>["BUTTON","INPUT","SELECT","TEXTAREA"].includes(e.tagName)); if(sel==="button,input,select")return this.findAll((e)=>["BUTTON","INPUT","SELECT"].includes(e.tagName)); return []; }
  findById(id:string):FakeElement|null{ if(this.id===id)return this; for(const c of this.children){const f=c.findById(id); if(f)return f;} return null; }
  findAll(p:(e:FakeElement)=>boolean):FakeElement[]{ return [...(p(this)?[this]:[]),...this.children.flatMap((c)=>c.findAll(p))]; }
}
function installDom(store:any, groups:any, world:any){ const body=new FakeElement("BODY"); const timers:any[]=[]; const doc={body, createElement:(t:string)=>new FakeElement(t.toUpperCase()), getElementById:(id:string)=>body.findById(id), addEventListener(){}, removeEventListener(){}}; (globalThis as any).document=doc; (globalThis as any).window={ innerWidth:1200, innerHeight:800, setInterval:(fn:any)=>{timers.push(fn); fn(); return timers.length;}, clearInterval(){}, addEventListener(){}, removeEventListener(){}, confirm:()=>true, __CM:{store, enemyGroups:groups, game:{loop:{tick:0}, spawn:{spawnPreviewEnemy:()=>null}}}}; return {doc, timers}; }
function harness(){ const store=new EntityStore<any>(128); const groups=new EnemyGroupRegistry(); const world=createWorldState(); const spawn=new SpawnSystem(store,{rng01:()=>0.5,logicSize:{w:896,h:504},weaponDb:WEAPONS_MVP as any},world,groups); const enemy=new EnemySystem(store,896,504,world,groups); return {store,groups,world,spawn,enemy}; }

const h=harness();
h.spawn.update({tick:1,dt:DT} as any,[{type:EventType.SPAWN_ENEMY,payload:{typeId:"red",spawn:{x:856,y:244},fsmPresetId:"fsm.charge",devManualSpawnId:77}}] as any); h.enemy.update({tick:2,dt:DT} as any);
const {doc,timers}=installDom(h.store,h.groups,h.world); const emitted:{type:keyof CMEventMap,payload:any}[]=[]; const summoner=new DevSummoner({emitNext:(type:keyof CMEventMap,payload:any)=>emitted.push({type,payload})} as any,h.world,896,504); (summoner as any).latestManualSpawnId=77; summoner.init();
const panel=doc.getElementById(DEV_SUMMONER_PANEL_ID)!; assert(panel,"panel mounted");
const presetRoot=doc.getElementById("ds-fsm-preset")!; const presetButton=presetRoot.findAll((e)=>e.tagName==="BUTTON")[0]; assert(presetButton,"current preset control exists");
presetButton.click();
let listboxes=doc.body.findAll((e)=>e.attributes.get("role")==="listbox" && e.style.display==="block"); assert.equal(listboxes.length,1,"first click opens exactly one visible preset popover"); assert(listboxes[0].findAll((e)=>e.tagName==="BUTTON").length>1,"preset rows populated without +");
listboxes[0].findAll((e)=>e.tagName==="BUTTON" && !e.disabled)[1].click(); assert.notEqual(presetButton.textContent,"(movement preset)","selection loads into current preset control");
presetButton.click(); assert.equal(doc.body.findAll((e)=>e.attributes.get("role")==="listbox" && e.style.display==="block").length,1,"close/reopen works");
presetButton.click(); presetButton.click(); assert.equal(doc.body.findAll((e)=>e.attributes.get("role")==="listbox" && e.style.display==="block").length,1,"first click after rerender/reopen still works without duplicate popovers");
const toggle=doc.body.findAll((e)=>e.tagName==="BUTTON" && e.attributes.get("aria-label")==="Toggle Runtime Diagnostics")[0]; assert(toggle,"diagnostics toggle exists"); toggle.click(); for(const fn of timers) fn();
const diag=doc.getElementById("ds-fsm-runtime-diagnostics")!; const body=doc.getElementById("ds-fsm-runtime-diagnostics-body")!; assert.equal(doc.body.findAll((e)=>e.id==="ds-fsm-runtime-diagnostics").length,1,"one diagnostics root"); assert.equal(doc.body.findAll((e)=>e.id==="ds-fsm-runtime-diagnostics-body").length,1,"one diagnostics content node"); assert.equal(diag.style.display,"flex","diagnostics visible"); assert(body.textContent.includes("Preset:"),"diagnostics content populated"); assert(body.textContent.includes("baseSpeed:"),"speed fields visible");
h.spawn.update({tick:3,dt:DT} as any,[{type:EventType.SPAWN_ENEMY_GROUP,payload:{enemyTypeId:"red",count:2,anchor:{x:856,y:244},formationId:"line.horizontal",movementPresetId:"none.hold",cohesionId:"rigid",fsmPresetId:"fsm.charge",devManualSpawnId:88,params:{formation:{spacing:18},cohesion:{maxCatchupSpeed:600}}}}] as any); h.enemy.update({tick:4,dt:DT} as any); (summoner as any).latestManualSpawnId=88; for(const fn of timers) fn(); assert(body.textContent.includes("GROUP ANCHOR"),"group anchor diagnostics visible"); assert(body.textContent.includes("MEMBER"),"member diagnostics visible"); assert.equal(timers.length,1,"exactly one refresh loop");
console.log("EnemyLabInitialPresetAndDiagnosticsContent smoke passed");
