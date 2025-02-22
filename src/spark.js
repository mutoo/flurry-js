import { MAX_ANGLES, BIG_MYSTERY } from "./constant.js";
import { random, statsLog } from "./utils.js";
import {
  create as mat4,
  fromRotation,
  fromXRotation,
  fromYRotation,
  fromZRotation,
  multiply,
  fromTranslation,
} from "./lib/gl-matrix/mat4.js";
import { fromValues as v3, transformMat4 } from "./lib/gl-matrix/vec3.js";

const fieldSpeed = 12;
const fieldRange = 1000.0;
const fieldCoherence = 0;

export class Spark {
  constructor(mystery) {
    this.position = [0.0, 0.0, 0.0];
    this.color = [0.0, 0.0, 0.0, 0.0];
    this.mystery = mystery;

    this.shader = null;
    this.vertexBuffer = null;
    this.texture = null;
  }

  init(gl, shader, texture) {
    for (let i = 0; i < 3; i++) {
      this.position[i] = random(-100, 200);
    }

    this.shader = shader;
    this.texture = texture;
    this.initBuffers(gl);
  }

  initBuffers(gl) {
    // vertices include position(3), color(3) and uv(2)
    const vertices = [];
    const c = 0.0625;
    const spikes = 12;
    for (let k = 0; k < spikes; k++) {
      const size = 2 + Math.random() * 15;
      const p0 = v3(-3.0, 0, 0);
      const p1 = v3(0, size, 0);
      const p2 = v3(3.0, 0, 0);
      const rotMat = mat4();
      const a = (Math.random() * 360 * Math.PI) / 180;
      fromRotation(rotMat, a, [0, 0, 1]);
      const rP0 = v3(0, 0, 0);
      const rP1 = v3(0, 0, 0);
      const rP2 = v3(0, 0, 0);
      transformMat4(rP0, p0, rotMat);
      transformMat4(rP1, p1, rotMat);
      transformMat4(rP2, p2, rotMat);
      vertices.push(
        rP0[0],
        rP0[1],
        rP0[2],
        1,
        1,
        1,
        0,
        0,
        rP1[0],
        rP1[1],
        rP1[2],
        1,
        1,
        1,
        0.5,
        1,
        rP2[0],
        rP2[1],
        rP2[2],
        1,
        1,
        1,
        1,
        0
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
    gl.uniformMatrix4fv(this.shader.uniforms.mvpMatrix, false, mvpMatrix);

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
      0
    );
    gl.vertexAttribPointer(
      this.shader.attribs.color,
      3,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 8,
      Float32Array.BYTES_PER_ELEMENT * 3
    );
    gl.vertexAttribPointer(
      this.shader.attribs.texCoord,
      2,
      gl.FLOAT,
      false,
      Float32Array.BYTES_PER_ELEMENT * 8,
      Float32Array.BYTES_PER_ELEMENT * 6
    );
    gl.enableVertexAttribArray(this.shader.attribs.position);
    gl.enableVertexAttribArray(this.shader.attribs.color);
    gl.enableVertexAttribArray(this.shader.attribs.texCoord);
    gl.drawArrays(gl.TRIANGLES, 0, 3 * 12);
  }

  update(dt, timeElapsed) {
    const rotationsPerSecond = (2.0 * Math.PI * fieldSpeed) / MAX_ANGLES;
    const thisAngle = timeElapsed * rotationsPerSecond;
    const cycleTime = 20; // rainbow mode

    const colorRot = (2.0 * Math.PI) / cycleTime;
    const redPhaseShift = 0.0;
    const greenPhaseShift = cycleTime / 3.0;
    const bluePhaseShift = (2.0 * cycleTime) / 3.0;
    const colorTime = timeElapsed;

    const baseRed =
      0.109375 * (Math.cos((colorTime + redPhaseShift) * colorRot) + 1);
    const baseGreen =
      0.109375 * (Math.cos((colorTime + greenPhaseShift) * colorRot) + 1);
    const baseBlue =
      0.109375 * (Math.cos((colorTime + bluePhaseShift) * colorRot) + 1);

    const cf =
      (Math.cos(7.0 * (timeElapsed * rotationsPerSecond)) +
        Math.cos(3.0 * (timeElapsed * rotationsPerSecond)) +
        Math.cos(13.0 * (timeElapsed * rotationsPerSecond))) /
        6.0 +
      2.0;
    const thisPointInRadians = (2.0 * Math.PI * this.mystery) / BIG_MYSTERY;

    this.color[0] =
      baseRed +
      0.0625 *
        (0.5 +
          Math.cos(15.0 * (thisPointInRadians + 3.0 * thisAngle)) +
          Math.sin(7.0 * (thisPointInRadians + thisAngle)));
    this.color[1] =
      baseGreen + 0.0625 * (0.5 + Math.sin(thisPointInRadians + thisAngle));
    this.color[2] =
      baseBlue +
      0.0625 * (0.5 + Math.cos(37.0 * (thisPointInRadians + thisAngle)));

    const x0 =
      fieldRange * cf * Math.cos(11.0 * (thisPointInRadians + 3.0 * thisAngle));
    const y0 =
      fieldRange * cf * Math.sin(12.0 * (thisPointInRadians + 4.0 * thisAngle));
    const z0 =
      fieldRange * Math.cos(23.0 * (thisPointInRadians + 12.0 * thisAngle));

    const rotation0 = thisAngle * 0.501 + (5.01 * this.mystery) / BIG_MYSTERY;
    const rotation1 = thisAngle * 2.501 + (85.01 * this.mystery) / BIG_MYSTERY;
    const rotZ0 = fromZRotation(mat4(), rotation0);
    const rotY0 = fromYRotation(mat4(), rotation0);
    const rotX0 = fromXRotation(mat4(), rotation0);
    const rotZ1 = fromZRotation(mat4(), rotation1);
    const rotAll = mat4();
    multiply(rotAll, rotZ0, rotY0);
    multiply(rotAll, rotAll, rotX0);
    multiply(rotAll, rotAll, rotZ1);
    const tmpV0 = v3(x0, y0, z0);
    transformMat4(tmpV0, tmpV0, rotAll);

    this.position[0] = tmpV0[0];
    this.position[1] = tmpV0[1];
    this.position[2] = tmpV0[2];

    // statsLog("spark.pos.x", this.position[0]);
    // statsLog("spark.pos.y", this.position[1]);
    // statsLog("spark.pos.z", this.position[2]);
  }
}
