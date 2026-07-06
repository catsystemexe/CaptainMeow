import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { EnemySystem } from "../game/systems/EnemySystem";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";
import { findLatestFsmRuntimeDiagnostics, renderFsmRuntimeDiagnosticsText } from "./FsmRuntimeDiagnostics";

const DT = 1 / 60;
function harness(scrollX = 0) {
  const store = new EntityStore<any>(128);
  const groups = new EnemyGroupRegistry();
  const world = createWorldState();
  (world as any).scrollX = scrollX;
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, world, groups);
  const enemy = new EnemySystem(store, 896, 504, world, groups);
  return { store, groups, world, spawn, enemy };
}
function update(enemy: EnemySystem, ticks: number) { for (let i = 0; i < ticks; i++) enemy.update({ tick: i + 1, dt: DT } as any); }
function spawnSingle(spawn: SpawnSystem, id: string, token = 101) { spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY, payload: { typeId: "red", spawn: { x: 856, y: 244 }, fsmPresetId: id, devManualSpawnId: token } }] as any); }
function spawnGroup(spawn: SpawnSystem, id: string, count = 2, token = 202) { spawn.update({ tick: 1, dt: DT } as any, [{ type: EventType.SPAWN_ENEMY_GROUP, payload: { enemyTypeId: "red", count, anchor: { x: 856, y: 244 }, formationId: "line.horizontal", movementPresetId: "none.hold", cohesionId: "rigid", fsmPresetId: id, devManualSpawnId: token, params: { formation: { spacing: 18 }, cohesion: { maxCatchupSpeed: 600 } } } }] as any); }

{
  const { store, groups, spawn } = harness(37);
  spawnSingle(spawn, "fsm.charge", 11);
  const bundle = findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 11, scrollX: 37 });
  const s = bundle.primary!;
  assert.equal(s.kind, "single");
  assert.equal(s.authoritative, true);
  assert.equal(s.presetId, "fsm.charge");
  assert.equal(s.stateId, "enter");
  assert.equal(s.movementPresetId, "straight.drift");
  assert.equal(s.scrollX, 37);
  assert.equal(s.screenX, (s.worldX ?? 0) - 37);
  assert.equal(s.movementSuppressed, false);
}

{
  const { store, groups, spawn } = harness(41);
  spawnGroup(spawn, "fsm.charge", 2, 22);
  const bundle = findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 22, scrollX: 41 });
  const g = bundle.primary!;
  assert.equal(g.kind, "group-anchor");
  assert.equal(g.authoritative, true);
  assert.equal(g.presetId, "fsm.charge");
  assert.equal(g.stateId, "enter");
  assert.equal(g.movementPresetId, "straight.drift");
  assert.equal(g.memberCount, 2);
  assert.equal(g.scrollX, 41, "group anchor reports actual world scrollX context before the first anchor tick");
  assert.equal(g.screenX, (g.worldX ?? 0) - 41);
  const m = bundle.member!;
  assert.equal(m.kind, "group-member");
  assert.equal(m.authoritative, false);
  assert.equal(m.movementSuppressed, true);
  assert.equal(m.presetId, "fsm.charge");
}

{
  const { store, groups, spawn, enemy } = harness();
  spawnGroup(spawn, "fsm.charge", 2, 33);
  update(enemy, 112);
  const g = findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 33, scrollX: 0 }).primary!;
  assert.equal(g.stateId, "charge");
  assert.equal(g.movementPresetId, "straight.charge");
  assert.deepEqual(g.lastTransition, { from: "enter", to: "charge", reason: "screenXBelow" });
}

{
  const { store, groups, spawn, enemy } = harness();
  spawnGroup(spawn, "fsm.hover", 3, 44);
  update(enemy, 70);
  const g = findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 44, scrollX: 0 }).primary!;
  assert.equal(g.stateId, "hover");
  assert.equal(g.movementPresetId, "none.hold", "Hover transition exposes selected graph hold behavior, not fallback");
  assert.deepEqual(g.lastTransition, { from: "enter", to: "hover", reason: "screenXBelow" });
}

{
  const empty = harness();
  const bundle = findLatestFsmRuntimeDiagnostics({ store: empty.store, groups: empty.groups, latestManualSpawnId: 55, scrollX: 0 });
  assert.equal(bundle.primary, null);
  assert(renderFsmRuntimeDiagnosticsText(bundle).includes("No FSM runtime spawned"));
}

