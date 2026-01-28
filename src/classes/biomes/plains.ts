import Bird from "../mobs/animals/bird";
import Gopher from "../mobs/animals/gopher";
import Biome from "./biome";

export default class Plains extends Biome {
  constructor() {
    super({
      name: "Plains",
      description:
        "A vast expanse of flat land with tall grasses and few trees.",
      color: "#7ec850",
      nativeMobs: [
        { mob: Gopher, weight: 50 },
        { mob: Bird, weight: 50 },
        // add more native mobs here, e.g.:
        // { mob: Skeleton, weight: 10 },
      ],
    });
  }
}
