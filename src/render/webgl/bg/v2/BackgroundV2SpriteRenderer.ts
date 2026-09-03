import { activeBackgroundResourceKeys, resolveBackgroundCommandTiles, type BackgroundSpriteDrawCommand, type BackgroundTextureResourceKey } from "./BackgroundV2RenderCommands";

type Resource = { url: string; texture: WebGLTexture; state: "loading" | "ready" | "error"; width: number; height: number; generation: number; warned?: boolean };
export type BackgroundV2TextureInfo = { resourceKey: string; url: string; state: Resource["state"]; width: number; height: number; generation: number };

/** WebGL owner for V2 asset resources. Per-instance repeat is CPU materialized. */
export class BackgroundV2SpriteRenderer {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private uLogic: WebGLUniformLocation;
  private uPos: WebGLUniformLocation;
  private uSize: WebGLUniformLocation;
  private uOpacity: WebGLUniformLocation;
  private uTexture: WebGLUniformLocation;
  private resources = new Map<BackgroundTextureResourceKey, Resource>();
  private generation = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = this.createProgram();
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error("BackgroundV2SpriteRenderer allocation failed");
    this.vao = vao; this.buffer = buffer;
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => { const value = gl.getUniformLocation(this.program, name); if (!value) throw new Error(`BackgroundV2SpriteRenderer uniform missing: ${name}`); return value; };
    this.uLogic = uniform("uLogic"); this.uPos = uniform("uPos"); this.uSize = uniform("uSize"); this.uOpacity = uniform("uOpacity"); this.uTexture = uniform("uTex");
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  draw(commands: readonly BackgroundSpriteDrawCommand[], args: { logicW: number; logicH: number }): void {
    for (const command of commands) {
      const resource = this.ensureResource(command.resourceKey, command.url);
      if (resource.state !== "ready") {
        if (resource.state === "error" && !resource.warned) { console.warn(`[BGR V2] texture failed: ${resource.url}`); resource.warned = true; }
        continue;
      }
      const tiles = resolveBackgroundCommandTiles(command, resource, args.logicW, args.logicH);
      if (!tiles.length) continue;
      const gl = this.gl;
      gl.useProgram(this.program); gl.bindVertexArray(this.vao); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, resource.texture);
      gl.uniform1i(this.uTexture, 0); gl.uniform2f(this.uLogic, args.logicW, args.logicH); gl.uniform1f(this.uOpacity, command.opacity);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, command.blend === "additive" ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      if (command.clip) {
        const height = Number.isFinite(command.clip.height) ? command.clip.height : args.logicH;
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.floor(command.clip.x), Math.floor(args.logicH - command.clip.y - height), Math.ceil(command.clip.width), Math.ceil(height));
      }
      for (const tile of tiles) {
        gl.uniform2f(this.uPos, tile.x + tile.width / 2, tile.y + tile.height / 2); gl.uniform2f(this.uSize, tile.width, tile.height); gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (command.clip) gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.BLEND); gl.bindTexture(gl.TEXTURE_2D, null); gl.bindVertexArray(null);
    }
  }

  retainResources(keys: Set<BackgroundTextureResourceKey>): void {
    for (const [key, resource] of this.resources) if (!keys.has(key)) { this.gl.deleteTexture(resource.texture); this.resources.delete(key); }
  }
  retainCommands(commands: readonly BackgroundSpriteDrawCommand[]): void { this.retainResources(activeBackgroundResourceKeys(commands)); }
  getTextureInfoSnapshot(): Record<string, BackgroundV2TextureInfo> {
    const snapshot: Record<string, BackgroundV2TextureInfo> = {};
    for (const [resourceKey, resource] of this.resources) snapshot[resourceKey] = { resourceKey, url: resource.url, state: resource.state, width: resource.width, height: resource.height, generation: resource.generation };
    return snapshot;
  }

  private ensureResource(key: string, url: string): Resource {
    const existing = this.resources.get(key); if (existing) return existing;
    const gl = this.gl; const texture = gl.createTexture(); if (!texture) throw new Error("Background V2 texture allocation failed");
    gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, null);
    const resource: Resource = { url, texture, state: "loading", width: 0, height: 0, generation: ++this.generation }; this.resources.set(key, resource);
    const image = new Image(); image.decoding = "async";
    image.onload = () => { if (this.resources.get(key) !== resource) return; resource.width = image.naturalWidth; resource.height = image.naturalHeight; gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); gl.bindTexture(gl.TEXTURE_2D, null); resource.state = "ready"; };
    image.onerror = () => { if (this.resources.get(key) === resource) resource.state = "error"; }; image.src = url;
    return resource;
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type); if (!shader) throw new Error("shader allocation failed"); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed"); return shader; };
    const vertex = compile(gl.VERTEX_SHADER, `#version 300 es\nin vec2 aPos; uniform vec2 uLogic,uPos,uSize; out vec2 vUv; void main(){vec2 p=uPos+(aPos-vec2(.5))*uSize;vUv=aPos;gl_Position=vec4((p.x/uLogic.x)*2.-1.,1.-(p.y/uLogic.y)*2.,0.,1.);}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es\nprecision mediump float; uniform sampler2D uTex; uniform float uOpacity; in vec2 vUv; out vec4 outColor; void main(){vec4 c=texture(uTex,vUv);outColor=vec4(c.rgb,c.a*uOpacity);}`);
    const program = gl.createProgram(); if (!program) throw new Error("program allocation failed"); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "program link failed"); return program;
  }
}
