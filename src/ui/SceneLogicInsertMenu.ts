import type { SceneLogicDocument } from "../game/scene-logic/SceneLogicDocument";
import { STATE_REFERENCE_PRESETS } from "./SceneLogicEditing";

export function sceneLogicInsertMenuCapabilities(logic: SceneLogicDocument | undefined) {
  const firstState = logic?.states[0];
  const firstNumberState = logic?.states.find(state => state.valueType === "number");
  return {
    firstMarker: logic?.spaces.markers[0],
    firstRange: logic?.spaces.ranges[0],
    firstZone: logic?.spaces.zones[0],
    firstState,
    firstNumberState,
    canCreateStateTrigger: Boolean(firstState),
    canCreateStateSetAction: Boolean(firstState),
    canCreateStateNumericAction: Boolean(firstNumberState),
    stateReferencePresets: STATE_REFERENCE_PRESETS.filter(preset => !logic?.states.some(state => state.id === preset.id)),
  };
}
