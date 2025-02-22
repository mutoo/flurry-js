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

const stats = {};
export function statsLog(label, value, logRate = 1) {
  if (Math.random() < logRate) {
    return;
  }

  if (!stats[label]) {
    stats[label] = {
      min: Infinity,
      max: -Infinity,
      sum: 0,
      avg: 0,
      count: 0,
    };
  }

  stats[label].min = Math.min(stats[label].min, value);
  stats[label].max = Math.max(stats[label].max, value);
  stats[label].sum += value;
  stats[label].avg = stats[label].sum / stats[label].count;
  stats[label].count++;

  console.log(label, value, stats[label]);
}
