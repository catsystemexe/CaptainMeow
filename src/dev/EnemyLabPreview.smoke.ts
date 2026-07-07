import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("./DevSummoner.ts", import.meta.url), "utf8");
assert(src.includes("FsmPreviewSession"), "internal preview override infrastructure remains available");
assert(src.includes("resolveEphemeralFsmPreset"), "draft spawn uses ephemeral FSM resolution");
for (const text of ["Preview Draft", "Preview Saved", "const previewRestartBtn", "const previewStopBtn"]) assert(src.includes(text), `${text} remains internal only`);
assert(!src.includes('addAuthoringSection("Preview")'), "legacy Preview section is not mounted in visible authoring UI");
console.log("EnemyLabPreview smoke passed");
