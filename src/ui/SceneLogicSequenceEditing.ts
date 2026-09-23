import {
  validateSceneLogicDocumentV2,
  type SceneLogicDocumentV1,
  type SceneLogicDocumentV2,
} from "../game/scene-logic/SceneLogicDocument";
import type { SequenceStep } from "../game/scene-logic/Sequence";

export type SequenceEditResult =
  | { readonly ok: true; readonly document: SceneLogicDocumentV2 }
  | { readonly ok: false; readonly document: SceneLogicDocumentV2; readonly error: string };

export function emptySceneLogicDocumentV1(): SceneLogicDocumentV1 {
  return { version: 1, spaces: { markers: [], ranges: [], zones: [] }, states: [], triggers: [], events: [], actions: [], triggerEventBindings: [], eventActionBindings: [] };
}

/** Explicit authoring upgrade. Loading a V1 document never calls this operation. */
export function enableSequenceAuthoring(document: SceneLogicDocumentV1 | SceneLogicDocumentV2 | undefined): SceneLogicDocumentV2 {
  const source = document ?? emptySceneLogicDocumentV1();
  if (source.version === 2) return source;
  return { ...source, version: 2, sequenceDefinitions: [], sequenceInstances: [] };
}

const firstFreeId = (ids: readonly string[], stem: string): string => {
  const used = new Set(ids); let index = 1;
  while (used.has(`${stem}_${index}`)) index++;
  return `${stem}_${index}`;
};

function commit(document: SceneLogicDocumentV2, next: SceneLogicDocumentV2): SequenceEditResult {
  const validation = validateSceneLogicDocumentV2(next);
  return validation.valid ? { ok: true, document: next } : { ok: false, document, error: `${validation.errors[0]?.path}: ${validation.errors[0]?.message}` };
}
const missing = (document: SceneLogicDocumentV2, message: string): SequenceEditResult => ({ ok: false, document, error: message });

export function createSequenceDefinition(document: SceneLogicDocumentV2): SequenceEditResult {
  const id = firstFreeId(document.sequenceDefinitions.map(item => item.id), "sequence");
  return commit(document, { ...document, sequenceDefinitions: [...document.sequenceDefinitions, { id, steps: [] }] });
}

export function deleteSequenceDefinition(document: SceneLogicDocumentV2, definitionId: string): SequenceEditResult {
  if (!document.sequenceDefinitions.some(item => item.id === definitionId)) return missing(document, `Sequence Definition '${definitionId}' was not found.`);
  if (document.sequenceInstances.some(item => item.definitionId === definitionId)) return missing(document, `Cannot delete Sequence Definition '${definitionId}': it is referenced by a Sequence Instance.`);
  return commit(document, { ...document, sequenceDefinitions: document.sequenceDefinitions.filter(item => item.id !== definitionId) });
}

function replaceSteps(document: SceneLogicDocumentV2, definitionId: string, edit: (steps: readonly SequenceStep[]) => readonly SequenceStep[]): SequenceEditResult {
  const definition = document.sequenceDefinitions.find(item => item.id === definitionId);
  if (!definition) return missing(document, `Sequence Definition '${definitionId}' was not found.`);
  return commit(document, { ...document, sequenceDefinitions: document.sequenceDefinitions.map(item => item.id === definitionId ? { ...item, steps: edit(item.steps) } : item) });
}
export const addSequenceEventStep = (document: SceneLogicDocumentV2, definitionId: string, eventId: string): SequenceEditResult => replaceSteps(document, definitionId, steps => [...steps, { kind: "event", eventId }]);
export const addSequenceActionStep = (document: SceneLogicDocumentV2, definitionId: string, actionId: string): SequenceEditResult => replaceSteps(document, definitionId, steps => [...steps, { kind: "action", actionId }]);
export const addSequenceWaitStep = (document: SceneLogicDocumentV2, definitionId: string, durationSec = 0): SequenceEditResult => replaceSteps(document, definitionId, steps => [...steps, { kind: "wait", durationSec }]);

export function updateSequenceStep(document: SceneLogicDocumentV2, definitionId: string, index: number, step: SequenceStep): SequenceEditResult {
  return replaceSteps(document, definitionId, steps => steps.map((current, currentIndex) => currentIndex === index ? step : current));
}
export function moveSequenceStep(document: SceneLogicDocumentV2, definitionId: string, index: number, direction: -1 | 1): SequenceEditResult {
  return replaceSteps(document, definitionId, steps => {
    const target = index + direction;
    if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) return steps;
    const next = [...steps]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
}
export const deleteSequenceStep = (document: SceneLogicDocumentV2, definitionId: string, index: number): SequenceEditResult => replaceSteps(document, definitionId, steps => steps.filter((_, current) => current !== index));

export function createSequenceInstance(document: SceneLogicDocumentV2, definitionId: string): SequenceEditResult {
  if (!document.sequenceDefinitions.some(item => item.id === definitionId)) return missing(document, `Sequence Definition '${definitionId}' was not found.`);
  const id = firstFreeId(document.sequenceInstances.map(item => item.id), "sequence_instance");
  return commit(document, { ...document, sequenceInstances: [...document.sequenceInstances, { id, definitionId }] });
}
export function deleteSequenceInstance(document: SceneLogicDocumentV2, instanceId: string): SequenceEditResult {
  if (!document.sequenceInstances.some(item => item.id === instanceId)) return missing(document, `Sequence Instance '${instanceId}' was not found.`);
  if (document.actions.some(item => item.category === "flow" && item.type === "start_sequence" && item.sequenceInstanceId === instanceId)) return missing(document, `Cannot delete Sequence Instance '${instanceId}': it is referenced by Flow.start_sequence.`);
  return commit(document, { ...document, sequenceInstances: document.sequenceInstances.filter(item => item.id !== instanceId) });
}
