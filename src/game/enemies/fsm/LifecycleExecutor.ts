import type { ResolvedFsmState } from "./resolve";
import type { EnterAction } from "./schema";

export interface LifecycleEntityLike {
  pendingKill?: boolean;
}

export interface LifecycleExecutionContext {
  markKill(): void;
  isKilled?(): boolean;
}

export interface LifecycleExecutionResult {
  killed: boolean;
  actionsExecuted: number;
}

function assertNever(action: never): never {
  throw new Error(`[fsm] unsupported enter action ${(action as { type?: unknown }).type}`);
}

function isEntityKilled(entity: LifecycleEntityLike | undefined, ctx: LifecycleExecutionContext): boolean {
  return ctx.isKilled?.() === true || entity?.pendingKill === true;
}

export function executeEnterActions(
  state: ResolvedFsmState,
  entity: LifecycleEntityLike | undefined,
  ctx?: LifecycleExecutionContext,
): LifecycleExecutionResult {
  const actions = state.lifecycle?.enterActions ?? [];
  if (actions.length === 0) return { killed: isEntityKilled(entity, ctx ?? { markKill: () => {} }), actionsExecuted: 0 };
  if (!ctx) throw new Error("[fsm] enterActions require a lifecycle execution context");

  let actionsExecuted = 0;
  for (const action of actions) {
    actionsExecuted += 1;
    switch ((action as EnterAction).type) {
      case "despawn":
        if (!isEntityKilled(entity, ctx)) ctx.markKill();
        break;
      default:
        assertNever(action as never);
    }
  }

  return { killed: isEntityKilled(entity, ctx), actionsExecuted };
}
