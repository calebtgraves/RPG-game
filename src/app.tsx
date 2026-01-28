import { useMemo, useState, useCallback } from "preact/hooks";
import World from "./classes/world";
import Plains from "./classes/biomes/plains";
import Mountains from "./classes/biomes/mountains";
import Forest from "./classes/biomes/forest";
import WorldMap from "./components/WorldMap";
import "./app.css";

const devMode = new URLSearchParams(window.location.search).has("dev");

export function App() {
  const world = useMemo(
    () =>
      new World({
        width: 90,
        height: 90,
        biomes: [
          { biome: Plains, weight: 50 },
          { biome: Mountains, weight: 15 },
          { biome: Forest, weight: 35 },
        ],
        hasOcean: true,
        lakeCount: 8,
        mainlandSize: 30, // Central mainland ~30x30, ocean with islands around it
      }),
    [],
  );

  const [playerPos, setPlayerPos] = useState(() => world.findSpawnPoint());
  const [seenTiles, setSeenTiles] = useState<Set<string>>(() => {
    const initial = new Set<string>();
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

  const handleMove = useCallback(
    (x: number, y: number) => {
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
    [world.width, world.height],
  );

  return (
    <WorldMap
      world={world}
      playerPos={playerPos}
      seenTiles={seenTiles}
      onMove={handleMove}
      devMode={devMode}
    />
  );
}
