import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./PixelBgrLabUI.ts", import.meta.url), "utf8");
const contextStart = source.indexOf("private openV2EventContextMenu");
const contextEnd = source.indexOf("private applyV2EventEdit", contextStart);
const contextMenu = source.slice(contextStart, contextEnd);
const migrationStart = source.indexOf("private migrateV2Signal");
const migrationEnd = source.indexOf("private applyV2EventEdit", migrationStart);
const migrationCommand = source.slice(migrationStart, migrationEnd);

assert.match(contextMenu, /if\(event\.type==="signal"\).*Migrate to Scene Logic/,
  "migration command is added only for a selected signal");
assert.doesNotMatch(contextMenu, /event\.type==="level-end"\).*Migrate to Scene Logic/,
  "level-end has no migration command");
assert.match(contextMenu, /disabled:locked/,
  "locked signal command is disabled");
assert.match(migrationCommand, /source\.locked===true\)return/,
  "locked handler path cannot invoke migration");
assert.match(migrationCommand, /confirm\(/,
  "destructive source removal requires explicit confirmation");
assert.match(migrationCommand, /migrateLegacySignalToSceneLogic\(scene,eventId\)/,
  "confirmed success routes through the pure migration helper");
assert.match(migrationCommand, /v2SelectedLogic=\{kind:"event",id:result\.eventId\}/,
  "successful migration selects the canonical Event in LOGIC");

const importCount = source.match(/migrateLegacySignalToSceneLogic/g)?.length ?? 0;
assert.equal(importCount, 2, "migration helper is imported and called only by the explicit command");
assert.doesNotMatch(source.slice(source.indexOf("private loadV2"), source.indexOf("private toggleSceneMenu")), /migrateLegacySignal/,
  "scene loading does not migrate automatically");
console.log("PixelBgrV2SceneEvents.smoke: PASS");
