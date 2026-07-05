import assert from "node:assert/strict";
import { EventType, type CMEventMap } from "../engine/core/events";
import { EntityStore } from "../engine/ecs/EntityStore";
import { CONTENT } from "../game/content/CONTENT";
import { createWorldState } from "../game/data/WorldState";
import { WEAPONS_MVP } from "../game/defs/Weapons";
import { EnemyGroupRegistry } from "../game/enemies/EnemyGroups";
import { getFsmDebugSnapshot } from "../game/enemies/fsm";
import { SpawnSystem } from "../game/systems/SpawnSystem";
import { DevSummoner, DEV_SUMMONER_PANEL_ID } from "./DevSummoner";
import { FsmPresetEditorModel } from "./FsmPresetEditorModel";

class FakeStyle {
  cssText = "";
  [key: string]: unknown;
  setProperty(key: string, value: string) { this[key] = value; this.cssText += `${key}:${value};`; }
}

class FakeElement {
  id = "";
  textContent = "";
  value = "";
  type = "";
  min = "";
  max = "";
  step = "";
  rows = 0;
  readOnly = false;
  disabled = false;
  tabIndex = 0;
  style = new FakeStyle();
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<(ev?: any) => void>>();
  constructor(readonly tagName: string) {}
  appendChild<T extends FakeElement>(child: T): T {
    child.parentNode = this;
    this.children.push(child);
    if (this.tagName === "SELECT" && !this.value && child.tagName === "OPTION") this.value = child.value;
    return child;
  }
  replaceChildren(...children: FakeElement[]) { for (const child of this.children) child.parentNode = null; this.children = []; for (const child of children) this.appendChild(child); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener(name: string, fn: (ev?: any) => void) { this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.get("click") ?? []) fn({ target: this, preventDefault: () => {}, key: "" }); }
  dispatchEvent(ev: { type: string }) { for (const fn of this.listeners.get(ev.type) ?? []) fn(ev); return true; }
  contains(node: FakeElement | null): boolean { for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true; return false; }
  get isConnected(): boolean { let node: FakeElement | null = this; while (node) { if (node.tagName === "BODY") return true; node = node.parentNode; } return false; }
  getBoundingClientRect() { return { left: 580, top: 8, right: 800, bottom: 592, width: 220, height: 584, x: 580, y: 8, toJSON: () => ({}) }; }
  querySelector(selector: string): FakeElement | null { if (selector.startsWith("#")) return this.findById(selector.slice(1)); return null; }
  querySelectorAll(selector: string): FakeElement[] { if (selector === "button,input,select") return this.findAll((el) => ["BUTTON", "INPUT", "SELECT"].includes(el.tagName)); return []; }
  findById(id: string): FakeElement | null { if (this.id === id) return this; for (const child of this.children) { const found = child.findById(id); if (found) return found; } return null; }
  findAll(predicate: (el: FakeElement) => boolean): FakeElement[] { return [...(predicate(this) ? [this] : []), ...this.children.flatMap((child) => child.findAll(predicate))]; }
}

type Emitted = { type: keyof CMEventMap; payload: any };

function installDom() {
  const body = new FakeElement("BODY");
  const documentStub = {
    body,
    createElement: (tag: string) => new FakeElement(tag.toUpperCase()),
    getElementById: (id: string) => body.findById(id),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).document = documentStub;
  (globalThis as any).window = { setInterval: () => 1, clearInterval: () => {}, confirm: () => true, __CM: { store: { debugForEachAlive: () => {} } } };
  return { body, documentStub };
}

function clickButtonByText(root: FakeElement, text: string) {
  const button = root.findAll((el) => el.tagName === "BUTTON" && el.textContent === text)[0];
  assert(button, `button ${text} exists`);
  button.click();
}

function chooseCompact(root: FakeElement, id: string, value: string) {
  const selectRoot = root.findById(id);
  assert(selectRoot, `${id} compact select exists`);
  const button = selectRoot.findAll((el) => el.tagName === "BUTTON")[0];
  assert(button, `${id} button exists`);
  button.click();
  const option = selectRoot.findAll((el) => el.tagName === "BUTTON" && el.textContent.includes(value))[0];
  assert(option, `${id} option ${value} exists`);
  option.click();
}

