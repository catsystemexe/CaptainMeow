import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { EnemySystem } from "../game/systems/EnemySystem";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { DevSummoner, DEV_SUMMONER_PANEL_ID, mapUiSpawnYToRuntimeY } from "./DevSummoner";

const DT = 1 / 60;
const LOGIC_W = 896;
const LOGIC_H = 504;

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
  contains(node:FakeElement|null):boolean{ for(let c=node;c;c=c.parentNode) if(c===this)return true; return false; }
  getBoundingClientRect(){ return { left: 100, right: 300, top: 40, width: 200, height: 26 }; }
  querySelector(sel:string):FakeElement|null{ if(sel.startsWith("#"))return this.findById(sel.slice(1)); if(sel==='[role="listbox"]')return this.findAll((e)=>e.attributes.get("role")==="listbox")[0]??null; return null; }
  querySelectorAll(sel:string):FakeElement[]{ if(sel==="button,input,select,textarea")return this.findAll((e)=>["BUTTON","INPUT","SELECT","TEXTAREA"].includes(e.tagName)); if(sel==="button,input,select")return this.findAll((e)=>["BUTTON","INPUT","SELECT"].includes(e.tagName)); return []; }
  findById(id:string):FakeElement|null{ if(this.id===id)return this; for(const c of this.children){const f=c.findById(id); if(f)return f;} return null; }
  findAll(p:(e:FakeElement)=>boolean):FakeElement[]{ return [...(p(this)?[this]:[]),...this.children.flatMap((c)=>c.findAll(p))]; }
}

type Emitted = { type: keyof CMEventMap; payload: any };
function installDom(){ const body=new FakeElement("BODY"); const timers:any[]=[]; const doc={body, createElement:(t:string)=>new FakeElement(t.toUpperCase()), getElementById:(id:string)=>body.findById(id), addEventListener(){}, removeEventListener(){}}; (globalThis as any).document=doc; (globalThis as any).window={ innerWidth:1200, innerHeight:800, setInterval:(fn:any)=>{timers.push(fn); return timers.length;}, clearInterval(){}, addEventListener(){}, removeEventListener(){}, confirm:()=>true, __CM:{store:{debugForEachAlive:()=>{}}, enemyGroups:null, game:{loop:{tick:0}, spawn:{spawnPreviewEnemy:()=>null}}}}; return {doc,timers}; }
function clickButtonByText(root: FakeElement, text: string) { const button = root.findAll((el) => el.tagName === "BUTTON" && el.textContent === text)[0]; assert(button, `button ${text} exists`); button.click(); return button; }
function setRange(root: FakeElement, id: string, value: number) { const el = root.findById(id); assert(el, `${id} exists`); el.value = String(value); el.dispatchEvent({ type: "input" }); assert.equal(el.value, String(value), `${id} displays ${value}`); return el; }
function countControl(panel: FakeElement) { const count = panel.findById("ds-group-count")!; const buttons = count.findAll((el) => el.tagName === "BUTTON"); return { count, dec: buttons[0], inc: buttons[1] }; }
function setCount(panel: FakeElement, value: number) { const c = countControl(panel); while (Number(c.count.getAttribute("aria-valuenow")) < value) c.inc.click(); while (Number(c.count.getAttribute("aria-valuenow")) > value) c.dec.click(); assert.equal(c.count.getAttribute("aria-valuenow"), String(value)); }
function selectStateMovement(panel: FakeElement, presetId: string) { const matches = panel.findAll((el) => el.tagName === "SELECT" && el.children.some((c) => c.value === presetId)); const select = matches[matches.length - 1]; assert(select, "state movement select exists"); select.value = presetId; select.dispatchEvent({ type: "change" }); }
function clickFormation(panel: FakeElement, label: string) { const b = panel.findAll((el) => el.tagName === "BUTTON" && el.getAttribute("aria-label") === label)[0]; assert(b, `${label} button exists`); b.click(); }
function latest<T extends keyof CMEventMap>(emitted: Emitted[], type: T) { const event = [...emitted].reverse().find((e) => e.type === type); assert(event, `event ${type} emitted`); return event as { type: T; payload: CMEventMap[T] & any }; }
function mount() { const {doc}=installDom(); const emitted: Emitted[]=[]; const world=createWorldState(); const summoner=new DevSummoner({emitNext:(type:keyof CMEventMap,payload:any)=>emitted.push({type,payload})} as any, world, LOGIC_W, LOGIC_H); summoner.init(); const panel=doc.getElementById(DEV_SUMMONER_PANEL_ID)!; assert(panel, "panel mounted"); clickButtonByText(panel, "FSM"); const newPresetButton = panel.findById("ds-fsm-preset-toolbar")!.findAll((el) => el.tagName === "BUTTON" && el.textContent === "+")[0]; assert(newPresetButton, "new preset toolbar button exists"); newPresetButton.click(); return {panel, emitted, world}; }
function runtimeSingle(payload: any) { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: LOGIC_W, h: LOGIC_H }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, LOGIC_W, LOGIC_H, world, groups); spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload }] as any); const ent = ((store as any).entities as any[]).find((e) => e?.alive && e.kind === "enemy"); const x0 = ent.pos.x, y0 = ent.pos.y; enemy.update({ tick: 2, dt: DT } as any); return Math.hypot(ent.pos.x - x0, ent.pos.y - y0) / DT; }
function runtimeGroup(payload: any) { const store = new EntityStore<any>(128); const groups = new EnemyGroupRegistry(); const world = createWorldState(); const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: LOGIC_W, h: LOGIC_H }, weaponDb: WEAPONS_MVP as any }, world, groups); const enemy = new EnemySystem(store, LOGIC_W, LOGIC_H, world, groups); spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload }] as any); const group = groups.get(1) as any; assert(group, "group created"); const x0 = group.anchor.x, y0 = group.anchor.y; enemy.update({ tick: 2, dt: DT } as any); return { distance: Math.hypot(group.anchor.x - x0, group.anchor.y - y0) / DT, group }; }
function close(actual: number, expected: number, eps = 1.5) { assert(Math.abs(actual - expected) <= eps, `${actual} ~= ${expected}`); }

