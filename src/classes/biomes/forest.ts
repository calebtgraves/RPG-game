import Biome from "./biome";

export default class Forest extends Biome {
  constructor() {
    super({
      name: "Forest",
      description: "Dense woodland filled with tall trees and wildlife.",
      color: "#228b22",
      nativeMobs: [
        // add native mobs here, e.g.:
        // { mob: Deer, weight: 40 },
        // { mob: Wolf, weight: 20 },
      ],
    });
  }
}
