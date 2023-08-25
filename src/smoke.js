import { SERAPH_DISTANCE, BIG_MYSTERY } from "./constant.js";
import { random, randomBell } from "./utils.js";
import {
  create as mat4,
  fromRotation,
  multiply,
  fromTranslation,
} from "./lib/gl-matrix/mat4.js";
import { fromValues as v3, transformMat4 } from "./lib/gl-matrix/vec3.js";

const NUM_SMOKE_PARTICLES = 3600;
const MAX_ANGLES = 16384;
const NOT_QUITE_DEAD = 3;
const intensity = 75000.0;
const incohesion = 0.07;
const streamSpeed = 450.0;
const streamSize = 25000;
const colorIncoherence = 0.15;
const streamExpansion = 200;
const gravity = 1500000.0;
export class SmokeParticle {
  constructor() {
    this.color = [0.0, 0.0, 0.0, 0.0];
    this.position = [0.0, 0.0, 0.0];
    this.oldPosition = [0.0, 0.0, 0.0];
    this.delta = [0.0, 0.0, 0.0];
    this.mystery = 0.0;
    this.dead = false;
    this.time = 0;
    this.animFrame = 0;
  }
}

export class Smoke {
  constructor(star, sparks, numStreams) {
    this.star = star;
    this.sparks = sparks;
    this.numStreams = numStreams;
    this.drag = 0.999;

    this.p = [];
    this.n = 0;
    this.sub = 0;
    this.lastParticleTime = 0;
    this.firstTime = true;
    this.frame = 0;
    this.old = [0.0, 0.0, 0.0];

    this.shader = null;
    this.vertexBuffer = null;
    this.texture = null;
  }

  init(gl, shader, texture) {
    this.n = 0;
    this.sub = 0;
    this.lastParticleTime = 0.25;
    this.firstTime = 1;
    this.frame = 0;
    for (let i = 0; i < 3; i++) {
      this.old[i] = random(-100.0, 100.0);
    }

    for (let i = 0; i < NUM_SMOKE_PARTICLES; i++) {
      const particle = new SmokeParticle();
      particle.dead = true;
      this.p.push(particle);
    }

    this.shader = shader;
    this.texture = texture;
    this.initBuffers(gl);
  }

  initBuffers(gl) {
    const vertices = [];
    this.vertexBuffer = gl.createBuffer();
  }

