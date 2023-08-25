export const vertexShaderSource = `
attribute vec3 a_position;
attribute vec4 a_color;
attribute vec2 a_texCoord;

uniform mat4 u_mvpMatrix;

varying vec2 v_texCoord;
varying vec4 v_color;

void main() {
    gl_Position = u_mvpMatrix * vec4(a_position, 1.0);

    v_texCoord = a_texCoord;
    v_color = a_color;
}
`;

export const fragmentShaderSource = `
precision mediump float;

uniform sampler2D u_image;

varying vec2 v_texCoord;
varying vec4 v_color;

void main() {
    float alpha = texture2D(u_image, v_texCoord).a;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha) * v_color;
}
`;

export function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createShaderProgram(gl) {
  // compile shaders
  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(
    gl,
    fragmentShaderSource,
    gl.FRAGMENT_SHADER
  );
  // create program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(program)
    );
  }

  gl.useProgram(program);

  const uniforms = {
    mvpMatrix: gl.getUniformLocation(program, "u_mvpMatrix"),
    image: gl.getUniformLocation(program, "u_image"),
  };
  const attribs = {
    position: gl.getAttribLocation(program, "a_position"),
    color: gl.getAttribLocation(program, "a_color"),
    texCoord: gl.getAttribLocation(program, "a_texCoord"),
  };

  return {
    program,
    uniforms,
    attribs,
  };
}
