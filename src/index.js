import * as dat from "./lib/dat.gui/dat.gui.module.js";
import { createTexture } from "./texture.js";
import { createShaderProgram } from "./shader.js";
import { create as mat4, ortho, lookAt } from "./lib/gl-matrix/mat4.js";
import { Star } from "./star.js";
import { Spark } from "./spark.js";
import { Smoke } from "./smoke.js";

// create canvas for rendering
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

// setup webgl
const gl = canvas.getContext("webgl");
const texture = createTexture(gl);
const shader = createShaderProgram(gl);

// setup camera
const projection = mat4();
ortho(projection, -1000, 1000, -1000, 1000, -2000, 2000);
const view = mat4();
lookAt(view, [0, 0, 1000], [0, 0, 0], [0, 1, 0]);
const camera = {
  projection,
  view,
};

// the star: a core that emits particles
const star = new Star();
star.init(gl, shader, texture);

// the sparks: target of the particles, also attracts the particles when they are close
const sparks = [];
for (let i = 0; i < 12; i++) {
  const spark = new Spark((1800 * (i + 1)) / 13);
  spark.init(gl, shader, texture);
  sparks.push(spark);
}

// the smoke: particles that are emitted from the star
const smoke = new Smoke(star, sparks, 8);
smoke.init(gl, shader, texture);

// dat.gui controls
const params = { streams: 8, displayStar: false, displaySparks: false };

const gui = new dat.GUI({ name: "flurry-js" });
gui.add(params, "streams", 1, 12, 1);
gui.add(params, "displayStar");
gui.add(params, "displaySparks");

// github links
const linksFolder = gui.addFolder("Links");
linksFolder.add({ github: () => window.open("https://github.com/mutoo/flurry-js") }, "github");

window.addEventListener(
  "resize",
  function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  },
  false
);

function update(dt, timeElapsed) {
  star.update(dt, timeElapsed);
  sparks.forEach((spark) => spark.update(dt, timeElapsed));
  smoke.numStreams = params.streams;
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
  if (params.displayStar) {
    star.draw(gl, camera);
  }
  if (params.displaySparks) {
    sparks.forEach((spark) => spark.draw(gl, camera));
  }
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
