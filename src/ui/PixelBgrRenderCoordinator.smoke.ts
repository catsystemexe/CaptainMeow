import assert from "node:assert/strict";
import { PixelBgrRenderCoordinator } from "./PixelBgrRenderCoordinator";

const coordinator = new PixelBgrRenderCoordinator();
const cycles: number[] = [];
let edits = 0;

coordinator.run(() => {
  cycles.push(++edits);
  if (edits === 1) {
    coordinator.run(() => cycles.push(99));
    coordinator.run(() => cycles.push(100));
  }
});
assert.deepEqual(cycles, [1, 2], "re-entrant requests coalesce after the owning render cycle");

coordinator.run(() => cycles.push(++edits));
assert.deepEqual(cycles, [1, 2, 3], "consecutive edits retain render ownership");
console.log("[SMOKE] PixelBgrRenderCoordinator OK ✅");
