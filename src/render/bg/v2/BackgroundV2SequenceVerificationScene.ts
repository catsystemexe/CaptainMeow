import type { BackgroundSceneV2 } from "./BackgroundV2Types";

/** Deterministic Scene Lab fixture for exercising the production Sequence runtime path. */
export function createBackgroundV2SequenceVerificationScene(): BackgroundSceneV2 {
  return {
    version: 2,
    id: "bgr-v2-sequence-verification",
    environment: {},
    tracks: [],
    sceneLogic: {
      version: 2,
      spaces: {
        markers: [{ id: "sequence-verify-marker", position: 2200 }],
        ranges: [],
        zones: [],
      },
      states: [],
      triggers: [{
        id: "sequence-verify-trigger",
        kind: "space",
        relation: "cross",
        markerId: "sequence-verify-marker",
        mode: "once",
        enabled: true,
      }],
      events: [{ id: "sequence-verify-start-event", category: "scene", type: "sequence_verify_start" }],
      actions: [
        {
          id: "sequence-verify-start-action",
          category: "flow",
          type: "start_sequence",
          sequenceInstanceId: "sequence-verify:a",
        },
        { id: "sequence-verify-complete", category: "flow", type: "complete_level" },
      ],
      triggerEventBindings: [{
        triggerId: "sequence-verify-trigger",
        eventId: "sequence-verify-start-event",
      }],
      eventActionBindings: [{
        eventId: "sequence-verify-start-event",
        actionId: "sequence-verify-start-action",
      }],
      sequenceDefinitions: [{
        id: "sequence-verify",
        steps: [
          { kind: "wait", durationSec: 0.5 },
          { kind: "action", actionId: "sequence-verify-complete" },
        ],
      }],
      sequenceInstances: [{ id: "sequence-verify:a", definitionId: "sequence-verify" }],
    },
  };
}
