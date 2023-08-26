import {fastDist2D, random, randomBell} from "./utils.js";
import {
  create as mat4,
  multiply,
} from "./lib/gl-matrix/mat4.js";

const NUM_SMOKE_PARTICLES = 3600;
const incohesion = 0.07;
const streamSpeed = 450.0;
const streamSize = 25000;
const colorIncoherence = 0.15;
const streamExpansion = 8000;
const gravity = 1500000.0;

export class SmokeParticle {
  constructor() {
    this.color = [0.0, 0.0, 0.0, 0.0];
    this.position = [0.0, 0.0, 0.0];
    this.oldPosition = [0.0, 0.0, 0.0];
    this.delta = [0.0, 0.0, 0.0];
    this.dead = false;
    this.startTime = 0;
    this.liveTime = 0;
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

    const width = (streamSize + 2.5 * streamExpansion) * camera.width / camera.height;

    let count = 0;
    for (let i = 0; i < NUM_SMOKE_PARTICLES; i += 4) {
      for (let k = 0; k < 4; k++) {
        const p = this.p[i + k];
        if (p.dead) {
          continue;
        }
        const pWidth = (streamSize + p.liveTime * streamExpansion) * camera.width / camera.height;
        if (pWidth > width) {
          p.dead = true;
          continue;
        }
        const x = p.position[0];
        const y = p.position[1];
        const z = p.position[2];
        const dx = p.delta[0];
        const dy = p.delta[1];
        const rdx = -dy;
        const rdy = dx;
        const dist = fastDist2D(dx, dy);
        const w = Math.max(1, pWidth / (z + 2000));
        const scale = !dist ? 0 : (w / dist);
        const dxs = dx * scale * 2;
        const dys = dy * scale * 2;
        const rdxs = rdx * scale / 2;
        const rdys = rdy * scale / 2;
        const rdxos = rdx * scale / 3;
        const rdyos = rdy * scale / 3;

        const x0 = x + dxs + rdxs;
        const y0 = y + dys + rdys;
        const z0 = z;
        const x1 = x + dxs - rdxs;
        const y1 = y + dys - rdys;
        const z1 = z;
        const x2 = x - dxs + rdxos;
        const y2 = y - dys + rdyos;
        const z2 = z;
        const x3 = x - dxs - rdxos;
        const y3 = y - dys - rdyos;
        const z3 = z;

        const cm = 1.375 - pWidth / width;
        const c0 = p.color[0] * cm;
        const c1 = p.color[1] * cm;
        const c2 = p.color[2] * cm;
        const c3 = p.color[3] * cm;
        const animFrame = p.animFrame;
        const u0 = (animFrame & 7) / 8;
        const v0 = (animFrame >> 3) / 8;
        const u1 = u0 + 1 / 8;
        const v1 = v0 + 1 / 8;

        vertices.push(x0, y0, z0, c0, c1, c2, c3, u0, v0);
        vertices.push(x1, y1, z1, c0, c1, c2, c3, u0, v1);
        vertices.push(x2, y2, z2, c0, c1, c2, c3, u1, v0);
        vertices.push(x2, y2, z2, c0, c1, c2, c3, u1, v0);
        vertices.push(x1, y1, z1, c0, c1, c2, c3, u0, v1);
        vertices.push(x3, y3, z3, c0, c1, c2, c3, u1, v1);
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
      while (timeElapsed - this.lastParticleTime >= 1.0 / 121.0) {
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
          this.p[this.n + this.sub].startTime = timeElapsed;
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

        this.lastParticleTime += 1 / 121;
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
        const p = this.p[i + k];
        let dx, dy, dz;
        let f;
        let rsquared;
        let mag;
        let deltax;
        let deltay;
        let deltaz;

        if (p.dead) {
          continue;
        }

        deltax = p.delta[0];
        deltay = p.delta[1];
        deltaz = p.delta[2];

        for (j = 0; j < this.numStreams; j++) {
          dx = p.position[0] - this.sparks[j].position[0];
          dy = p.position[1] - this.sparks[j].position[1];
          dz = p.position[2] - this.sparks[j].position[2];
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
          p.dead = true;
          continue;
        }
        // update the position
        p.delta[0] = deltax;
        p.delta[1] = deltay;
        p.delta[2] = deltaz;
        for (j = 0; j < 3; j++) {
          p.oldPosition[j] = p.position[j];
          p.position[j] += p.delta[j] * dt;
        }
        // update animation frame
        p.animFrame++;
        if (p.animFrame >= 64) {
          p.animFrame = 0;
        }
        // update live time
        p.liveTime = timeElapsed - p.startTime;
      }
    }
  }
}
