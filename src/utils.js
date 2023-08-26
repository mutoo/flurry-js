export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomBell(scale) {
  return (1 - (Math.random() + Math.random() + Math.random()) / 1.5) * scale;
}

export function fastDist2D(x, y) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const mn = Math.min(ax, ay);
  return ax + ay - (mn >> 1) - (mn >> 2) + (mn >> 4);
}