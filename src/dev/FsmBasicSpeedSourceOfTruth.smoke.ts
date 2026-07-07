import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { asFsmStateId, type FsmPresetSchemaV1 } from "../game/enemies/fsm";
import { EnemySystem } from "../game/systems/EnemySystem";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";
import { FsmPresetAuthoringModel } from "./FsmPresetAuthoringModel";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";
import { findLatestFsmRuntimeDiagnostics } from "./FsmRuntimeDiagnostics";

const DT = 1 / 60;
const LOGIC_W = 896;
const LOGIC_H = 504;

class FakeStyle { cssText = ""; [key: string]: any; setProperty(k: string, v: string) { this[k] = v; } }
class FakeElement {
  id = ""; textContent = ""; value = ""; type = ""; min = ""; max = ""; step = ""; rows = 0; readOnly = false; disabled = false; tabIndex = 0; style = new FakeStyle(); children: FakeElement[] = []; parentNode: FakeElement | null = null; attributes = new Map<string,string>(); listeners = new Map<string, Array<(ev?: any)=>void>>(); placeholder = "";
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(c:T):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; this.children.push(c); if (this.tagName === "SELECT" && !this.value && c.tagName === "OPTION") this.value = c.value; return c; }
  insertBefore<T extends FakeElement>(c:T,b:FakeElement|null):T{ if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode=this; const i=b?this.children.indexOf(b):-1; if(i>=0)this.children.splice(i,0,c); else this.children.push(c); return c; }
  replaceChildren(...cs:FakeElement[]){ for (const c of this.children) c.parentNode = null; this.children=[]; for(const c of cs)this.appendChild(c); }
  remove(){ if(this.parentNode)this.parentNode.children=this.parentNode.children.filter((x)=>x!==this); this.parentNode=null; }
  setAttribute(n:string,v:string){this.attributes.set(n,v);} getAttribute(n:string){return this.attributes.get(n)??null;}
  addEventListener(n:string,fn:(ev?:any)=>void){this.listeners.set(n,[...(this.listeners.get(n)??[]),fn]);} removeEventListener(){}
  click(){ if (this.disabled) return; for(const fn of this.listeners.get("click")??[]) fn({target:this, preventDefault(){}, stopPropagation(){}}); }
  dispatchEvent(ev:{type:string}){ for(const fn of this.listeners.get(ev.type)??[]) fn({...ev,target:this,preventDefault(){},stopPropagation(){}}); return true; }
  contains(node:FakeElement|null):boolean{ for(let c=node;c;c=c.parentNode) if(c===this)return true; return false; }
  getBoundingClientRect(){ return { left: 100, right: 300, top: 40, width: 200, height: 26 }; }
  querySelector(sel:string):FakeElement|null{ if(sel.startsWith("#"))return this.findById(sel.slice(1)); if(sel==='[role="listbox"]')return this.findAll((e)=>e.attributes.get("role")==="listbox")[0]??null; return null; }
  querySelectorAll(sel:string):FakeElement[]{ if(sel==="button,input,select,textarea")return this.findAll((e)=>["BUTTON","INPUT","SELECT","TEXTAREA"].includes(e.tagName)); if(sel==="button,input,select")return this.findAll((e)=>["BUTTON","INPUT","SELECT"].includes(e.tagName)); return []; }
  findById(id:string):FakeElement|null{ if(this.id===id)return this; for(const c of this.children){const f=c.findById(id); if(f)return f;} return null; }
  findAll(p:(e:FakeElement)=>boolean):FakeElement[]{ return [...(p(this)?[this]:[]),...this.children.flatMap((c)=>c.findAll(p))]; }
}

