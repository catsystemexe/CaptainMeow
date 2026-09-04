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
console.log("[SMOKE] PixelBgrV2PlacementCoordinates OK ✅");
