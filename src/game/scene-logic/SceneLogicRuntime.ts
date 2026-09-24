import type { SceneLogicActionDefinition } from "./Action";
import {
  executeFlowAction,
  executeStateAction,
  executeWorldAction,
  materializeAction,
  type FlowActionRuntimeAdapter,
  type WorldActionRuntimeAdapter,
} from "./ActionRuntime";
import {
  materializeSceneEvent,
  materializeSequenceSceneEvent,
  type SceneEventOccurrence,
  type SceneEventRuntimeAdapter,
} from "./EventRuntime";
import type { SceneLogicDocument } from "./SceneLogicDocument";
import { rangeContains, zoneContains } from "./Space";
import {
  createSequenceInstance,
  startSequenceInstance,
  updateSequenceInstance,
  type SequenceInstance,
} from "./SequenceRuntime";
import type { StateRegistry } from "./StateRuntime";
import { resolveStateReference } from "./StateRuntime";
import { resolveTriggerState } from "./Trigger";
import {
  createContainmentTriggerRuntimeState,
  createMarkerCrossTriggerRuntimeState,
  createStateTriggerRuntimeState,
  createTimeTriggerRuntimeState,
  evaluateMarkerCrossTrigger,
  evaluateRangeSpaceTrigger,
  evaluateStateTrigger,
  evaluateTimeTrigger,
  evaluateZoneSpaceTrigger,
  type ContainmentTriggerRuntimeState,
  type MarkerCrossTriggerRuntimeState,
  type StateTriggerRuntimeState,
  type TimeTriggerRuntimeState,
  type TriggerOccurrence,
} from "./TriggerRuntime";

export interface SceneLogicSimulationSample {
  readonly playerWorldX: number;
  readonly playerWorldY: number;
  readonly sceneTimeSec: number;
}

export interface SceneLogicActionOwners {
  readonly world?: WorldActionRuntimeAdapter;
  readonly states?: StateRegistry;
}

/** Runtime-memory owner for canonical Scene Logic, including V2 Sequence Instances. */
export class SceneLogicRuntime {
  private document: SceneLogicDocument | undefined;
  private readonly markerStates = new Map<string, MarkerCrossTriggerRuntimeState>();
  private readonly containmentStates = new Map<string, ContainmentTriggerRuntimeState>();
  private readonly timeStates = new Map<string, TimeTriggerRuntimeState>();
  private readonly stateStates = new Map<string, StateTriggerRuntimeState>();
  private readonly sequenceInstances = new Map<string, SequenceInstance>();
  private pendingActions: SceneLogicActionDefinition[] = [];
  private generation = 0;

  constructor(
    private readonly flowAdapter: FlowActionRuntimeAdapter,
    private readonly eventAdapter?: SceneEventRuntimeAdapter,
    private readonly actionOwners: SceneLogicActionOwners = {},
  ) {}

  activate(document: SceneLogicDocument | undefined): void {
    this.document = document;
    this.markerStates.clear();
    this.containmentStates.clear();
    this.timeStates.clear();
    this.stateStates.clear();
    this.pendingActions = [];
    this.sequenceInstances.clear();
    this.generation += 1;
    if (document?.version === 2) {
      for (const authored of document.sequenceInstances) {
        const definition = document.sequenceDefinitions.find(item => item.id === authored.definitionId);
        if (!definition) continue; // Strict persistence validation owns rejection.
        this.sequenceInstances.set(authored.id, createSequenceInstance(authored.id, definition, document));
      }
    }
  }

  reset(): void { this.activate(this.document); }

  getSequenceInstance(id: string): SequenceInstance | undefined { return this.sequenceInstances.get(id); }

  startSequence(instanceId: string): void {
    const instance = this.sequenceInstances.get(instanceId);
    if (!instance) throw new Error(`Flow start_sequence references missing Sequence Instance "${instanceId}"`);
    startSequenceInstance(instance);
  }

