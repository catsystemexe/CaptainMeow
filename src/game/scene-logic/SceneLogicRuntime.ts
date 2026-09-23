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
import {
  createSequenceInstance,
  startSequenceInstance,
  updateSequenceInstance,
  type SequenceInstance,
} from "./SequenceRuntime";
import type { StateRegistry } from "./StateRuntime";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger, type MarkerCrossTriggerRuntimeState } from "./TriggerRuntime";

export interface SceneLogicActionOwners {
  readonly world?: WorldActionRuntimeAdapter;
  readonly states?: StateRegistry;
}

/** Runtime-memory owner for canonical Scene Logic, including V2 Sequence Instances. */
export class SceneLogicRuntime {
  private document: SceneLogicDocument | undefined;
  private readonly markerStates = new Map<string, MarkerCrossTriggerRuntimeState>();
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

  rebaselinePlayerWorldX(currentX: number): void {
    this.pendingActions = [];
    const activeMarkerTriggerIds = new Set<string>();
    for (const trigger of this.document?.triggers ?? []) {
      if (trigger.kind !== "space" || trigger.relation !== "cross") continue;
      activeMarkerTriggerIds.add(trigger.id);
      const existing = this.markerStates.get(trigger.id);
      this.markerStates.set(trigger.id, { previousX: currentX, fired: existing?.fired ?? false });
    }
    for (const triggerId of this.markerStates.keys()) if (!activeMarkerTriggerIds.has(triggerId)) this.markerStates.delete(triggerId);
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
