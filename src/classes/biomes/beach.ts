import Biome from "./biome";

export default class Beach extends Biome {
  constructor() {
    super({
      name: "Beach",
      description: "Sandy shores where land meets water.",
      color: "#c2b280",
      nativeMobs: [
        // add native mobs here, e.g.:
        // { mob: Crab, weight: 50 },
      ],
    });
  }
}
