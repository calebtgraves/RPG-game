import Biome from "./biome";

export default class DeepWater extends Biome {
  constructor() {
    super({
      name: "Deep Water",
      description: "Fathomless depths where no swimmer dares venture.",
      color: "#0a4a7a",
      nativeMobs: [],
    });
  }
}
