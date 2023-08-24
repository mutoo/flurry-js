import { createTexture } from "./texture.js";
import { createShaderProgram } from "./shader.js";
import { create as mat4, ortho, lookAt } from "./lib/gl-matrix/mat4.js";
import { Star } from "./star.js";

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

function update(dt, timeElapsed) {
  star.update(dt, timeElapsed);
}

function render(gl) {
  // clear the screen
  gl.clearColor(0.0, 0.0, 0.0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  star.draw(gl, camera);
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
