import assert from "node:assert/strict";
import { screenPointToV2TrackPoint, v2TrackPointToScreen } from "./PixelBgrV2PlacementCoordinates";

for(const test of [
  {name:"segment",track:{x:140,y:35},camera:{x:100,y:20},parallax:{x:.25,y:.5}},
  {name:"object",track:{x:420,y:160},camera:{x:300,y:90},parallax:{x:.8,y:.2}},
  {name:"foreground",track:{x:75,y:-20},camera:{x:-40,y:55},parallax:{x:1,y:1}},
]) {
  const screen=v2TrackPointToScreen(test.track,test.camera,test.parallax);
  const authored=screenPointToV2TrackPoint(screen,test.camera,test.parallax);
  assert.ok(Math.abs(authored.x-test.track.x)<1e-9,`${test.name} X round trip`);
  assert.ok(Math.abs(authored.y-test.track.y)<1e-9,`${test.name} Y round trip`);
  const movedCamera={x:test.camera.x+37,y:test.camera.y-19};
  assert.deepEqual(screenPointToV2TrackPoint(v2TrackPointToScreen(test.track,movedCamera,test.parallax),movedCamera,test.parallax),test.track);
}
assert.deepEqual(screenPointToV2TrackPoint({x:25,y:30},{x:100,y:50},{x:.5,y:.25}),{x:75,y:42.5},"screen -> authored uses camera-scaled parallax on both axes");
const authored={x:485,y:60};
const firstCamera={x:100,y:40};
const secondCamera={x:180,y:100};
const shallow=v2TrackPointToScreen(authored,firstCamera,{x:.25,y:.1});
const shallowMoved=v2TrackPointToScreen(authored,secondCamera,{x:.25,y:.1});
const deepMoved=v2TrackPointToScreen(authored,secondCamera,{x:.8,y:.6});
assert.deepEqual(shallowMoved,{x:440,y:50},"camera changes project both overlay axes");
assert.deepEqual(authored,{x:485,y:60},"camera projection does not rewrite authored coordinates");
assert.equal(shallow.x-shallowMoved.x,20,"camera X delta is scaled by parallax X");
assert.equal(shallow.y-shallowMoved.y,6,"camera Y delta is scaled by parallax Y");
assert.notDeepEqual(deepMoved,shallowMoved,"distinct parallax values produce distinct screen deltas");
console.log("[SMOKE] PixelBgrV2PlacementCoordinates OK ✅");