type Emitted = { type: keyof CMEventMap; payload: any };
function installDom(){ const body=new FakeElement("BODY"); const timers:any[]=[]; const doc={body, createElement:(t:string)=>new FakeElement(t.toUpperCase()), getElementById:(id:string)=>body.findById(id), addEventListener(){}, removeEventListener(){}}; (globalThis as any).document=doc; (globalThis as any).window={ innerWidth:1200, innerHeight:800, setInterval:(fn:any)=>{timers.push(fn); return timers.length;}, clearInterval(){}, addEventListener(){}, removeEventListener(){}, confirm:()=>true, __CM:{store:{debugForEachAlive:()=>{}}, enemyGroups:null, game:{loop:{tick:0}, spawn:{spawnPreviewEnemy:()=>null}}}}; return {doc}; }
function clickButtonByText(root: FakeElement, text: string) { const button = root.findAll((el) => el.tagName === "BUTTON" && el.textContent === text)[0]; assert(button, `button ${text} exists`); button.click(); return button; }
function chooseCompact(root: FakeElement, id: string, optionValue: string) { const selectRoot = root.findById(id); assert(selectRoot, `${id} exists`); const button = selectRoot.findAll((el) => el.tagName === "BUTTON")[0]; assert(button, `${id} button exists`); button.click(); const options = root.findAll((el) => el.tagName === "BUTTON" && (el.textContent ?? "").includes(optionValue)); const option = options[options.length - 1]; assert(option, `${optionValue} option exists`); option.click(); }
function slider(root: FakeElement) { const el = root.findById("ds-fsm-base-speed"); assert(el, "Basic Speed slider exists"); return el; }
function clickSpawn(root: FakeElement) { clickButtonByText(root, "SPAWN"); }
function latest<T extends keyof CMEventMap>(emitted: Emitted[], type: T) { const event = [...emitted].reverse().find((e) => e.type === type); assert(event, `event ${type} emitted`); return event as { type: T; payload: CMEventMap[T] & any }; }
function mount() { const {doc}=installDom(); const emitted: Emitted[]=[]; const world=createWorldState(); const summoner=new DevSummoner({emitNext:(type:keyof CMEventMap,payload:any)=>emitted.push({type,payload})} as any, world, LOGIC_W, LOGIC_H); summoner.init(); const panel=doc.getElementById(DEV_SUMMONER_PANEL_ID)!; assert(panel, "panel mounted"); clickButtonByText(panel, "FSM"); return { panel, emitted, world }; }
function userPreset(id: string, baseSpeed: number): FsmPresetSchemaV1 { return { schemaVersion: 1, metadata: { id, name: id, source: "user", schemaVersion: 1 }, basicSetup: { appearanceId: "red", count: 1, formationId: "line.horizontal", spacing: 18, elasticity: 0, followDelay: 0, baseSpeed, spawnY: 120 }, graph: { initialStateId: asFsmStateId("enter"), states: [{ id: asFsmStateId("enter"), label: "enter", movement: { base: { type: "movementPreset", params: { presetId: "straight.basic" } }, modifiers: [] }, targeting: { type: "forward" }, combat: { mode: "disabled" }, lifecycle: {}, transitions: [], speedMultiplier: 1 }] } }; }
function runtimeBaseSpeed(payload: any): number | null { const store = new EntityStore<any>(64); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: LOGIC_W, h: LOGIC_H }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, LOGIC_W, LOGIC_H, world, groups); spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload }] as any); enemy.update({ tick: 2, dt: DT } as any); return findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 1411, scrollX: world.scrollX }).primary?.baseSpeed ?? null; }

for (const baseSpeed of [0, 115, 320]) {
  const id = `fsm.user.u1411.source.${baseSpeed}`;
  CONTENT.userFsmPresets.delete(id);
  assert.equal(CONTENT.userFsmPresets.upsert(userPreset(id, baseSpeed)).ok, true, `upsert ${id}`);
  const editor = new FsmPresetEditorModel(CONTENT.userFsmPresets, id);
  const authoring = new FsmPresetAuthoringModel(CONTENT.userFsmPresets, id);
  assert.equal(editor.draft?.basicSetup.baseSpeed, baseSpeed, "editor draft uses canonical baseSpeed");
  assert.equal(authoring.draft?.preset.basicSetup?.baseSpeed, baseSpeed, "authoring draft uses canonical baseSpeed");

  const { panel, emitted } = mount();
  chooseCompact((globalThis as any).document.body, "ds-fsm-preset", id);
  assert.equal(Number(slider(panel).value), baseSpeed, "visible slider uses canonical baseSpeed");
  clickSpawn(panel);
  const event = latest(emitted, EventType.SPAWN_ENEMY);
  assert.equal(event.payload.resolvedFsmPresetOverride.definition.basicSetup.baseSpeed, baseSpeed, "SPAWN override uses slider/editor/authoring baseSpeed");
  assert.equal(runtimeBaseSpeed({ ...event.payload, devManualSpawnId: 1411 }), baseSpeed, "runtime diagnostics baseSpeed matches slider");
  CONTENT.userFsmPresets.delete(id);
}

console.log("FsmBasicSpeedSourceOfTruth smoke passed");
