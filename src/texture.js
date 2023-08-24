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

let firstTime = true;
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

export function createTexture(gl) {
  const texture = gl.createTexture();
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
  return texture;
}