  rebaselinePlayerWorldPosition(currentX: number, currentY: number): void {
    const activeMarkerTriggerIds = new Set<string>();
    const activeContainmentTriggerIds = new Set<string>();
    for (const trigger of this.document?.triggers ?? []) {
      if (trigger.kind !== "space") continue;
      if (trigger.relation === "cross") {
        activeMarkerTriggerIds.add(trigger.id);
        const existing = this.markerStates.get(trigger.id);
        this.markerStates.set(trigger.id, { previousX: currentX, fired: existing?.fired ?? false });
      } else {
        activeContainmentTriggerIds.add(trigger.id);
        const existing = this.containmentStates.get(trigger.id);
        const inside = "rangeId" in trigger
          ? this.document?.spaces.ranges.some(range => range.id === trigger.rangeId && rangeContains(range, currentX)) ?? false
          : this.document?.spaces.zones.some(zone => zone.id === trigger.zoneId && zoneContains(zone, currentX, currentY)) ?? false;
        this.containmentStates.set(trigger.id, { previousInside: inside, fired: existing?.fired ?? false });
      }
    }
    for (const triggerId of this.markerStates.keys()) if (!activeMarkerTriggerIds.has(triggerId)) this.markerStates.delete(triggerId);
    for (const triggerId of this.containmentStates.keys()) if (!activeContainmentTriggerIds.has(triggerId)) this.containmentStates.delete(triggerId);
  }

  /** Compatibility wrapper for legacy Marker-only authoring callers. */
  rebaselinePlayerWorldX(currentX: number): void {
    for (const trigger of this.document?.triggers ?? []) {
      if (trigger.kind !== "space" || trigger.relation !== "cross") continue;
      const existing = this.markerStates.get(trigger.id);
      this.markerStates.set(trigger.id, { previousX: currentX, fired: existing?.fired ?? false });
    }
  }

  evaluatePlayerWorldX(currentX: number): readonly SceneEventOccurrence[] {
    const document = this.document;
    if (!document) return [];
    const occurrences: SceneEventOccurrence[] = [];
    for (const trigger of document.triggers) {
      if (trigger.kind !== "space" || trigger.relation !== "cross") continue;
      const marker = document.spaces.markers.find(item => item.id === trigger.markerId);
      if (!marker) continue;
      let state = this.markerStates.get(trigger.id);
      if (!state) { state = createMarkerCrossTriggerRuntimeState(); this.markerStates.set(trigger.id, state); }
      const triggerOccurrence = evaluateMarkerCrossTrigger(trigger, marker, state, currentX);
      if (!triggerOccurrence) continue;
      for (const binding of document.triggerEventBindings.filter(item => item.triggerId === trigger.id)) {
        const definition = document.events.find(item => item.id === binding.eventId);
        if (!definition) continue;
        const occurrence = materializeSceneEvent(triggerOccurrence, binding, definition);
        occurrences.push(occurrence);
        this.dispatchEvent(occurrence);
      }
    }
    return occurrences;
  }