  draw(gl, camera) {
    gl.useProgram(this.shader.program);

    const mvpMatrix = mat4();
    multiply(mvpMatrix, camera.projection, camera.view);

    // apply mvp matrix
    gl.uniformMatrix4fv(this.shader.uniforms.mvpMatrix, false, mvpMatrix);

    // apply texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.shader.uniforms.image, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    const count = this.prepareBufferData(gl, camera);

    gl.vertexAttribPointer(
      this.shader.attribs.position,
      3,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 9,
      0
    );
    gl.vertexAttribPointer(
      this.shader.attribs.color,
      4,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 9,
      Float32Array.BYTES_PER_ELEMENT * 3
    );
    gl.vertexAttribPointer(
      this.shader.attribs.texCoord,
      2,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 9,
      Float32Array.BYTES_PER_ELEMENT * 7
    );
    gl.enableVertexAttribArray(this.shader.attribs.position);
    gl.enableVertexAttribArray(this.shader.attribs.color);
    gl.enableVertexAttribArray(this.shader.attribs.texCoord);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  prepareBufferData(gl, camera) {
    // vertices include position(3), color(4) and uv(2)
    const vertices = [];
    let count = 0;
    for (let i = 0; i < NUM_SMOKE_PARTICLES; i += 4) {
      for (let k = 0; k < 4; k++) {
        if (this.p[i + k].dead) {
          continue;
        }

        const size = 10;
        const x = this.p[i + k].position[0];
        const y = this.p[i + k].position[1];
        const z = this.p[i + k].position[2];
        const x0 = x - size;
        const y0 = y - size;
        const z0 = z;
        const x1 = x - size;
        const y1 = y + size;
        const z1 = z;
        const x2 = x + size;
        const y2 = y - size;
        const z2 = z;
        const x3 = x + size;
        const y3 = y + size;
        const z3 = z;

        const color = this.p[i + k].color;
        const animFrame = this.p[i + k].animFrame;
        const u0 = (animFrame & 7) / 8;
        const v0 = (animFrame >> 3) / 8;
        const u1 = u0 + 1 / 8;
        const v1 = v0 + 1 / 8;

        vertices.push(x0, y0, z0, ...color, u0, v0);
        vertices.push(x1, y1, z1, ...color, u0, v1);
        vertices.push(x2, y2, z2, ...color, u1, v0);
        vertices.push(x2, y2, z2, ...color, u1, v0);
        vertices.push(x1, y1, z1, ...color, u0, v1);
        vertices.push(x3, y3, z3, ...color, u1, v1);
        count += 6;
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    return count;
  }

  update(dt, timeElapsed) {
    let i, j, k;
    let sx = this.star.position[0];
    let sy = this.star.position[1];
    let sz = this.star.position[2];
    let frameRate;
    let frameRateModifier;

    this.frame++;

    if (!this.firstTime) {
      if (timeElapsed - this.lastParticleTime >= 1.0 / 121.0) {
        let dx, dy, dz, deltax, deltay, deltaz;
        let f;
        let rsquared;
        let mag;

        dx = this.old[0] - sx;
        dy = this.old[1] - sy;
        dz = this.old[2] - sz;
        mag = 5.0;
        deltax = dx * mag;
        deltay = dy * mag;
        deltaz = dz * mag;
        for (i = 0; i < this.numStreams; i++) {
          let streamSpeedCoherenceFactor;

          this.p[this.n + this.sub].delta[0] = deltax;
          this.p[this.n + this.sub].delta[1] = deltay;
          this.p[this.n + this.sub].delta[2] = deltaz;
          this.p[this.n + this.sub].position[0] = sx;
          this.p[this.n + this.sub].position[1] = sy;
          this.p[this.n + this.sub].position[2] = sz;
          this.p[this.n + this.sub].oldPosition[0] = sx;
          this.p[this.n + this.sub].oldPosition[1] = sy;
          this.p[this.n + this.sub].oldPosition[2] = sz;
          streamSpeedCoherenceFactor = Math.max(
            0,
            1 + randomBell(0.25 * incohesion)
          );
          dx = sx - this.sparks[i].position[0];
          dy = sy - this.sparks[i].position[1];
          dz = sz - this.sparks[i].position[2];
          rsquared = dx * dx + dy * dy + dz * dz;
          f = streamSpeed * streamSpeedCoherenceFactor;
          mag = f / Math.sqrt(rsquared);
          this.p[this.n + this.sub].delta[0] -= dx * mag;
          this.p[this.n + this.sub].delta[1] -= dy * mag;
          this.p[this.n + this.sub].delta[2] -= dz * mag;
          this.p[this.n + this.sub].color[0] =
            this.sparks[i].color[0] * (1 + randomBell(colorIncoherence));
          this.p[this.n + this.sub].color[1] =
            this.sparks[i].color[1] * (1 + randomBell(colorIncoherence));
          this.p[this.n + this.sub].color[2] =
            this.sparks[i].color[2] * (1 + randomBell(colorIncoherence));
          this.p[this.n + this.sub].color[3] =
            0.85 * (1 + randomBell(colorIncoherence));
          this.p[this.n + this.sub].time = timeElapsed;
          this.p[this.n + this.sub].dead = false;
          this.p[this.n + this.sub].animFrame = Math.floor(Math.random() * 64);

          this.sub++;
          if (this.sub === 4) {
            this.n += 4;
            this.sub = 0;
          }
          if (this.n >= NUM_SMOKE_PARTICLES) {
            this.n = 0;
            this.sub = 0;
          }
        }

        this.lastParticleTime = timeElapsed;
      }
    } else {
      this.lastParticleTime = timeElapsed;
      this.firstTime = false;
    }

    for (i = 0; i < 3; i++) {
      this.old[i] = this.star.position[i];
    }

    frameRate = 1 / dt;
    frameRateModifier = 42.5 / frameRate;

    for (i = 0; i < NUM_SMOKE_PARTICLES; i += 4) {
      for (k = 0; k < 4; k++) {
        let dx, dy, dz;
        let f;
        let rsquared;
        let mag;
        let deltax;
        let deltay;
        let deltaz;

        if (this.p[i + k].dead) {
          continue;
        }

        deltax = this.p[i + k].delta[0];
        deltay = this.p[i + k].delta[1];
        deltaz = this.p[i + k].delta[2];

        for (j = 0; j < this.numStreams; j++) {
          dx = this.p[i + k].position[0] - this.sparks[j].position[0];
          dy = this.p[i + k].position[1] - this.sparks[j].position[1];
          dz = this.p[i + k].position[2] - this.sparks[j].position[2];
          rsquared = dx * dx + dy * dy + dz * dz;

          f = (gravity / rsquared) * frameRateModifier;
          mag = f / Math.sqrt(rsquared);

          deltax -= dx * mag;
          deltay -= dy * mag;
          deltaz -= dz * mag;
        }

        // slow this particle down by drag
        deltax *= this.drag;
        deltay *= this.drag;
        deltaz *= this.drag;

        if (deltax * deltax + deltay * deltay + deltaz * deltaz >= 25000000.0) {
          this.p[i + k].dead = true;
          continue;
        }

        // update the position
        this.p[i + k].delta[0] = deltax;
        this.p[i + k].delta[1] = deltay;
        this.p[i + k].delta[2] = deltaz;
        for (j = 0; j < 3; j++) {
          this.p[i + k].oldPosition[j] = this.p[i + k].position[j];
          this.p[i + k].position[j] += this.p[i + k].delta[j] * dt;
        }
        // update animation frame
        this.p[i + k].animFrame++;
        if (this.p[i + k].animFrame >= 64) {
          this.p[i + k].animFrame = 0;
        }
      }
    }
  }
}
