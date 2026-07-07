import { loadContent } from "./loadContent";

export const CONTENT: ReturnType<typeof loadContent> = loadContent();
export const BUILTIN_FSM_PRESETS = CONTENT.builtinFsmPresets;