const { panel, emitted } = mount();
const userId = (panel.findById("ds-fsm-preset")!.findAll((el) => el.tagName === "BUTTON")[0].textContent || "").trim();
const savedBefore = structuredClone(CONTENT.userFsmPresets.get(userId)?.basicSetup);
selectStateMovement(panel, "straight.drift");

setCount(panel, 1);
setRange(panel, "ds-fsm-base-speed", 150);
assert.equal(panel.findById("ds-fsm-dirty-badge")?.textContent, "DIRTY", "Basic Speed marks authoring draft dirty");
clickButtonByText(panel, "SPAWN");
const single150 = latest(emitted, EventType.SPAWN_ENEMY);
assert.equal(single150.payload.resolvedFsmPresetOverride.definition.basicSetup.baseSpeed, 150, "single override gets displayed Basic Speed");
assert.equal(single150.payload.resolvedFsmPresetOverride.states[0].movement.base.params.presetId, "straight.drift", "override uses DOM-selected straight movement");
close(runtimeSingle(single150.payload), 150);
setRange(panel, "ds-fsm-base-speed", 60); clickButtonByText(panel, "SPAWN"); close(runtimeSingle(latest(emitted, EventType.SPAWN_ENEMY).payload), 60);

setCount(panel, 3);
setRange(panel, "ds-fsm-base-speed", 200);
clickButtonByText(panel, "SPAWN");
const group200 = latest(emitted, EventType.SPAWN_ENEMY_GROUP);
assert.equal(group200.payload.count, 3, "Count = 3 emits group payload count 3");
assert.equal(group200.payload.resolvedFsmPresetOverride.definition.basicSetup.baseSpeed, 200, "group override gets displayed Basic Speed");
const groupResult = runtimeGroup(group200.payload);
close(groupResult.distance, 200);
assert.equal(groupResult.group.members.length, 3, "runtime group keeps three members");

setCount(panel, 1);
setRange(panel, "ds-fsm-base-speed", 100);
setRange(panel, "ds-fsm-state-speed", 0.5);
clickButtonByText(panel, "SPAWN");
const singleHalf = latest(emitted, EventType.SPAWN_ENEMY);
assert.equal(singleHalf.payload.resolvedFsmPresetOverride.states[0].speedMultiplier, 0.5, "single override carries state Speed × 0.5");
close(runtimeSingle(singleHalf.payload), 50);
setRange(panel, "ds-fsm-state-speed", 2);
clickButtonByText(panel, "SPAWN");
const singleDouble = latest(emitted, EventType.SPAWN_ENEMY);
assert.equal(singleDouble.payload.resolvedFsmPresetOverride.states[0].speedMultiplier, 2, "single override carries state Speed × 2");
close(runtimeSingle(singleDouble.payload), 200);
setCount(panel, 3);
clickButtonByText(panel, "SPAWN");
const groupDouble = latest(emitted, EventType.SPAWN_ENEMY_GROUP);
assert.equal(groupDouble.payload.resolvedFsmPresetOverride.states[0].speedMultiplier, 2, "group override carries state Speed × 2");
close(runtimeGroup(groupDouble.payload).distance, 200);

clickFormation(panel, "Ring formation");
setRange(panel, "ds-fsm-spacing", 44);
setRange(panel, "ds-fsm-elasticity", 6);
setRange(panel, "ds-screen-y", 123);
clickButtonByText(panel, "SPAWN");
const synced = latest(emitted, EventType.SPAWN_ENEMY_GROUP);
const setup = synced.payload.resolvedFsmPresetOverride.definition.basicSetup;
assert.equal(setup.formationId, "ring", "authoring override syncs Basic Setup formation");
assert.equal(setup.spacing, 44, "authoring override syncs Basic Setup spacing");
assert.equal(setup.elasticity, 6, "authoring override syncs Basic Setup elasticity");
assert.equal(setup.spawnY, 123, "authoring override syncs Basic Setup spawnY");
assert.equal(synced.payload.formationId, "ring", "group payload keeps selected formation ownership");
assert.equal(synced.payload.params.formation.spacing, 44, "group payload keeps selected spacing ownership");
assert.equal(synced.payload.anchor.y, mapUiSpawnYToRuntimeY(123, LOGIC_H), "spawnY maps to runtime anchor Y");
assert.deepEqual(CONTENT.userFsmPresets.get(userId)?.basicSetup, savedBefore, "saved preset storage remains unchanged until Save");

