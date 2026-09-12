import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BACKGROUND_ASSET_DECLARATIONS } from "../assets/BackgroundAssets";
import { serializeBackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Serialization";
import type { BackgroundSceneV2 } from "../render/bg/v2/BackgroundV2Types";
import { BACKGROUND_ASSET_CATALOG, type BackgroundAssetEntry } from "./PixelBgrLabAssets";
import { initialV2AssetId, resolveV2PickerAsset, syncV2PickerAssetId } from "./PixelBgrV2AssetPicker";
import { insertV2LaneObject, insertV2LaneSegment } from "./PixelBgrV2LaneInsert";

assert.deepEqual(BACKGROUND_ASSET_CATALOG.map(({id,label,url})=>({id,label,url})),BACKGROUND_ASSET_DECLARATIONS.map(({definition})=>({id:definition.id,label:definition.displayName,url:definition.runtime.url})),"picker projection derives identity, Display Name, and URL from canonical declarations");
assert.equal(initialV2AssetId(BACKGROUND_ASSET_CATALOG),BACKGROUND_ASSET_DECLARATIONS[0]?.definition.id,"initial selection is deterministic");
assert.equal(initialV2AssetId([]),"");
const renamed:BackgroundAssetEntry={...BACKGROUND_ASSET_CATALOG[1],label:"A mutable display label"};
assert.deepEqual(resolveV2PickerAsset([renamed],renamed.id),{id:renamed.id,url:renamed.url},"Display Name is not persisted identity");
assert.equal(resolveV2PickerAsset([renamed],"unknown"),null,"unresolved selection never falls back to index zero");
assert.equal(syncV2PickerAssetId("unknown-entity-asset"),"unknown-entity-asset","unknown entity identity remains diagnostic");

const scene:BackgroundSceneV2={version:2,id:"picker",environment:{},tracks:[{id:"far",name:"Far",role:"far",mode:"sequence",enabled:true,parallax:{x:1,y:1},zBase:0,segments:[{id:"template",startTrackX:0,widthPx:64,asset:{id:renamed.id,url:renamed.url},offsetY:0,opacity:1,blend:"normal",localZ:0,enabled:true}],objects:[]}]};
const selected=BACKGROUND_ASSET_CATALOG[2];
const segment=insertV2LaneSegment(scene,"far",64,{id:selected.id,url:selected.url},"template");assert(segment.ok);if(!segment.ok)throw Error(segment.error);
assert.deepEqual(segment.scene.tracks[0].segments.at(-1)?.asset,{id:selected.id,url:selected.url},"SEG insert uses picker ID and canonical runtime URL");
const object=insertV2LaneObject(segment.scene,"far",96,{id:selected.id,url:selected.url});assert(object.ok);if(!object.ok)throw Error(object.error);
assert.deepEqual(object.scene.tracks[0].objects.at(-1)?.asset,{id:selected.id,url:selected.url},"OBJ insert uses picker ID and canonical runtime URL");
const persisted=JSON.parse(serializeBackgroundSceneV2(object.scene));
assert.deepEqual(persisted.tracks[0].segments.at(-1).asset,{id:selected.id});
assert.deepEqual(persisted.tracks[0].objects.at(-1).asset,{id:selected.id});

const ui=readFileSync(new URL("./PixelBgrLabUI.ts",import.meta.url),"utf8");
assert.match(ui,/createSceneAssetContext\(this\.v2SelectedAssetId/,"right catalogue consumes the existing picker authority");
assert.doesNotMatch(ui,/renderV2AssetPicker/,"legacy left picker surface is removed");
assert.match(ui,/resolveV2PickerAsset\(BACKGROUND_ASSET_CATALOG,this\.v2SelectedAssetId\)/,"both insert actions resolve explicit picker authority");
assert.match(ui,/this\.v2SelectedAssetId=syncV2PickerAssetId\(segment\.asset\.id\)/);assert.match(ui,/this\.v2SelectedAssetId=syncV2PickerAssetId\(object\.asset\.id\)/);
assert.doesNotMatch(ui,/const catalog=BACKGROUND_ASSET_CATALOG\[0\]/,"insert no longer silently chooses the first entry");
console.log("PixelBgrV2AssetPicker.smoke: PASS");
