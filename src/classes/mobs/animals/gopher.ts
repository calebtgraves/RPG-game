import Mob from "../mob";

export default class Gopher extends Mob {
  constructor() {
    super({
      name: "Gopher",
      stats: {
        strength: 2,
        speed: 5,
        smarts: 1,
        hitpoints: 3,
      },
    });
  }
}
