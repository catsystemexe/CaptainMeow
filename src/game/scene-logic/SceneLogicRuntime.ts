import type { FlowActionDefinition } from "./Action";
import { executeFlowAction, materializeAction, type FlowActionRuntimeAdapter } from "./ActionRuntime";
import { materializeSceneEvent, type SceneEventOccurrence, type SceneEventRuntimeAdapter } from "./EventRuntime";
import type { SceneLogicDocumentV1 } from "./SceneLogicDocument";
import { createMarkerCrossTriggerRuntimeState, evaluateMarkerCrossTrigger, type MarkerCrossTriggerRuntimeState } from "./TriggerRuntime";

/** Runtime-memory-only owner for the production Marker-cross -> Scene Event -> Flow Action slice. */
export class SceneLogicRuntime {
  private document: SceneLogicDocumentV1 | undefined;
  private readonly markerStates = new Map<string, MarkerCrossTriggerRuntimeState>();
  private pendingFlowActions: FlowActionDefinition[] = [];

  constructor(
    private readonly flowAdapter: FlowActionRuntimeAdapter,
    private readonly eventAdapter?: SceneEventRuntimeAdapter,
  ) {}

  /** A new Scene activation always discards once memory and requires a fresh position baseline. */
  activate(document: SceneLogicDocumentV1 | undefined): void {
    this.document = document;
    this.markerStates.clear();
    this.pendingFlowActions = [];
  }

  /** Restart re-arms authored Triggers and requires a fresh first-sample baseline. */
  reset(): void { this.activate(this.document); }

  /**
   * Re-arms Marker Triggers and records an authoring seek destination without
   * evaluating it. This changes runtime memory only: it cannot emit an Event or
   * enqueue an Action.
   */
  rebaselinePlayerWorldX(currentX: number): void {
    this.markerStates.clear();
    this.pendingFlowActions = [];
    for (const trigger of this.document?.triggers ?? []) {
      if (trigger.kind !== "space" || trigger.relation !== "cross") continue;
      this.markerStates.set(trigger.id, { previousX: currentX, fired: false });
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
        const eventOccurrence = materializeSceneEvent(triggerOccurrence, binding, definition);
        occurrences.push(eventOccurrence);
        this.eventAdapter?.dispatch(eventOccurrence);
        for (const actionBinding of document.eventActionBindings.filter(item => item.eventId === definition.id)) {
          const action = document.actions.find(item => item.id === actionBinding.actionId);
          if (action?.category === "flow") this.pendingFlowActions.push(materializeAction(eventOccurrence, actionBinding, action));
        }
      }
    }
    return occurrences;
  }

  /** Called at the existing Flow boundary, after the crossing tick's Simulation update. */
  flushFlowActions(): void {
    const pending = this.pendingFlowActions;
    this.pendingFlowActions = [];
    for (const action of pending) executeFlowAction(action, this.flowAdapter);
  }
}
