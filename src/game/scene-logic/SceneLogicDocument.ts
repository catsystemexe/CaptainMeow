import {
  validateEventActionBinding,
  validateFlowRestartLevelAction,
  validateStateDecrementAction,
  validateStateIncrementAction,
  validateStateSetAction,
  validateWorldStopScrollAction,
  type EventActionBinding,
  type SceneLogicActionDefinition,
} from "./Action";
import {
  validateSceneEventDefinition,
  validateTriggerEventBinding,
  type SceneEventDefinition,
  type TriggerEventBinding,
} from "./Event";
import { validateMarker, validateRange, validateZone, type Marker, type Range, type Zone } from "./Space";
import { stateValueType, validateStateReferenceDefinition, type StateReferenceDefinition } from "./State";
import {
  validateMarkerCrossTrigger,
  validateRangeSpaceTrigger,
  validateStateTrigger,
  validateTimeTrigger,
  validateZoneSpaceTrigger,
  type SceneLogicTriggerDefinition,
} from "./Trigger";

export interface SceneLogicDocumentV1 {
  readonly version: 1;
  readonly spaces: {
    readonly markers: readonly Marker[];
    readonly ranges: readonly Range[];
    readonly zones: readonly Zone[];
  };
  readonly states: readonly StateReferenceDefinition[];
  readonly triggers: readonly SceneLogicTriggerDefinition[];
  readonly events: readonly SceneEventDefinition[];
  readonly actions: readonly SceneLogicActionDefinition[];
  readonly triggerEventBindings: readonly TriggerEventBinding[];
  readonly eventActionBindings: readonly EventActionBinding[];
}

