import assert from "node:assert/strict";
import { createRightLabHost } from "./RightLabHost";

class FakeElement {
  className = ""; textContent = ""; type = ""; hidden = false; children: FakeElement[] = []; attributes = new Map<string,string>(); listeners = new Map<string,()=>void>();
  append(...children: FakeElement[]) { this.children.push(...children); }
  appendChild(child: FakeElement) { this.children.push(child); return child; }
  setAttribute(key:string,value:string) { this.attributes.set(key,value); }
  addEventListener(key:string,fn:()=>void) { this.listeners.set(key,fn); }
}
const documentStub = { createElement: () => new FakeElement() } as unknown as Document;
const enemy = new FakeElement(); const hud = new FakeElement();
const host = createRightLabHost(enemy as unknown as HTMLElement, hud as unknown as HTMLElement, documentStub);
const bodies = (host.root as unknown as FakeElement).children.slice(1);
assert.equal(host.getActive(), "enemy"); assert.equal(bodies[0].hidden, false); assert.equal(bodies[1].hidden, true);
host.setActive("hud"); assert.equal(bodies[0].hidden, true); assert.equal(bodies[1].hidden, false);
host.setActive("enemy"); assert.equal(bodies[0].hidden, false); assert.equal(bodies[1].hidden, true);
console.log("RightLabHost mutual exclusion smoke passed");
