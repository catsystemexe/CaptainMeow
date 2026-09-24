import type { BackgroundSceneV2 } from "./BackgroundV2Types";

/** Deterministic Scene Lab fixture for exercising every production Trigger family. */
export function createBackgroundV2TriggerVerificationScene(): BackgroundSceneV2 {
  return {
    version: 2,
    id: "bgr-v2-trigger-verification",
    environment: {},
    tracks: [],
    sceneLogic: {
      version: 2,
      spaces: {
        markers: [],
        ranges: [{ id: "verify-range", start: 350, end: 450 }],
        zones: [{ id: "verify-zone", minX: 650, maxX: 750, minY: 0, maxY: 1080 }],
      },
      states: [{ id: "verify_scroll_speed", address: "scene.scrollSpeed", valueType: "number" }],
      triggers: [
        { id: "verify-time", kind: "time", relation: "after", timeSec: 0.25, mode: "once", enabled: true },
        { id: "verify-range-enter", kind: "space", relation: "enter", rangeId: "verify-range", mode: "once", enabled: true },
        { id: "verify-zone-enter", kind: "space", relation: "enter", zoneId: "verify-zone", mode: "once", enabled: true },
        { id: "verify-stopped", kind: "state", stateId: "verify_scroll_speed", relation: "==", value: 0, mode: "once", enabled: true },
      ],
      events: [
        { id: "verify-time-event", category: "scene", type: "trigger_verify_time" },
        { id: "verify-range-event", category: "scene", type: "trigger_verify_range" },
        { id: "verify-zone-event", category: "scene", type: "trigger_verify_zone" },
        { id: "verify-state-event", category: "scene", type: "trigger_verify_state" },
      ],
      actions: [
        { id: "verify-speed-30", category: "state", type: "set", stateId: "verify_scroll_speed", value: 30 },
        { id: "verify-speed-20", category: "state", type: "set", stateId: "verify_scroll_speed", value: 20 },
        { id: "verify-stop", category: "world", type: "stop_scroll" },
        { id: "verify-complete", category: "flow", type: "complete_level" },
      ],
      triggerEventBindings: [
        { triggerId: "verify-time", eventId: "verify-time-event" },
        { triggerId: "verify-range-enter", eventId: "verify-range-event" },
        { triggerId: "verify-zone-enter", eventId: "verify-zone-event" },
        { triggerId: "verify-stopped", eventId: "verify-state-event" },
      ],
      eventActionBindings: [
        { eventId: "verify-time-event", actionId: "verify-speed-30" },
        { eventId: "verify-range-event", actionId: "verify-speed-20" },
        { eventId: "verify-zone-event", actionId: "verify-stop" },
        { eventId: "verify-state-event", actionId: "verify-complete" },
      ],
      sequenceDefinitions: [],
      sequenceInstances: [],
    },
  };
}
