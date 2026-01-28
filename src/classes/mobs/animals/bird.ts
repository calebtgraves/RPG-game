import Mob from "../mob";

export default class Bird extends Mob {
  constructor() {
    super({
      name: "Bird",
      stats: {
        strength: 1,
        speed: 5,
        smarts: 3,
        hitpoints: 2,
      },
    });
  }
}
