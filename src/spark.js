export class Spark {
  constructor() {
    this.position = [0.0, 0.0, 0.0];
    this.mystery = 0;
    this.delta = [0.0, 0.0, 0.0];
    this.color = [0.0, 0.0, 0.0, 0.0];
  }

  init(s) {
    for (let i = 0; i < 3; i++) {
      s.position[i] = random(-100, 200);
    }
  }
}
