import Biome from "./biome";

export default class Water extends Biome {
  constructor() {
    super({
      name: "Water",
      description: "Deep blue waters, either vast ocean or tranquil lake.",
      color: "#1e90ff",
      nativeMobs: [
        // add native mobs here, e.g.:
        // { mob: Fish, weight: 50 },
      ],
    });
  }
}