// U1.4.9 Follow UI/order, draft spawn, and persistence assertions.
const basicOrder = ["ds-fsm-elasticity", "ds-fsm-follow", "ds-fsm-base-speed"].map((id) => panel.findById(id)!);
assert(basicOrder.every(Boolean), "Basic Setup Elasticity/Follow/Speed controls exist");
assert(basicOrder[0].parentNode?.parentNode === basicOrder[1].parentNode?.parentNode && basicOrder[1].parentNode?.parentNode === basicOrder[2].parentNode?.parentNode, "Basic Follow sits in the Basic Setup slider group");
const basicChildren = basicOrder[0].parentNode!.parentNode!.children;
assert(basicChildren.indexOf(basicOrder[0].parentNode!) < basicChildren.indexOf(basicOrder[1].parentNode!), "Basic Follow appears after Elasticity");
assert(basicChildren.indexOf(basicOrder[1].parentNode!) < basicChildren.indexOf(basicOrder[2].parentNode!), "Basic Follow appears before Speed");
const stateOrder = ["ds-fsm-state-elasticity", "ds-fsm-state-follow", "ds-fsm-state-speed"].map((id) => panel.findById(id)!);
assert(stateOrder.every(Boolean), "State Elasticity/Follow/Speed controls exist");
const stateChildren = stateOrder[0].parentNode!.parentNode!.children;
assert(stateChildren.indexOf(stateOrder[0].parentNode!) < stateChildren.indexOf(stateOrder[1].parentNode!), "State Follow appears after Elasticity");
assert(stateChildren.indexOf(stateOrder[1].parentNode!) < stateChildren.indexOf(stateOrder[2].parentNode!), "State Follow appears before Speed ×");
assert.equal(panel.findById("ds-fsm-follow")!.min, "0");
assert.equal(panel.findById("ds-fsm-follow")!.max, "0.5");
assert.equal(panel.findById("ds-fsm-follow")!.step, "0.01");
assert.equal(panel.findById("ds-fsm-state-follow")!.min, "0");
assert.equal(panel.findById("ds-fsm-state-follow")!.max, "0.5");
assert.equal(panel.findById("ds-fsm-state-follow")!.step, "0.01");
setRange(panel, "ds-fsm-follow", 0.1);
setRange(panel, "ds-fsm-state-follow", 0.2);
setCount(panel, 3);
clickButtonByText(panel, "SPAWN");
const followGroup = latest(emitted, EventType.SPAWN_ENEMY_GROUP);
assert.equal(followGroup.payload.resolvedFsmPresetOverride.definition.basicSetup.followDelay, 0.1, "draft SPAWN carries Basic Follow without Save");
assert.equal(followGroup.payload.resolvedFsmPresetOverride.states[0].followDelay, 0.2, "draft SPAWN carries state Follow without Save");
assert.equal(runtimeGroup(followGroup.payload).group.followDelay, 0.2, "runtime group receives state Follow");
for (const b of panel.findAll((el) => el.tagName === "BUTTON" && (el.textContent === "Save" || el.getAttribute("aria-label") === "Save selected FSM preset"))) { b.disabled = false; b.click(); }
const savedFollowPresetId = followGroup.payload.resolvedFsmPresetOverride.definition.metadata.id;
assert.equal(CONTENT.userFsmPresets.get(savedFollowPresetId)?.basicSetup?.followDelay, 0.1, "Save persists Basic Follow");
assert.equal((CONTENT.userFsmPresets.get(savedFollowPresetId)?.graph.states[0] as any).followDelay, 0.2, "Save persists state Follow");
const legacy = structuredClone(CONTENT.userFsmPresets.get(savedFollowPresetId)!);
delete (legacy.basicSetup as any).followDelay;
delete (legacy.graph.states[0] as any).followDelay;
CONTENT.userFsmPresets.upsert({ ...legacy, metadata: { ...legacy.metadata, id: `${savedFollowPresetId}.legacy`, name: "Legacy Follow" } } as any);
const legacySaved = CONTENT.userFsmPresets.get(`${savedFollowPresetId}.legacy`)!;
assert.equal((legacySaved.basicSetup as any).followDelay, undefined, "legacy storage is not mutated merely by loading");
CONTENT.userFsmPresets.delete(`${savedFollowPresetId}.legacy`);
CONTENT.userFsmPresets.delete(userId);
console.log("FsmGroupFollowUiAndPersistence smoke passed");