function mountAndSpawnGroup(input: { enemyTypeId: string; fsmPresetId?: string }) {
  const { documentStub } = installDom();
  const emitted: Emitted[] = [];
  const summoner = new DevSummoner({ emitNext: (type: keyof CMEventMap, payload: any) => emitted.push({ type, payload }) } as any, createWorldState(), 896, 504);
  summoner.init();
  const panel = documentStub.getElementById(DEV_SUMMONER_PANEL_ID)! as FakeElement;
  assert(panel, "DevSummoner panel mounted");

  clickButtonByText(panel, "FSM");
  assert.notEqual(panel.findById("ds-fsm-preset")?.parentNode?.style.display, "none", "FSM selector remains visible in FSM presets block");
  chooseCompact(panel, "ds-fsm-preset", input.fsmPresetId ?? "(movement preset)");
  const groupType = panel.findById("ds-enemy")!;
  groupType.value = input.enemyTypeId;
  const count = panel.findById("ds-group-count")!;
  const countButtons = count.findAll((el) => el.tagName === "BUTTON");
  while (count.getAttribute("aria-valuenow") !== "3") {
    const now = Number(count.getAttribute("aria-valuenow"));
    countButtons[now > 3 ? 0 : 1].click();
  }
  clickButtonByText(panel, "SPAWN");

  assert.equal(emitted.length, 1, "actual group Spawn button emits one event");
  assert.equal(emitted[0].type, EventType.SPAWN_ENEMY_GROUP, "actual group Spawn button emits SPAWN_ENEMY_GROUP");
  return emitted[0].payload as CMEventMap[typeof EventType.SPAWN_ENEMY_GROUP];
}

function runThroughSpawnSystem(payload: CMEventMap[typeof EventType.SPAWN_ENEMY_GROUP]) {
  const store = new EntityStore<any>(64);
  const groups = new EnemyGroupRegistry();
  const spawn = new SpawnSystem(store, { rng01: () => 0.5, logicSize: { w: 896, h: 504 }, weaponDb: WEAPONS_MVP as any }, createWorldState(), groups);
  spawn.update({ tick: 1, dt: 1 / 60 }, [{ type: EventType.SPAWN_ENEMY_GROUP, payload }] as any);
  const enemies = ((store as any).entities as any[]).filter((e) => e?.alive && e.kind === "enemy");
  return { enemies, groups };
}

function assertGroupRuntime(payload: CMEventMap[typeof EventType.SPAWN_ENEMY_GROUP], expectedFsmPresetId: string) {
  assert.equal(payload.fsmPresetId, expectedFsmPresetId, "DOM group payload contains selected fsmPresetId");
  assert.equal((payload as any).behaviorPresetId, undefined, "DOM group payload does not put the FSM ID in behaviorPresetId");
  const { enemies, groups } = runThroughSpawnSystem(payload);
  assert.equal(enemies.length, payload.count, "SpawnSystem creates every requested DOM group member");
  assert.equal(groups.size(), 1, "group metadata remains present");
  assert.equal((groups.get(1) as any)?.fsm?.preset?.id, expectedFsmPresetId, "group anchor runtime uses selected FSM preset");
  assert.equal((groups.get(1) as any)?.movementPresetId, "none.hold", "group anchor does not use default movement when FSM is selected");
  for (const ent of enemies) {
    const fsm = getFsmDebugSnapshot(ent);
    assert.equal(ent.typeId, payload.enemyTypeId, "member type/appearance remains selected Type");
    assert.equal(fsm?.presetId, expectedFsmPresetId, "member runtime uses selected explicit FSM");
    assert(fsm?.stateId, "member FSM has a concrete state id");
    assert(ent.group, "member group metadata remains present");
    assert.equal(ent.behaviorId, "none", "member movement remains group-owned via none.hold suppression");
  }
}

const builtinPayload = mountAndSpawnGroup({ enemyTypeId: "red", fsmPresetId: "fsm.hover" });
assertGroupRuntime(builtinPayload, "fsm.hover");
const chargePayload = mountAndSpawnGroup({ enemyTypeId: "red", fsmPresetId: "fsm.charge" });
assert.equal(chargePayload.count, 3, "Charge default-single preset uses visible/draft Count for group cardinality");
assertGroupRuntime(chargePayload, "fsm.charge");

const model = new FsmPresetEditorModel(CONTENT.userFsmPresets);
model.create();
const userId = model.selectedId;
const userPayload = mountAndSpawnGroup({ enemyTypeId: "red", fsmPresetId: userId });
assertGroupRuntime(userPayload, userId);
CONTENT.userFsmPresets.delete(userId);

const overridePayload = mountAndSpawnGroup({ enemyTypeId: "fsm_turret", fsmPresetId: "fsm.hover" });
assertGroupRuntime(overridePayload, "fsm.hover");

const defaultPayload = mountAndSpawnGroup({ enemyTypeId: "fsm_turret" });
assert.equal(defaultPayload.fsmPresetId, "fsm.turret", "default FSM selection emits selected preset id");
const defaultRuntime = runThroughSpawnSystem(defaultPayload).enemies.map((ent) => getFsmDebugSnapshot(ent)?.presetId);
assert(defaultRuntime.every((id) => id === "fsm.turret"), "default FSM selection uses selected preset id matching type default");

const invalidPayload = { ...builtinPayload, fsmPresetId: "fsm.missing.u0_2" };
assert.throws(() => runThroughSpawnSystem(invalidPayload), /Unknown explicit fsmPresetId/, "invalid explicit FSM fails clearly without silent fallback");

console.log("DevSummonerBrowserGroupFsm smoke passed");