  /** Evaluates all authored Trigger families once, in authored order, during Simulation. */
  evaluateSimulationSample(sample: SceneLogicSimulationSample): readonly SceneEventOccurrence[] {
    const document = this.document;
    if (!document) return [];
    const occurrences: SceneEventOccurrence[] = [];
    for (const trigger of document.triggers) {
      let triggerOccurrence: TriggerOccurrence | null = null;
      if (trigger.kind === "space" && trigger.relation === "cross") {
        const marker = document.spaces.markers.find(item => item.id === trigger.markerId);
        if (!marker) continue;
        let state = this.markerStates.get(trigger.id);
        if (!state) { state = createMarkerCrossTriggerRuntimeState(); this.markerStates.set(trigger.id, state); }
        triggerOccurrence = evaluateMarkerCrossTrigger(trigger, marker, state, sample.playerWorldX);
      } else if (trigger.kind === "space") {
        let state = this.containmentStates.get(trigger.id);
        if (!state) { state = createContainmentTriggerRuntimeState(); this.containmentStates.set(trigger.id, state); }
        if ("rangeId" in trigger) {
          const range = document.spaces.ranges.find(item => item.id === trigger.rangeId);
          if (!range) continue;
          triggerOccurrence = evaluateRangeSpaceTrigger(trigger, range, state, sample.playerWorldX);
        } else {
          const zone = document.spaces.zones.find(item => item.id === trigger.zoneId);
          if (!zone) continue;
          triggerOccurrence = evaluateZoneSpaceTrigger(trigger, zone, state, sample.playerWorldX, sample.playerWorldY);
        }
      } else if (trigger.kind === "time") {
        let state = this.timeStates.get(trigger.id);
        if (!state) { state = createTimeTriggerRuntimeState(); this.timeStates.set(trigger.id, state); }
        triggerOccurrence = evaluateTimeTrigger(trigger, state, sample.sceneTimeSec);
      } else {
        if (!this.actionOwners.states) throw new Error("State Trigger requires its runtime owner");
        let state = this.stateStates.get(trigger.id);
        if (!state) { state = createStateTriggerRuntimeState(); this.stateStates.set(trigger.id, state); }
        const reference = resolveStateReference(resolveTriggerState(trigger, document.states), this.actionOwners.states);
        triggerOccurrence = evaluateStateTrigger(trigger, reference, state);
      }
      if (triggerOccurrence) this.dispatchTriggerOccurrence(triggerOccurrence, occurrences);
    }
    return occurrences;
  }

  private dispatchTriggerOccurrence(triggerOccurrence: TriggerOccurrence, occurrences: SceneEventOccurrence[]): void {
    const document = this.document;
    if (!document) return;
    for (const binding of document.triggerEventBindings.filter(item => item.triggerId === triggerOccurrence.triggerId)) {
      const definition = document.events.find(item => item.id === binding.eventId);
      if (!definition) continue;
      const occurrence = materializeSceneEvent(triggerOccurrence, binding, definition);
      occurrences.push(occurrence);
      this.dispatchEvent(occurrence);
    }
  }

  private dispatchEvent(occurrence: SceneEventOccurrence): void {
    const document = this.document;
    if (!document) return;
    this.eventAdapter?.dispatch(occurrence);
    for (const binding of document.eventActionBindings.filter(item => item.eventId === occurrence.eventId)) {
      const action = document.actions.find(item => item.id === binding.actionId);
      if (action) this.pendingActions.push(materializeAction(occurrence, binding, action));
    }
  }

  /**
   * Flow boundary policy: execute one pending snapshot, then (only while active)
   * advance Sequences. Actions produced by that update remain for the next tick.
   */
  updateFlow(dt = 0, levelIsActive: () => boolean = () => true): void {
    const pending = this.pendingActions;
    this.pendingActions = [];
    const generation = this.generation;
    for (const action of pending) {
      this.executeAction(action);
      if (this.generation !== generation) return;
      if (!levelIsActive()) return;
    }
    if (!levelIsActive()) return;
    const document = this.document;
    if (document?.version !== 2) return;
    for (const instance of this.sequenceInstances.values()) {
      updateSequenceInstance(instance, dt, {
        events: document.events,
        actions: document.actions,
        dispatchEvent: (event, source) => this.dispatchEvent(materializeSequenceSceneEvent(event, source.id)),
        executeAction: action => { this.pendingActions.push(action); },
      });
    }
  }

  /** Compatibility name retained for existing V1 callers. */
  flushFlowActions(): void { this.updateFlow(0); }

  private executeAction(action: SceneLogicActionDefinition): void {
    if (action.category === "world") {
      if (!this.actionOwners.world) throw new Error("World Action requires its runtime owner");
      executeWorldAction(action, this.actionOwners.world);
    } else if (action.category === "state") {
      if (!this.document || !this.actionOwners.states) throw new Error("State Action requires its runtime owner");
      executeStateAction(action, this.document.states, this.actionOwners.states);
    } else if (action.type === "start_sequence") {
      this.startSequence(action.sequenceInstanceId);
    } else executeFlowAction(action, this.flowAdapter);
  }
}
