import Biome from "./biome";

export default class Mountains extends Biome {
  constructor() {
    super({
      name: "Mountains",
      description: "A rugged terrain with high peaks and steep cliffs.",
      color: "#888888",
      nativeMobs: [
        // add native mobs here, e.g.:
        // { mob: MountainGoat, weight: 40 },
      ],
    });
  }
}
