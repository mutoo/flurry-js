import { random } from './utils.js';
import { MAX_ANGLES, BIG_MYSTERY, SERAPH_DISTANCE } from './constant.js';
import { create as mat4, fromRotation, multiply, fromTranslation } from './lib/gl-matrix/mat4.js';
import { fromValues as v3, transformMat4 } from './lib/gl-matrix/vec3.js';

export class Star {
  constructor() {
    this.position = [0, 0, 0];
    this.rotSpeed = 0;
    this.mystery = 0;
    this.ate = false;
    this.shader = null;
    this.vertexBuffer = null;
    this.texture = null;
  }

  init(gl, shader, texture) {
    for (let i = 0; i < 3; i++) {
      this.position[i] = random(-10000.0, 10000.0);
    }
    this.rotSpeed = random(0.4, 0.9);
    this.mystery = random(0.0, 10.0);

    this.shader = shader;
    this.texture = texture;
    this.initBuffers(gl);
  }

  initBuffers(gl) {
    // vertices include position(3), color(3) and uv(2)
    const vertices = [];
    const c = 0.0635;
    const spikes = 30;
    for (let k = 0; k < spikes; k++) {
      const size = 3 + Math.random() * 150;
      const p0 = v3(-3.0, 0, 0);
      const p1 = v3(0, size, 0);
      const p2 = v3(3.0, 0, 0);
      const rotMat = mat4();
      const a = Math.random() * 360 * Math.PI / 180;
      fromRotation(rotMat, a, [0, 0, 1]);
      const rP0 = v3(0, 0, 0);
      const rP1 = v3(0, 0, 0);
      const rP2 = v3(0, 0, 0);
      transformMat4(rP0, p0, rotMat);
      transformMat4(rP1, p1, rotMat);
      transformMat4(rP2, p2, rotMat);
      const r = random(0.125, 1);
      const g = random(0.125, 1);
      const b = random(0.125, 1);
      vertices.push(
        rP0[0], rP0[1], rP0[2], r, g, b, 0, 0,
        rP1[0], rP1[1], rP1[2], r, g, b, 0.5, 1,
        rP2[0], rP2[1], rP2[2], r, g, b, 1, 0,
      );
    }

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  }

  draw(gl, camera) {
    gl.useProgram(this.shader.program);

    const mMatrix = mat4();
    fromTranslation(mMatrix, this.position);
    const mvMatrix = mat4();
    multiply(mvMatrix, camera.view, mMatrix);
    const mvpMatrix = mat4();
    multiply(mvpMatrix, camera.projection, mvMatrix);

    // apply mvp matrix
    gl.uniformMatrix4fv(
      this.shader.uniforms.mvpMatrix,
      false,
      mvpMatrix,
    );

    // apply texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.shader.uniforms.image, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(
      this.shader.attribs.position,
      3,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 8,
      0,
    );
    gl.vertexAttribPointer(
      this.shader.attribs.color,
      3,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 8,
      Float32Array.BYTES_PER_ELEMENT * 3,
    );
    gl.vertexAttribPointer(
      this.shader.attribs.texCoord,
      2,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 8,
      Float32Array.BYTES_PER_ELEMENT * 6,
    );
    gl.enableVertexAttribArray(this.shader.attribs.position);
    gl.enableVertexAttribArray(this.shader.attribs.color);
    gl.enableVertexAttribArray(this.shader.attribs.texCoord);
    gl.drawArrays(gl.TRIANGLES, 0, 3 * 30);
  }

  update(dt, timeElapsed) {
    const rotationsPerSecond =
      ((2.0 * Math.PI * 12.0) / MAX_ANGLES) * this.rotSpeed;
    const thisAngle = timeElapsed * rotationsPerSecond;
    let cf =
      (Math.cos(7.0 * thisAngle) +
        Math.cos(3.0 * thisAngle) +
        Math.cos(13.0 * thisAngle)) /
      6.0 +
      0.75;
    const thisPointInRadians = (2.0 * Math.PI * this.mystery) / BIG_MYSTERY;
    let tmpX1,
      tmpY1,
      tmpZ1,
      tmpX2,
      tmpY2,
      tmpZ2,
      tmpX3,
      tmpY3,
      tmpZ3,
      tmpX4,
      tmpY4,
      tmpZ4;
    let rotation, cr, sr;

    this.ate = false;

    this.position[0] =
      250.0 * cf * Math.cos(11.0 * (thisPointInRadians + 3.0 * thisAngle));
    this.position[1] =
      250.0 * cf * Math.sin(12.0 * (thisPointInRadians + 4.0 * thisAngle));
    this.position[2] =
      250.0 * Math.cos(23.0 * (thisPointInRadians + 12.0 * thisAngle));

    rotation = thisAngle * 0.501 + (5.01 * this.mystery) / BIG_MYSTERY;
    cr = Math.cos(rotation);
    sr = Math.sin(rotation);
    tmpX1 = this.position[0] * cr - this.position[1] * sr;
    tmpY1 = this.position[1] * cr + this.position[0] * sr;
    tmpZ1 = this.position[2];

    tmpX2 = tmpX1 * cr - tmpZ1 * sr;
    tmpY2 = tmpY1;
    tmpZ2 = tmpZ1 * cr + tmpX1 * sr;

    tmpX3 = tmpX2;
    tmpY3 = tmpY2 * cr - tmpZ2 * sr;
    tmpZ3 = tmpZ2 * cr + tmpY2 * sr + SERAPH_DISTANCE;

    rotation = thisAngle * 2.501 + (85.01 * this.mystery) / BIG_MYSTERY;
    cr = Math.cos(rotation);
    sr = Math.sin(rotation);
    tmpX4 = tmpX3 * cr - tmpY3 * sr;
    tmpY4 = tmpY3 * cr + tmpX3 * sr;
    tmpZ4 = tmpZ3;

    this.position[0] = tmpX4;
    this.position[1] = tmpY4;
    this.position[2] = tmpZ4;
  }
}
