import type { StarfieldConfig } from "../../../bg/v2/BackgroundV2Types";
import { generateBackgroundV2Stars } from "../../../bg/v2/BackgroundV2Starfield";

/** Draws the V2 environment before track content. Stars are pure logical screen-space quads. */
export class BackgroundV2StarfieldRenderer {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  draw(config: StarfieldConfig | undefined, args: { logicW: number; logicH: number }, program: WebGLProgram, vao: WebGLVertexArrayObject, uniforms: { logic: WebGLUniformLocation; pos: WebGLUniformLocation; size: WebGLUniformLocation; color: WebGLUniformLocation }): void {
    if (!config) return;
    const stars = generateBackgroundV2Stars(config, args.logicW, args.logicH);
    const gl = this.gl;
    gl.useProgram(program); gl.bindVertexArray(vao); gl.uniform2f(uniforms.logic, args.logicW, args.logicH);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const star of stars) {
      gl.uniform4f(uniforms.color, star.brightness, star.brightness, Math.min(1, star.brightness + 0.12), star.brightness);
      gl.uniform2f(uniforms.pos, star.x, star.y); gl.uniform2f(uniforms.size, star.size, star.size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);
  }
}
