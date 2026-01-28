import { useMemo, useState, useCallback } from "preact/hooks";
import World from "./classes/world";
import Plains from "./classes/biomes/plains";
import Mountains from "./classes/biomes/mountains";
import Forest from "./classes/biomes/forest";
import DeepWater from "./classes/biomes/deepWater";
import "./app.css";

export function App() {
  const world = useMemo(
    () =>
      new World({
        width: 30,
        height: 30,
        biomes: [
          { biome: Plains, weight: 50 },
          { biome: Mountains, weight: 15 },
          { biome: Forest, weight: 35 },
        ],
        hasOcean: true,
        lakeCount: 4,
      }),
    [],
  );

  const [playerPos, setPlayerPos] = useState(() => world.findSpawnPoint());
  const [seenTiles, setSeenTiles] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Mark tiles around spawn as seen
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height) {
          initial.add(`${nx},${ny}`);
        }
      }
    }
    return initial;
  });

  const isVisible = useCallback(
    (x: number, y: number) => {
      return (
        Math.abs(x - playerPos.x) <= 1 && Math.abs(y - playerPos.y) <= 1
      );
    },
    [playerPos],
  );

  const isSeen = useCallback((x: number, y: number) => seenTiles.has(`${x},${y}`), [seenTiles]);

  const isAdjacent = useCallback(
    (x: number, y: number) => {
      const dx = Math.abs(x - playerPos.x);
      const dy = Math.abs(y - playerPos.y);
      if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return false;

      // Can't move onto deep water
      const tile = world.getTile(x, y);
      if (tile?.biome instanceof DeepWater) return false;

      return true;
    },
    [playerPos, world],
  );

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (!isAdjacent(x, y)) return;

      setPlayerPos({ x, y });
      setSeenTiles((prev) => {
        const next = new Set(prev);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < world.width && ny >= 0 && ny < world.height) {
              next.add(`${nx},${ny}`);
            }
          }
        }
        return next;
      });
    },
    [isAdjacent, world.width, world.height],
  );

  return (
    <div>
      <div class="world-grid">
        {world.tiles.map((row, y) => (
          <div key={y} class="world-row">
            {row.map((tile, x) => {
              const visible = isVisible(x, y);
              const seen = isSeen(x, y);
              const adjacent = isAdjacent(x, y);
              const isPlayer = x === playerPos.x && y === playerPos.y;

              return (
                <div
                  key={x}
                  class={`world-tile${!seen ? " fog" : ""}${seen && !visible ? " fog-seen" : ""}${adjacent ? " adjacent" : ""}${isPlayer ? " player" : ""}`}
                  data-tooltip={seen ? tile.biome.name : "???"}
                  style={{ backgroundColor: seen ? tile.biome.color : "#1a1a2e" }}
                  onClick={() => handleTileClick(x, y)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
