import {createTexture} from "./texture.js";
import {createShaderProgram} from "./shader.js";
import {create as mat4, ortho, lookAt} from "./lib/gl-matrix/mat4.js";
import {Star} from "./star.js";
import {Spark} from "./spark.js";
import {Smoke} from "./smoke.js";

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

window.addEventListener(
  "resize",
  function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  },
  false
);

const gl = canvas.getContext("webgl");
const texture = createTexture(gl);
const shader = createShaderProgram(gl);

const projection = mat4();
ortho(projection, -1000, 1000, -1000, 1000, -2000, 2000);
const view = mat4();
lookAt(view, [0, 0, 1000], [0, 0, 0], [0, 1, 0]);
const camera = {
  projection,
  view,
};

const star = new Star();
star.init(gl, shader, texture);

const sparks = [];
for (let i = 0; i < 12; i++) {
  const spark = new Spark((1800 * (i + 1)) / 13);
  spark.init(gl, shader, texture);
  sparks.push(spark);
}

const smoke = new Smoke(star, sparks, 8);
smoke.init(gl, shader, texture);

function update(dt, timeElapsed) {
  star.update(dt, timeElapsed);
  sparks.forEach((spark) => spark.update(dt, timeElapsed));
  smoke.drag = Math.pow(0.9965, dt * 85);
  smoke.update(dt, timeElapsed);
}

function render(gl) {
  camera.width = canvas.width;
  camera.height = canvas.height;

  // clear the screen
  gl.clearColor(0.0, 0.0, 0.0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // draw scene
  star.draw(gl, camera);
  sparks.forEach((spark) => spark.draw(gl, camera));
  smoke.draw(gl, camera);
}

let lastTime = 0;
let timeElapsed = 0;

function main() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000.0;
  timeElapsed += dt;

  update(dt, timeElapsed);
  render(gl);

  lastTime = now;
  requestAnimationFrame(main);
}

main();
