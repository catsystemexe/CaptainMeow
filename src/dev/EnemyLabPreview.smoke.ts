import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync("src/dev/DevSummoner.ts", "utf8");
for (const text of ["Preview Draft", "Preview Saved", "Restart", "Stop", "ds-fsm-preview-status", "ds-fsm-preview-diagnostics", "ds-fsm-preview-trace", "FsmPreviewSession"]) assert(src.includes(text), `${text} exists in real Enemy Lab bootstrap path`);
assert(!/node graph/i.test(src), "no node graph controls added");
assert(!/createElement\(\s*[`'"]canvas/.test(src), "no graph canvas added");
assert(src.includes("previewDraftBtn.disabled = authoringReadOnly || !ad || authoringModel.hasErrors()"), "invalid/built-in draft preview is disabled");
console.log("EnemyLabPreview smoke passed");
