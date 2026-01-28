import Biome from "./biome";

export default class MagicalLake extends Biome {
  constructor() {
    super({
      name: "Magical Lake",
      description:
        "A mystical body of water hidden deep within the forest, shimmering with arcane energy.",
      color: "#c91ea4",
      nativeMobs: [
        // add native mobs here, e.g.:
        // { mob: Fairy, weight: 50 },
      ],
    });
  }
}
