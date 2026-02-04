import { useMemo, useState, useCallback, useEffect } from "preact/hooks";
import World from "./classes/world";
import Plains from "./classes/biomes/plains";
import Mountains from "./classes/biomes/mountains";
import Forest from "./classes/biomes/forest";
import WorldMap from "./components/WorldMap";
import ActionsPanel from "./components/ActionsPanel";
import Player from "./classes/player";
import type Mob from "./classes/mobs/mob";
import type { Action } from "./types";
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
        mainlandSize: 30,
      }),
    [],
  );

  const player = useMemo(() => new Player("Hero"), []);

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
  const [nearbyMobs, setNearbyMobs] = useState<Mob[]>([]);
  const [actionHistory, setActionHistory] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(200, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const currentTile = world.getTile(playerPos.x, playerPos.y)!;

  const availableActions = useMemo(() => {
    const actions: Array<{ action: Action; target: any }> = [];

    // Biome actions
    for (const action of currentTile.biome.menuActions) {
      actions.push({ action, target: currentTile.biome });
    }

    // Mob actions
    for (const mob of nearbyMobs) {
      if (mob.stats.hitpoints > 0) {
        for (const action of mob.menuActions) {
          actions.push({ action, target: mob });
        }
      }
    }

    return actions;
  }, [currentTile, nearbyMobs]);

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

      // Spawn mobs on the new tile
      const tile = world.getTile(x, y);
      if (tile && tile.biome.nativeMobs.length > 0 && Math.random() < 0.3) {
        const MobClass = tile.biome.getRandomMob();
        const mob = new MobClass();
        setNearbyMobs([mob]);
        setActionHistory((prev) => [...prev, `A wild ${mob.name} appears!`]);
      } else {
        setNearbyMobs([]);
      }
    },
    [world],
  );

  const handleActionExecute = useCallback(
    (action: Action, target: any) => {
      const ctx = {
        player,
        currentTile,
        world,
        nearbyMobs,
      };

      if (!action.canExecute(ctx, target)) {
        setActionHistory((prev) => [...prev, "Cannot perform this action right now."]);
        return;
      }

      const result = action.execute(ctx, target);
      setActionHistory((prev) => [...prev, result.message]);

      // Remove dead mobs from nearby
      setNearbyMobs((mobs) => mobs.filter((m) => m.stats.hitpoints > 0));
    },
    [player, currentTile, world, nearbyMobs],
  );

  return (
    <div class={`game-container ${isResizing ? "resizing" : ""}`}>
      <WorldMap
        world={world}
        playerPos={playerPos}
        seenTiles={seenTiles}
        onMove={handleMove}
        devMode={devMode}
      />
      <div
        class="resize-divider"
        onMouseDown={() => setIsResizing(true)}
      />
      <ActionsPanel
        actions={availableActions}
        onExecute={handleActionExecute}
        history={actionHistory}
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
      />
    </div>
  );
}
