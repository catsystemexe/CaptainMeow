import type { SpriteBackgroundLayer } from "./BackgroundLayerTypes";
import { clamp01, resolveParallaxOffset, wrappedTileOrigins } from "./backgroundLayerMath";

export type SpriteTextureInfo = { id: string; url: string; state: "loading" | "ready" | "error"; width: number; height: number; generation: number };

type CacheEntry = {
  url: string;
  tex: WebGLTexture;
  state: "loading" | "ready" | "error";
  w: number;
  h: number;
  generation: number;
  warned?: boolean;
};

export class SpriteBackgroundLayerRenderer {
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private uLogic: WebGLUniformLocation;
  private uPos: WebGLUniformLocation;
  private uSize: WebGLUniformLocation;
  private uOpacity: WebGLUniformLocation;
  private uTex: WebGLUniformLocation;
  private cache = new Map<string, CacheEntry>();
  private generation = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.prog = this.createProgram();
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error("SpriteBackgroundLayerRenderer VAO/VBO allocation failed");
    this.vao = vao;
    this.vbo = vbo;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(this.prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const uLogic = gl.getUniformLocation(this.prog, "uLogic");
    const uPos = gl.getUniformLocation(this.prog, "uPos");
    const uSize = gl.getUniformLocation(this.prog, "uSize");
    const uOpacity = gl.getUniformLocation(this.prog, "uOpacity");
    const uTex = gl.getUniformLocation(this.prog, "uTex");
    if (!uLogic || !uPos || !uSize || !uOpacity || !uTex) throw new Error("SpriteBackgroundLayerRenderer uniform missing");
    this.uLogic = uLogic; this.uPos = uPos; this.uSize = uSize; this.uOpacity = uOpacity; this.uTex = uTex;
  }

  draw(layer: SpriteBackgroundLayer, args: { logicW: number; logicH: number; scrollX: number; scrollY: number }): void {
    const entry = this.ensureTexture(layer);
    if (entry.state !== "ready") {
      if (entry.state === "error" && !entry.warned) {
        console.warn(`[BGR] sprite background texture failed: ${entry.url}`);
        entry.warned = true;
      }
      return;
    }
    const gl = this.gl;
    const offset = resolveParallaxOffset(layer, { x: args.scrollX, y: args.scrollY });
    const xs = layer.repeat.x ? wrappedTileOrigins(offset.x, entry.w, args.logicW, 1) : [offset.x];
    const ys = layer.repeat.y ? wrappedTileOrigins(offset.y, entry.h, args.logicH, 1) : [offset.y];
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, entry.tex);
    gl.uniform1i(this.uTex, 0);
    gl.uniform2f(this.uLogic, args.logicW, args.logicH);
    gl.uniform2f(this.uSize, entry.w, entry.h);
    gl.uniform1f(this.uOpacity, clamp01(layer.opacity, 1));
    gl.enable(gl.BLEND);
    if (layer.blend === "additive") gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const y of ys) for (const x of xs) {
      gl.uniform2f(this.uPos, x + entry.w / 2, y + entry.h / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
  }

  getTextureInfo(layerId: string): SpriteTextureInfo | null {
    const entry = this.cache.get(layerId);
    return entry ? { id: layerId, url: entry.url, state: entry.state, width: entry.w, height: entry.h, generation: entry.generation } : null;
  }

  getTextureInfoSnapshot(): Record<string, SpriteTextureInfo> {
    const out: Record<string, SpriteTextureInfo> = {};
    for (const id of this.cache.keys()) {
      const info = this.getTextureInfo(id);
      if (info) out[id] = info;
    }
    return out;
  }

  retainLayerIds(ids: Set<string>): void {
    for (const [id, entry] of this.cache) {
      if (!ids.has(id)) {
        this.gl.deleteTexture(entry.tex);
        this.cache.delete(id);
      }
    }
  }

  dispose(): void {
    for (const entry of this.cache.values()) this.gl.deleteTexture(entry.tex);
    this.cache.clear();
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.prog);
  }

  private ensureTexture(layer: SpriteBackgroundLayer): CacheEntry {
    const existing = this.cache.get(layer.id);
    if (existing?.url === layer.texture.url) return existing;
    if (existing) this.gl.deleteTexture(existing.tex);
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Sprite background texture allocation failed");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, layer.repeat.x ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, layer.repeat.y ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    const entry: CacheEntry = { url: layer.texture.url, tex, state: "loading", w: 1, h: 1, generation: ++this.generation };
    this.cache.set(layer.id, entry);
    this.loadImage(entry);
    return entry;
  }

  private loadImage(entry: CacheEntry): void {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const current = [...this.cache.values()].find((candidate) => candidate === entry);
      if (!current) return;
      const gl = this.gl;
      entry.w = img.naturalWidth || 1;
      entry.h = img.naturalHeight || 1;
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null);
      entry.state = "ready";
    };
    img.onerror = () => { entry.state = "error"; };
    img.src = entry.url;
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const vs = `#version 300 es
      in vec2 aPos; uniform vec2 uLogic; uniform vec2 uPos; uniform vec2 uSize; out vec2 vUv;
      void main(){ vec2 p = uPos + (aPos - vec2(0.5)) * uSize; vUv = aPos; gl_Position = vec4((p.x/uLogic.x)*2.0-1.0, 1.0-(p.y/uLogic.y)*2.0, 0.0, 1.0); }`;
    const fs = `#version 300 es
      precision mediump float; uniform sampler2D uTex; uniform float uOpacity; in vec2 vUv; out vec4 outColor;
      void main(){ vec4 c = texture(uTex, vUv); outColor = vec4(c.rgb, c.a * uOpacity); }`;
    const compile = (type: number, src: string) => { const s = gl.createShader(type); if (!s) throw new Error("shader allocation failed"); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed"); return s; };
    const prog = gl.createProgram(); if (!prog) throw new Error("program allocation failed");
    const v = compile(gl.VERTEX_SHADER, vs); const f = compile(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog); gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "program link failed");
    return prog;
  }
}