class FakeStyle { cssText = ""; [key: string]: unknown; setProperty(key: string, value: string) { this[key] = value; } }
class FakeElement {
  id = ""; textContent = ""; value = ""; type = ""; min = ""; max = ""; step = ""; rows = 0; readOnly = false; disabled = false; tabIndex = 0; style = new FakeStyle(); children: FakeElement[] = []; parentNode: FakeElement | null = null; attributes = new Map<string, string>(); listeners = new Map<string, Array<(ev?: any) => void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(child: T): T { child.parentNode = this; this.children.push(child); return child; }
  insertBefore<T extends FakeElement>(child: T, before: FakeElement | null): T { child.parentNode = this; const i = before ? this.children.indexOf(before) : -1; if (i >= 0) this.children.splice(i, 0, child); else this.children.push(child); return child; }
  replaceChildren(...children: FakeElement[]) { this.children = []; for (const child of children) this.appendChild(child); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener(name: string, fn: (ev?: any) => void) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.get("click") ?? []) fn({ target: this, preventDefault: () => {} }); }
  dispatchEvent(ev: { type: string }) { for (const fn of this.listeners.get(ev.type) ?? []) fn(ev); return true; }
  contains(node: FakeElement | null): boolean { for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true; return false; }
  querySelector(selector: string): FakeElement | null { return selector.startsWith("#") ? this.findById(selector.slice(1)) : null; }
  querySelectorAll(selector: string): FakeElement[] { if (selector === "button,input,select,textarea") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)); if (selector === "button,input,select") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT"].includes(el.tagName)); return []; }
  findById(id: string): FakeElement | null { if (this.id === id) return this; for (const child of this.children) { const found = child.findById(id); if (found) return found; } return null; }
  findAll(predicate: (el: FakeElement) => boolean): FakeElement[] { return [...(predicate(this) ? [this] : []), ...this.children.flatMap((child) => child.findAll(predicate))]; }
}
function installDom(store: any, groups: any) {
  const body = new FakeElement("BODY");
  const documentStub = { body, createElement: (tag: string) => new FakeElement(tag.toUpperCase()), getElementById: (id: string) => body.findById(id), addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).document = documentStub;
  (globalThis as any).window = { setInterval: (fn: any) => { fn(); return 1; }, clearInterval: () => {}, confirm: () => true, __CM: { store, enemyGroups: groups, game: { loop: { tick: 0 }, spawn: { spawnPreviewEnemy: () => null } } } };
  return documentStub;
}
{
  const { store, groups, spawn } = harness();
  spawnSingle(spawn, "fsm.charge", 66);
  const emitted: { type: keyof CMEventMap; payload: any }[] = [];
  const doc = installDom(store, groups);
  const summoner = new DevSummoner({ emitNext: (type: keyof CMEventMap, payload: any) => emitted.push({ type, payload }) } as any, createWorldState(), 896, 504);
  (summoner as any).latestManualSpawnId = 66;
  summoner.init();
  const panel = doc.getElementById(DEV_SUMMONER_PANEL_ID)!;
  assert.equal(panel.findById("ds-fsm-runtime-diagnostics"), null, "diagnostics panel is hidden from normal FSM layout");
  assert.equal(panel.findAll((el) => el.id === "ds-fsm-runtime-diagnostics").length, 0, "no duplicate diagnostics panels");
  const singleRendered = renderFsmRuntimeDiagnosticsText(findLatestFsmRuntimeDiagnostics({ store, groups, latestManualSpawnId: 66, scrollX: 0 }));
  assert(singleRendered.includes("Diagnostics version: A1.1"));
  assert(singleRendered.includes("SINGLE — AUTHORITATIVE"));
  const groupBundle = { version: "A1.1" as const, primary: { kind: "group-anchor" as const, authoritative: true, presetId: "fsm.charge", stateId: "enter", movementPresetId: "straight.drift", worldX: 856, worldY: 244, scrollX: 41, screenX: 815, velocityX: -115, velocityY: 0, stateAge: 0.4, lastTransition: null, movementSuppressed: false, memberCount: 2 }, member: { kind: "group-member" as const, authoritative: false, presetId: "fsm.charge", stateId: "enter", movementPresetId: "straight.drift", worldX: 865, worldY: 244, scrollX: 41, screenX: 824, velocityX: -115, velocityY: 0, stateAge: 0.4, lastTransition: null, movementSuppressed: true } };
  const rendered = renderFsmRuntimeDiagnosticsText(groupBundle);
  assert(rendered.includes("GROUP ANCHOR — AUTHORITATIVE"));
  assert(rendered.includes("MEMBER — NON-AUTHORITATIVE MOVEMENT"));
}

console.log("FsmRuntimeDiagnostics smoke passed");
