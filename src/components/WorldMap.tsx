import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "preact/hooks";
import type World from "../classes/world";
import DeepWater from "../classes/biomes/deepWater";

const TILE_SIZE = 17;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

const DEFAULT_SIZE = { width: 600, height: 600 };
const MIN_SIZE = 200;

type Props = {
  world: World;
  playerPos: { x: number; y: number };
  seenTiles: Set<string>;
  onMove: (x: number, y: number) => void;
  initialSize?: { width: number; height: number };
  onResize?: (width: number, height: number) => void;
  devMode?: boolean;
};

export default function WorldMap({ world, playerPos, seenTiles, onMove, initialSize, onResize, devMode = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  // Initialize offset to center on player
  const [offset, setOffset] = useState(() => {
    const tileSize = TILE_SIZE; // zoom is 1 initially
    const canvasW = initialSize?.width ?? DEFAULT_SIZE.width;
    const canvasH = initialSize?.height ?? DEFAULT_SIZE.height;
    return {
      x: canvasW / 2 - (playerPos.x + 0.5) * tileSize,
      y: canvasH / 2 - (playerPos.y + 0.5) * tileSize,
    };
  });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [pinchStart, setPinchStart] = useState<{ dist: number; zoom: number; offset: { x: number; y: number }; center: { x: number; y: number } } | null>(null);
  const [containerSize, setContainerSize] = useState(initialSize ?? DEFAULT_SIZE);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const canvasWidth = containerSize.width;
  const canvasHeight = containerSize.height;

  const getTileSize = useCallback(() => TILE_SIZE * zoom, [zoom]);

  const isSeen = useCallback((x: number, y: number) => devMode || seenTiles.has(`${x},${y}`), [seenTiles, devMode]);

  const isAdjacent = useCallback(
    (x: number, y: number) => {
      const dx = Math.abs(x - playerPos.x);
      const dy = Math.abs(y - playerPos.y);
      if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return false;
      const tile = world.getTile(x, y);
      if (tile?.biome instanceof DeepWater) return false;
      return true;
    },
    [playerPos, world]
  );

  const screenToTile = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      // Account for CSS scaling - canvas may be displayed smaller than its internal size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (screenX - rect.left) * scaleX;
      const y = (screenY - rect.top) * scaleY;
      const tileSize = getTileSize();
      const tileX = Math.floor((x - offset.x) / tileSize);
      const tileY = Math.floor((y - offset.y) / tileSize);
      if (tileX < 0 || tileX >= world.width || tileY < 0 || tileY >= world.height) {
        return null;
      }
      return { x: tileX, y: tileY };
    },
    [offset, getTileSize, world.width, world.height]
  );

  // Render canvas (useLayoutEffect prevents white flash during resize)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tileSize = getTileSize();

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y][x];
        const screenX = Math.floor(offset.x + x * tileSize);
        const screenY = Math.floor(offset.y + y * tileSize);
        const drawSize = Math.ceil(tileSize) + 1; // +1 to ensure overlap

        // Skip tiles outside viewport
        if (
          screenX + drawSize < 0 ||
          screenX > canvas.width ||
          screenY + drawSize < 0 ||
          screenY > canvas.height
        ) {
          continue;
        }

        const seen = isSeen(x, y);

        if (!seen) {
          ctx.fillStyle = "#2a2a2a";
        } else {
          ctx.fillStyle = tile.biome.color;
        }

        ctx.fillRect(screenX, screenY, drawSize, drawSize);
      }
    }

    // Draw hover outline (white)
    if (hoveredTile) {
      const hoverScreenX = offset.x + hoveredTile.x * tileSize;
      const hoverScreenY = offset.y + hoveredTile.y * tileSize;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(hoverScreenX, hoverScreenY, tileSize, tileSize);
    }

    // Highlight adjacent tiles (yellow, but not if hovered)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (isAdjacent(nx, ny)) {
          const isHovered = hoveredTile && hoveredTile.x === nx && hoveredTile.y === ny;
          if (!isHovered) {
            const adjScreenX = offset.x + nx * tileSize;
            const adjScreenY = offset.y + ny * tileSize;
            ctx.strokeStyle = "rgba(255, 204, 0, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(adjScreenX + 1, adjScreenY + 1, tileSize - 2, tileSize - 2);
          }
        }
      }
    }

    // Draw player
    const playerScreenX = offset.x + (playerPos.x + 0.5) * tileSize;
    const playerScreenY = offset.y + (playerPos.y + 0.5) * tileSize;
    const playerRadius = tileSize * 0.3;

    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4444";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [world, playerPos, seenTiles, offset, zoom, hoveredTile, getTileSize, isSeen, isAdjacent, canvasWidth, canvasHeight]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

      const scale = newZoom / zoom;
      const newOffsetX = mouseX - (mouseX - offset.x) * scale;
      const newOffsetY = mouseY - (mouseY - offset.y) * scale;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [zoom, offset]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === 0) {
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        setHasDragged(false);
      }
    },
    [offset]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (dragStart) {
        const dx = e.clientX - offset.x - dragStart.x;
        const dy = e.clientY - offset.y - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          setHasDragged(true);
        }
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        setHoveredTile(null);
        setTooltip(null);
      } else {
        const tilePos = screenToTile(e.clientX, e.clientY);
        setHoveredTile(tilePos);
        if (tilePos) {
          const tile = world.getTile(tilePos.x, tilePos.y);
          const seen = isSeen(tilePos.x, tilePos.y);
          if (tile) {
            const rect = canvas.getBoundingClientRect();
            setTooltip({
              text: seen ? tile.biome.name : "???",
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }
        } else {
          setTooltip(null);
        }
      }
    },
    [dragStart, offset, screenToTile, world, isSeen]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (dragStart && !hasDragged) {
        // This was a click, not a drag
        const tilePos = screenToTile(e.clientX, e.clientY);
        if (tilePos && isAdjacent(tilePos.x, tilePos.y)) {
          onMove(tilePos.x, tilePos.y);
        }
      }
      setDragStart(null);
    },
    [dragStart, hasDragged, screenToTile, isAdjacent, onMove]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setDragStart(null);
    setHoveredTile(null);
    setTooltip(null);
  }, []);

  // Get distance between two touch points
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two touches (in canvas coordinates)
  const getTouchCenter = useCallback((touches: TouchList, rect: DOMRect, canvas: HTMLCanvasElement) => {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (touches.length < 2) {
      return {
        x: (touches[0].clientX - rect.left) * scaleX,
        y: (touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: ((touches[0].clientX + touches[1].clientX) / 2 - rect.left) * scaleX,
      y: ((touches[0].clientY + touches[1].clientY) / 2 - rect.top) * scaleY,
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 2) {
        // Pinch start
        const dist = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches, rect, canvas);
        setPinchStart({ dist, zoom, offset, center });
        setDragStart(null);
      } else if (e.touches.length === 1) {
        // Single touch - start drag (scale to canvas coordinates)
        const touch = e.touches[0];
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        setDragStart({ x: touchX - offset.x, y: touchY - offset.y });
        setHasDragged(false);
        setPinchStart(null);
      }
    },
    [offset, zoom, getTouchDistance, getTouchCenter]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 2 && pinchStart) {
        // Pinch zoom
        const dist = getTouchDistance(e.touches);
        const scale = dist / pinchStart.dist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.zoom * scale));

        const center = getTouchCenter(e.touches, rect, canvas);
        const zoomRatio = newZoom / pinchStart.zoom;
        const newOffsetX = center.x - (pinchStart.center.x - pinchStart.offset.x) * zoomRatio;
        const newOffsetY = center.y - (pinchStart.center.y - pinchStart.offset.y) * zoomRatio;

        setZoom(newZoom);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else if (e.touches.length === 1 && dragStart) {
        // Single touch drag (scale to canvas coordinates)
        const touch = e.touches[0];
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        const dx = touchX - offset.x - dragStart.x;
        const dy = touchY - offset.y - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          setHasDragged(true);
        }
        setOffset({ x: touchX - dragStart.x, y: touchY - dragStart.y });
      }
    },
    [dragStart, offset, pinchStart, getTouchDistance, getTouchCenter]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;

      if (e.touches.length === 0) {
        // All fingers lifted
        if (dragStart && !hasDragged && e.changedTouches.length === 1) {
          // This was a tap, not a drag
          const touch = e.changedTouches[0];
          const tilePos = screenToTile(touch.clientX, touch.clientY);
          if (tilePos && isAdjacent(tilePos.x, tilePos.y)) {
            onMove(tilePos.x, tilePos.y);
          }
        }
        setDragStart(null);
        setPinchStart(null);
      } else if (e.touches.length === 1 && canvas) {
        // One finger still down after pinch (scale to canvas coordinates)
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touch = e.touches[0];
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        setDragStart({ x: touchX - offset.x, y: touchY - offset.y });
        setPinchStart(null);
        setHasDragged(true); // Prevent tap after pinch
      }
    },
    [dragStart, hasDragged, screenToTile, isAdjacent, onMove, offset]
  );

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: containerSize.width,
        height: containerSize.height,
      });
    },
    [containerSize]
  );

  // Handle resize move (attached to window)
  useEffect(() => {
    if (!resizeStart) return;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(MIN_SIZE, resizeStart.width + deltaX);
      const newHeight = Math.max(MIN_SIZE, resizeStart.height + deltaY);

      // Adjust offset to keep the view centered on the same point
      const offsetAdjustX = (newWidth - containerSize.width) / 2;
      const offsetAdjustY = (newHeight - containerSize.height) / 2;

      setContainerSize({ width: newWidth, height: newHeight });
      setOffset(prev => ({ x: prev.x + offsetAdjustX, y: prev.y + offsetAdjustY }));
    };

    const handleResizeEnd = () => {
      if (resizeStart) {
        onResize?.(containerSize.width, containerSize.height);
      }
      setResizeStart(null);
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [resizeStart, onResize, containerSize]);

  return (
    <div
      ref={containerRef}
      class="world-map-container"
      style={{
        width: `${containerSize.width}px`,
        height: `${containerSize.height}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        class="world-map-canvas"
        width={canvasWidth}
        height={canvasHeight}
      />
      {tooltip && (
        <div
          class="world-map-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 30}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}
      <div class="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}>+</button>
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}>-</button>
      </div>
      <div
        class="resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