export interface SceneLogicDocumentValidationIssue { readonly path: string; readonly message: string }
export interface SceneLogicDocumentValidationResult { readonly valid: boolean; readonly errors: readonly SceneLogicDocumentValidationIssue[] }

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateSceneLogicDocumentV1(value: unknown): SceneLogicDocumentValidationResult {
  const errors: SceneLogicDocumentValidationIssue[] = [];
  const issue = (path: string, message: string): void => { errors.push({ path, message }); };
  const unknownFields = (record: Record<string, unknown>, allowed: readonly string[], path: string): void => {
    const known = new Set(allowed);
    for (const key of Object.keys(record)) if (!known.has(key)) issue(path ? `${path}.${key}` : key, "unknown field");
  };
  const validateArray = (record: Record<string, unknown>, key: string, path = ""): unknown[] => {
    const collection = record[key];
    const collectionPath = path ? `${path}.${key}` : key;
    if (!Array.isArray(collection)) { issue(collectionPath, "must be an array"); return []; }
    return collection;
  };
  const relay = (path: string, result: { readonly issues: readonly { readonly field: string; readonly message: string }[] }): void => {
    for (const item of result.issues) issue(`${path}.${item.field}`, item.message);
  };
  const uniqueIds = (items: readonly unknown[], path: string, seen = new Set<string>()): Set<string> => {
    items.forEach((item, index) => {
      if (!object(item) || typeof item.id !== "string" || item.id.trim().length === 0) return;
      if (seen.has(item.id)) issue(`${path}[${index}].id`, "must be unique");
      else seen.add(item.id);
    });
    return seen;
  };

  if (!object(value)) return { valid: false, errors: [{ path: "", message: "must be an object" }] };
  unknownFields(value, ["version", "spaces", "states", "triggers", "events", "actions", "triggerEventBindings", "eventActionBindings"], "");
  if (value.version !== 1) issue("version", "must equal 1");

  let markers: unknown[] = []; let ranges: unknown[] = []; let zones: unknown[] = [];
  if (!object(value.spaces)) issue("spaces", "must be an object");
  else {
    unknownFields(value.spaces, ["markers", "ranges", "zones"], "spaces");
    markers = validateArray(value.spaces, "markers", "spaces");
    ranges = validateArray(value.spaces, "ranges", "spaces");
    zones = validateArray(value.spaces, "zones", "spaces");
  }
  const states = validateArray(value, "states");
  const triggers = validateArray(value, "triggers");
  const events = validateArray(value, "events");
  const actions = validateArray(value, "actions");
  const triggerEventBindings = validateArray(value, "triggerEventBindings");
  const eventActionBindings = validateArray(value, "eventActionBindings");

  markers.forEach((item, index) => {
    const path = `spaces.markers[${index}]`;
    if (!object(item)) { issue(path, "must be an object"); return; }
    unknownFields(item, ["id", "position"], path);
    relay(path, validateMarker(item as unknown as Marker));
  });
  ranges.forEach((item, index) => {
    const path = `spaces.ranges[${index}]`;
    if (!object(item)) { issue(path, "must be an object"); return; }
    unknownFields(item, ["id", "start", "end"], path);
    relay(path, validateRange(item as unknown as Range));
  });
  zones.forEach((item, index) => {
    const path = `spaces.zones[${index}]`;
    if (!object(item)) { issue(path, "must be an object"); return; }
    unknownFields(item, ["id", "minX", "maxX", "minY", "maxY"], path);
    relay(path, validateZone(item as unknown as Zone));
  });
  const spaceIds = uniqueIds(markers, "spaces.markers");
  uniqueIds(ranges, "spaces.ranges", spaceIds); uniqueIds(zones, "spaces.zones", spaceIds);

  states.forEach((item, index) => {
    const path = `states[${index}]`;
    if (object(item)) unknownFields(item, ["id", "address", "valueType"], path);
    relay(path, validateStateReferenceDefinition(item));
  });
  const stateIds = uniqueIds(states, "states");
  const authoredStates = states.filter(object) as unknown as StateReferenceDefinition[];

  triggers.forEach((item, index) => {
    const path = `triggers[${index}]`;
    if (!object(item)) { issue(path, "must be an object"); return; }
    let result;
    if (item.kind === "time") {
      unknownFields(item, ["id", "kind", "relation", "timeSec", "mode", "enabled"], path);
      result = validateTimeTrigger(item);
    } else if (item.kind === "state") {
      unknownFields(item, ["id", "kind", "stateId", "relation", "value", "mode", "enabled"], path);
      result = validateStateTrigger(item, authoredStates);
      if (typeof item.stateId === "string" && !stateIds.has(item.stateId)) issue(`${path}.stateId`, `references missing State "${item.stateId}"`);
    } else if (item.kind === "space" && item.relation === "cross") {
      unknownFields(item, ["id", "kind", "relation", "markerId", "mode", "enabled"], path);
      result = validateMarkerCrossTrigger(item);
      if (typeof item.markerId === "string" && !markers.some((space) => object(space) && space.id === item.markerId)) issue(`${path}.markerId`, `references missing Marker "${item.markerId}"`);
    } else if (item.kind === "space" && "rangeId" in item) {
      unknownFields(item, ["id", "kind", "relation", "rangeId", "mode", "enabled"], path);
      result = validateRangeSpaceTrigger(item);
      if (typeof item.rangeId === "string" && !ranges.some((space) => object(space) && space.id === item.rangeId)) issue(`${path}.rangeId`, `references missing Range "${item.rangeId}"`);
    } else if (item.kind === "space" && "zoneId" in item) {
      unknownFields(item, ["id", "kind", "relation", "zoneId", "mode", "enabled"], path);
      result = validateZoneSpaceTrigger(item);
      if (typeof item.zoneId === "string" && !zones.some((space) => object(space) && space.id === item.zoneId)) issue(`${path}.zoneId`, `references missing Zone "${item.zoneId}"`);
    } else { issue(`${path}.kind`, "does not identify a supported Trigger variant"); return; }
    relay(path, result);
  });
  const triggerIds = uniqueIds(triggers, "triggers");

  events.forEach((item, index) => {
    const path = `events[${index}]`;
    if (object(item)) unknownFields(item, ["id", "category", "type"], path);
    relay(path, validateSceneEventDefinition(item));
  });
  const eventIds = uniqueIds(events, "events");

  actions.forEach((item, index) => {
    const path = `actions[${index}]`;
    if (!object(item)) { issue(path, "must be an object"); return; }
    const stateAction = item.category === "state";
    unknownFields(item, stateAction ? ["id", "category", "type", "stateId", "value"] : ["id", "category", "type"], path);
    let result;
    if (item.category === "world" && item.type === "stop_scroll") result = validateWorldStopScrollAction(item);
    else if (item.category === "flow" && item.type === "restart_level") result = validateFlowRestartLevelAction(item);
    else if (item.category === "state" && item.type === "set") result = validateStateSetAction(item);
    else if (item.category === "state" && item.type === "increment") result = validateStateIncrementAction(item);
    else if (item.category === "state" && item.type === "decrement") result = validateStateDecrementAction(item);
    else { issue(`${path}.type`, "does not identify a supported Action variant"); return; }
    relay(path, result);
    if (stateAction && typeof item.stateId === "string") {
      const state = authoredStates.find((candidate) => candidate.id === item.stateId);
      if (!state) issue(`${path}.stateId`, `references missing State "${item.stateId}"`);
      else if (item.type === "set" && (typeof item.value === "boolean" || typeof item.value === "string" || (typeof item.value === "number" && Number.isFinite(item.value))) && stateValueType(item.value) !== state.valueType) issue(`${path}.value`, `value type must match State type ${state.valueType}`);
      else if ((item.type === "increment" || item.type === "decrement") && state.valueType !== "number") issue(`${path}.stateId`, "increment/decrement requires a number State");
    }
  });
  const actionIds = uniqueIds(actions, "actions");

  const bindingPairs = new Set<string>();
  triggerEventBindings.forEach((item, index) => {
    const path = `triggerEventBindings[${index}]`;
    if (object(item)) unknownFields(item, ["triggerId", "eventId"], path);
    relay(path, validateTriggerEventBinding(item));
    if (!object(item)) return;
    if (typeof item.triggerId === "string" && !triggerIds.has(item.triggerId)) issue(`${path}.triggerId`, `references missing Trigger "${item.triggerId}"`);
    if (typeof item.eventId === "string" && !eventIds.has(item.eventId)) issue(`${path}.eventId`, `references missing Event "${item.eventId}"`);
    const pair = `${String(item.triggerId)}\0${String(item.eventId)}`;
    if (bindingPairs.has(pair)) issue(path, "duplicate Trigger/Event binding"); else bindingPairs.add(pair);
  });
  bindingPairs.clear();
  eventActionBindings.forEach((item, index) => {
    const path = `eventActionBindings[${index}]`;
    if (object(item)) unknownFields(item, ["eventId", "actionId"], path);
    relay(path, validateEventActionBinding(item));
    if (!object(item)) return;
    if (typeof item.eventId === "string" && !eventIds.has(item.eventId)) issue(`${path}.eventId`, `references missing Event "${item.eventId}"`);
    if (typeof item.actionId === "string" && !actionIds.has(item.actionId)) issue(`${path}.actionId`, `references missing Action "${item.actionId}"`);
    const pair = `${String(item.eventId)}\0${String(item.actionId)}`;
    if (bindingPairs.has(pair)) issue(path, "duplicate Event/Action binding"); else bindingPairs.add(pair);
  });
  return { valid: errors.length === 0, errors };
}
