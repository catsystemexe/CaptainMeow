import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import {
  addSequenceActionStep,
  addSequenceEventStep,
  addSequenceWaitStep,
  createSequenceDefinition,
  deleteSequenceDefinition,
  deleteSequenceStep,
  enableSequenceAuthoring,
  moveSequenceStep,
  updateSequenceStep,
  type SequenceEditResult,
} from "./SceneLogicSequenceEditing";

export interface SequenceLabPanel {
  readonly root: HTMLElement;
  render(scene: BackgroundSceneV2 | null): void;
}

export function createSceneLogicSequenceLab(
  apply: (scene: BackgroundSceneV2, error?: string) => void,
  documentRef: Document = document,
): SequenceLabPanel {
  const root = documentRef.createElement("section"); root.className = "cm-sequence-lab"; root.dataset.sequenceLab = "true";
  let selectedId = "";
  const button = (label: string, run: () => void) => { const value=documentRef.createElement("button");value.type="button";value.textContent=label;value.onclick=run;return value; };
  const select = (value:string, values:readonly string[], change:(next:string)=>void) => {const control=documentRef.createElement("select");for(const id of values){const option=documentRef.createElement("option");option.value=id;option.textContent=id;control.append(option);}control.value=value;control.onchange=()=>change(control.value);return control;};
  const commit = (scene:BackgroundSceneV2,result:SequenceEditResult) => result.ok ? apply({...scene,sceneLogic:result.document}) : apply(scene,result.error);
  const render = (scene:BackgroundSceneV2|null):void => {
    root.replaceChildren();const title=documentRef.createElement("h3");title.textContent="SEQUENCES";root.append(title);
    if(!scene){root.append("No active V2 Scene.");return;}
    if(!scene.sceneLogic||scene.sceneLogic.version===1){root.append(button("Enable Sequences",()=>apply({...scene,sceneLogic:enableSequenceAuthoring(scene.sceneLogic)})));return;}
    const logic=scene.sceneLogic;if(!logic.sequenceDefinitions.some(item=>item.id===selectedId))selectedId=logic.sequenceDefinitions[0]?.id??"";
    root.append(button("+ Sequence",()=>{const result=createSequenceDefinition(logic);if(result.ok)selectedId=result.document.sequenceDefinitions[result.document.sequenceDefinitions.length-1]?.id??"";commit(scene,result);}));
    const list=documentRef.createElement("div");list.className="cm-pixel-list cm-sequence-list";for(const definition of logic.sequenceDefinitions)list.append(button(definition.id,()=>{selectedId=definition.id;render(scene);}));root.append(list);
    const definition=logic.sequenceDefinitions.find(item=>item.id===selectedId);if(!definition)return;
    const heading=documentRef.createElement("h4");heading.textContent=`Selected Definition: ${definition.id}`;root.append(heading,"STEPS");
    definition.steps.forEach((step,index)=>{const row=documentRef.createElement("div");row.className="cm-pixel-row cm-sequence-step";row.append(`${index+1} ${step.kind.toUpperCase()} `);
      if(step.kind==="wait"){const input=documentRef.createElement("input");input.type="number";input.min="0";input.step="0.1";input.value=String(step.durationSec);input.onchange=()=>commit(scene,updateSequenceStep(logic,definition.id,index,{kind:"wait",durationSec:Number(input.value)}));row.append(input);}
      else if(step.kind==="event")row.append(select(step.eventId,logic.events.map(item=>item.id),eventId=>commit(scene,updateSequenceStep(logic,definition.id,index,{kind:"event",eventId}))));
      else {const actions=logic.actions.filter(item=>!(item.category==="flow"&&item.type==="start_sequence"));row.append(select(step.actionId,actions.map(item=>item.id),actionId=>commit(scene,updateSequenceStep(logic,definition.id,index,{kind:"action",actionId}))));}
      row.append(button("↑",()=>commit(scene,moveSequenceStep(logic,definition.id,index,-1))),button("↓",()=>commit(scene,moveSequenceStep(logic,definition.id,index,1))),button("×",()=>commit(scene,deleteSequenceStep(logic,definition.id,index))));root.append(row);
    });
    root.append(button("+ WAIT",()=>commit(scene,addSequenceWaitStep(logic,definition.id,.5))));
    const event=logic.events[0];root.append(button("+ EVENT",()=>event&&commit(scene,addSequenceEventStep(logic,definition.id,event.id))));
    const action=logic.actions.find(item=>!(item.category==="flow"&&item.type==="start_sequence"));root.append(button("+ ACTION",()=>action&&commit(scene,addSequenceActionStep(logic,definition.id,action.id))));
    root.append(button("Delete Sequence",()=>commit(scene,deleteSequenceDefinition(logic,definition.id))));
  };
  return {root,render};
}
