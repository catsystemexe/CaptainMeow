import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const cssRules = (selector: string): string[] => [...source.matchAll(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`, "g"))].map(match => match[1]);
const cssRule = (selector: string): string => cssRules(selector).at(-1) ?? "";

assert.match(cssRule(".cm-v2-segment,.cm-v2-object"), /background:#f7f8fa;color:#17202a/, "editable segments use a legible near-white semantic base");
assert.match(cssRule(".cm-v2-segment.readonly"), /background:#fff3bd;color:#332b12/, "read-only segments use a light-yellow semantic base");
assert.match(cssRule(".cm-v2-object"), /background:#65b9ed/, "background objects use a blue semantic base");
assert.doesNotMatch(cssRule(".cm-v2-object"), /#c084fc|126,72,170/, "background objects no longer use the former purple fill");
assert.match(cssRule(".cm-v2-overlap"), /repeating-linear-gradient/, "overlaps retain diagonal hatching at every zoom");
assert.match(cssRule(".cm-v2-overlap"), /pointer-events:none;z-index:3/, "overlap hatching is non-interactive and layered above fills");
assert.match(cssRule(".cm-v2-segment-label"), /position:absolute[^}]*z-index:4/, "segment labels remain above overlap hatching");
assert.match(cssRule(".cm-v2-segment.sel,.cm-v2-object.sel"), /outline:[^;]+;outline-offset:[^;]+;box-shadow:/, "selection adds a shared outline and glow");
assert.doesNotMatch(cssRule(".cm-v2-segment.sel,.cm-v2-object.sel"), /background:/, "selection does not replace semantic fills");
assert.match(cssRule(".cm-v2-segment.disabled,.cm-v2-object.disabled"), /opacity:[^;]+;filter:saturate\(/, "disabled state preserves category hue while reducing opacity and saturation");
assert.match(source, /const editable=track\.mode==="sequence"[\s\S]*?editable\?" editable":" readonly"/, "read-only styling derives explicitly from track mode");
assert.doesNotMatch(source, /segment\.locked|track\.locked|\.interactive|\.destructible/, "timeline styling adds no locked schema or inferred gameplay semantics");
assert.doesNotMatch(source, /cm-v2-(?:segment|object)[^}]*?(?:orange|#(?:f90|ff(?:8[0-9a-f]|9[0-9a-f]|a[0-9a-f])))/i, "orange remains unassigned");

console.log("[SMOKE] PixelBgrMultitrackSemanticColors OK ✅");
