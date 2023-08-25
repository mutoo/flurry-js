export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomBell(scale) {
  return (1 - (Math.random() + Math.random() + Math.random()) / 1.5) * scale;
}
