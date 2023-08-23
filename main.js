const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

// change the canvas size when the window is resized
window.addEventListener(
  "resize",
  function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  },
  false
);

// setup
// get 3d context
const gl = canvas.getContext("webgl");

// create a texture for smoke particles
const smallTextureArray = new Uint8Array(32 * 32);
const bigTextureArray = new Uint8Array(256 * 256 * 2); // * 2 for mipmaps

function smoothTexture() {
  const filter = new Uint8Array(32 * 32);
  for (let i = 1; i < 31; i++) {
    for (let j = 1; j < 31; j++) {
      let t = smallTextureArray[i * 32 + j] * 4;
      t += smallTextureArray[(i - 1) * 32 + j];
      t += smallTextureArray[(i + 1) * 32 + j];
      t += smallTextureArray[i * 32 + (j - 1)];
      t += smallTextureArray[i * 32 + (j + 1)];
      t /= 8.0;
      filter[i * 32 + j] = t;
    }
  }
  for (let i = 1; i < 31; i++) {
    for (let j = 1; j < 31; j++) {
      smallTextureArray[i * 32 + j] = filter[i * 32 + j];
    }
  }
}

// add some randomness to texture data
function speckleTexture() {
  for (let i = 2; i < 30; i++) {
    for (let j = 2; j < 30; j++) {
      let speck = 1;
      while (speck <= 32 && Math.random() < 0.5) {
        const t = Math.min(255, smallTextureArray[i * 32 + j] + speck);
        smallTextureArray[i * 32 + j] = t;
        speck += speck;
      }
      speck = 1;
      while (speck <= 32 && Math.random() < 0.5) {
        const t = Math.max(0, smallTextureArray[i * 32 + j] - speck);
        smallTextureArray[i * 32 + j] = t;
        speck += speck;
      }
    }
  }
}

var firstTime = true;
function makeSmallTexture() {
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      const r = Math.sqrt((i - 15.5) * (i - 15.5) + (j - 15.5) * (j - 15.5));
      let t = 0;
      if (r <= 15.0) {
        t = 255.0 * Math.cos((r * Math.PI) / 31.0);
      }
      if (!firstTime) {
        t = Math.min(
          255,
          (t + smallTextureArray[i * 32 + j] + smallTextureArray[i * 32 + j]) /
            3
        );
      }
      smallTextureArray[i * 32 + j] = t;
    }
  }
  firstTime = false;
  speckleTexture();
  smoothTexture();
  smoothTexture();
}

function copySmallTextureToBigTexture(k, l) {
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      bigTextureArray[(i + k) * 256 * 2 + (j + l) * 2] =
        smallTextureArray[i * 32 + j];
      bigTextureArray[(i + k) * 256 * 2 + (j + l) * 2 + 1] =
        smallTextureArray[i * 32 + j];
    }
  }
}

function averageLastAndFirstTextures() {
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      const t =
        (smallTextureArray[i * 32 + j] + bigTextureArray[i * 256 * 2 + j * 2]) /
        2;
      smallTextureArray[i * 32 + j] = Math.min(255, t);
    }
  }
}

function makeTexture() {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i == 7 && j == 7) {
        averageLastAndFirstTextures();
      } else {
        makeSmallTexture();
      }
      copySmallTextureToBigTexture(i * 32, j * 32);
    }
  }
}

makeTexture();

var texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.LUMINANCE_ALPHA,
  256,
  256,
  0,
  gl.LUMINANCE_ALPHA,
  gl.UNSIGNED_BYTE,
  bigTextureArray
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(
  gl.TEXTURE_2D,
  gl.TEXTURE_MIN_FILTER,
  gl.LINEAR_MIPMAP_NEAREST
);
gl.generateMipmap(gl.TEXTURE_2D);

// create shaders and draw above texture
const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    v_texCoord = a_texCoord;
}
`;
// create fragment shader
const fragmentShaderSource = `
precision mediump float;

uniform sampler2D u_image;

varying vec2 v_texCoord;

void main() {
    vec4 texColor = texture2D(u_image, v_texCoord);
    gl_FragColor = vec4(texColor.aaa, 1.0);
    // gl_FragColor = vec4(v_texCoord, 0.0, 1.0);
}
`;
// compile shaders
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
// create program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);
// create position buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// set a rectangle the same size as the canva
const positions = [
  0,
  0,
  canvas.width,
  0,
  0,
  canvas.height,
  0,
  canvas.height,
  canvas.width,
  0,
  canvas.width,
  canvas.height,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
// create texture buffer
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
const texCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
// create position attribute
const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
// create texture attribute
const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
gl.enableVertexAttribArray(texCoordAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
// create resolution uniform
const resolutionUniformLocation = gl.getUniformLocation(
  program,
  "u_resolution"
);
// create texture uniform
const imageLocation = gl.getUniformLocation(program, "u_image");

let lastTime;
function main() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000.0;

  update(dt);
  render();

  lastTime = now;
  requestAnimationFrame(main);
}

main();

function update(dt) {}

function render() {
  // clear the screen
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // draw a triangle
  gl.clear(gl.COLOR_BUFFER_BIT);

  // draw
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(imageLocation, 0);
  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
