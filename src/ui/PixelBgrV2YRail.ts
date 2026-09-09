export interface V2YRailDrag { pointerId: number; startClientY: number; originalY: number; logicPerClientPx: number }

export function v2YRailValue(drag: V2YRailDrag, clientY: number): number {
  const delta = Number.isFinite(clientY) ? clientY - drag.startClientY : 0;
  return drag.originalY + delta * drag.logicPerClientPx;
}
