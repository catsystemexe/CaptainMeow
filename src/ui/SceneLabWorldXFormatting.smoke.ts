import { strict as assert } from "node:assert";
import { formatWorldX } from "./SceneLabWorldXFormatting";
const coordinates={player:-1703.8,marker:1.5,range:[2.4,9.6],zone:[-4.5,12.2],legacyEvent:99.7};
assert.equal(formatWorldX(coordinates.player),"-1704");assert.equal(formatWorldX(coordinates.marker),"2");assert.deepEqual(coordinates.range.map(formatWorldX),["2","10"]);assert.deepEqual(coordinates.zone.map(formatWorldX),["-4","12"]);assert.equal(formatWorldX(coordinates.legacyEvent),"100");assert.equal(coordinates.player,-1703.8);console.log("Scene Lab world-X formatting smoke passed");
