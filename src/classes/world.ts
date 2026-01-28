import type { Tile, BiomeConstructor, BiomeEntry } from "../types"
import Water from "./biomes/water"
import DeepWater from "./biomes/deepWater"
import Beach from "./biomes/beach"
import Forest from "./biomes/forest"
import MagicalLake from "./biomes/magicalLake"
import Plains from "./biomes/plains"

export default class World {
    width: number
    height: number
    tiles: Tile[][]
    availableBiomes: BiomeEntry[]

    constructor({
        width,
        height,
        biomes,
        hasOcean = false,
        lakeCount = 0,
    }: {
        width: number
        height: number
        biomes: BiomeEntry[]
        hasOcean?: boolean
        lakeCount?: number
    }) {
        this.width = width
        this.height = height
        this.availableBiomes = biomes
        this.tiles = this.generate({ hasOcean, lakeCount })
    }

    private generate({ hasOcean, lakeCount }: { hasOcean: boolean; lakeCount: number }): Tile[][] {
        // Initialize empty grid
        const grid: (Tile | null)[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => null)
        )

        // Step 1: Generate ocean around edges if enabled
        if (hasOcean) {
            this.generateOcean(grid)
        }

        // Step 2: Generate small lakes (1-4 tiles each)
        for (let i = 0; i < lakeCount; i++) {
            this.generateLake(grid)
        }

        // Step 3: Surround all water with beach
        this.surroundWaterWithBeach(grid)

        // Step 4: Seed random starting points for other biomes
        const seedCount = Math.max(3, Math.floor((this.width * this.height) / 20))
        for (let i = 0; i < seedCount; i++) {
            const x = Math.floor(Math.random() * this.width)
            const y = Math.floor(Math.random() * this.height)
            if (!grid[y][x]) {
                const BiomeClass = this.randomBiome()
                grid[y][x] = { biome: new BiomeClass(), x, y }
            }
        }

        // Step 5: Fill remaining tiles by growing from neighbors
        let emptyTiles = this.getEmptyTiles(grid)
        while (emptyTiles.length > 0) {
            emptyTiles.sort(() => Math.random() - 0.5)

            for (const { x, y } of emptyTiles) {
                const neighbor = this.getRandomFilledNeighbor(grid, x, y)
                if (neighbor) {
                    // Don't spread water or beach during normal growth
                    if (neighbor.biome instanceof Water || neighbor.biome instanceof Beach) {
                        // Pick a random land biome instead
                        const BiomeClass = this.randomBiome()
                        grid[y][x] = { biome: new BiomeClass(), x, y }
                    } else {
                        const BiomeClass = neighbor.biome.constructor as BiomeConstructor
                        grid[y][x] = { biome: new BiomeClass(), x, y }
                    }
                }
            }

            const newEmptyTiles = this.getEmptyTiles(grid)
            if (newEmptyTiles.length === emptyTiles.length) {
                for (const { x, y } of newEmptyTiles) {
                    const BiomeClass = this.randomBiome()
                    grid[y][x] = { biome: new BiomeClass(), x, y }
                }
                break
            }
            emptyTiles = newEmptyTiles
        }

        // Step 6: Generate magical lakes in forest clearings
        this.generateMagicalLakes(grid as Tile[][])

        // Step 7: Convert fully surrounded water to deep water
        this.convertToDeepWater(grid as Tile[][])

        return grid as Tile[][]
    }

    private generateMagicalLakes(grid: Tile[][]): void {
        const directions = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]

        // Find all tiles completely surrounded by forest (all 8 neighbors)
        const candidates: { x: number; y: number }[] = []

        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                const tile = grid[y][x]
                // Skip if already water or beach
                if (tile.biome instanceof Water || tile.biome instanceof Beach) continue

                // Check if all 8 neighbors are forest
                const allForest = directions.every(([dx, dy]) => {
                    const neighbor = grid[y + dy][x + dx]
                    return neighbor.biome instanceof Forest
                })

                if (allForest) {
                    candidates.push({ x, y })
                }
            }
        }

        if (candidates.length > 0) {
            // Use a natural forest clearing
            const shuffled = candidates.sort(() => Math.random() - 0.5)
            const first = shuffled[0]
            grid[first.y][first.x] = { biome: new MagicalLake(), x: first.x, y: first.y }

            // Extremely rare chance for additional magical lakes (1%)
            for (let i = 1; i < shuffled.length; i++) {
                if (Math.random() < 0.01) {
                    const { x, y } = shuffled[i]
                    grid[y][x] = { biome: new MagicalLake(), x, y }
                }
            }
        } else {
            // No natural clearing - force spawn one and surround with forest
            this.forceSpawnMagicalLake(grid, directions)
        }
    }

    private convertToDeepWater(grid: Tile[][]): void {
        const directions = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = grid[y][x]
                if (!(tile.biome instanceof Water)) continue

                // Check if all 8 neighbors are water or edge
                const allWaterOrEdge = directions.every(([dx, dy]) => {
                    const nx = x + dx
                    const ny = y + dy
                    // Edge counts as "surrounded"
                    if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                        return true
                    }
                    const neighbor = grid[ny][nx]
                    return neighbor.biome instanceof Water || neighbor.biome instanceof DeepWater
                })

                if (allWaterOrEdge) {
                    grid[y][x] = { biome: new DeepWater(), x, y }
                }
            }
        }
    }

    private forceSpawnMagicalLake(grid: Tile[][], directions: number[][]): void {
        // Find a suitable inland tile (not water, beach, or too close to edge)
        const margin = 3
        const candidates: { x: number; y: number }[] = []

        for (let y = margin; y < this.height - margin; y++) {
            for (let x = margin; x < this.width - margin; x++) {
                const tile = grid[y][x]
                if (tile.biome instanceof Water || tile.biome instanceof Beach) continue
                candidates.push({ x, y })
            }
        }

        if (candidates.length === 0) return

        // Pick a random spot
        const spot = candidates[Math.floor(Math.random() * candidates.length)]

        // Place the magical lake
        grid[spot.y][spot.x] = { biome: new MagicalLake(), x: spot.x, y: spot.y }

        // Surround with forest
        for (const [dx, dy] of directions) {
            const nx = spot.x + dx
            const ny = spot.y + dy
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                const neighbor = grid[ny][nx]
                // Only replace non-water/beach tiles
                if (!(neighbor.biome instanceof Water) && !(neighbor.biome instanceof Beach)) {
                    grid[ny][nx] = { biome: new Forest(), x: nx, y: ny }
                }
            }
        }
    }

    private generateOcean(grid: (Tile | null)[][]): void {
        // Create a noise-like map for ocean depth variation
        const oceanDepthMap: number[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => 0)
        )

        // Base ocean depth varies by position using simple noise
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Base depth with random variation (1-4 tiles from edge)
                const baseDepth = 1 + Math.random() * 3
                // Add sine wave variation for more organic shapes
                const waveX = Math.sin(x * 0.5) * 1.5
                const waveY = Math.sin(y * 0.4) * 1.5
                oceanDepthMap[y][x] = baseDepth + waveX + waveY + (Math.random() - 0.5) * 2
            }
        }

        // Generate bays/inlets that cut into the land
        const bayCount = 2 + Math.floor(Math.random() * 4)
        for (let i = 0; i < bayCount; i++) {
            this.generateBay(oceanDepthMap)
        }

        // Apply the ocean based on depth map
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const distFromEdge = Math.min(x, y, this.width - 1 - x, this.height - 1 - y)
                if (distFromEdge < oceanDepthMap[y][x]) {
                    grid[y][x] = { biome: new Water(), x, y }
                }
            }
        }

        // Generate small islands in large water areas
        this.generateIslands(grid)
    }

    private generateBay(depthMap: number[][]): void {
        // Pick a random edge to start the bay
        const edge = Math.floor(Math.random() * 4) // 0=top, 1=right, 2=bottom, 3=left
        let startX: number, startY: number, dirX: number, dirY: number

        switch (edge) {
            case 0: // top
                startX = 3 + Math.floor(Math.random() * (this.width - 6))
                startY = 0
                dirX = (Math.random() - 0.5) * 0.5
                dirY = 1
                break
            case 1: // right
                startX = this.width - 1
                startY = 3 + Math.floor(Math.random() * (this.height - 6))
                dirX = -1
                dirY = (Math.random() - 0.5) * 0.5
                break
            case 2: // bottom
                startX = 3 + Math.floor(Math.random() * (this.width - 6))
                startY = this.height - 1
                dirX = (Math.random() - 0.5) * 0.5
                dirY = -1
                break
            default: // left
                startX = 0
                startY = 3 + Math.floor(Math.random() * (this.height - 6))
                dirX = 1
                dirY = (Math.random() - 0.5) * 0.5
                break
        }

        // Extend the bay inland
        const bayLength = 3 + Math.floor(Math.random() * 6)
        const bayWidth = 1 + Math.floor(Math.random() * 2)
        let x = startX
        let y = startY

        for (let i = 0; i < bayLength; i++) {
            // Increase depth at this point and surrounding area
            for (let dy = -bayWidth; dy <= bayWidth; dy++) {
                for (let dx = -bayWidth; dx <= bayWidth; dx++) {
                    const nx = Math.round(x + dx)
                    const ny = Math.round(y + dy)
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        const dist = Math.sqrt(dx * dx + dy * dy)
                        const depthBoost = Math.max(0, (bayLength - i) * 0.8 - dist)
                        depthMap[ny][nx] = Math.max(depthMap[ny][nx], depthMap[ny][nx] + depthBoost)
                    }
                }
            }

            // Move along the bay with some wobble
            x += dirX + (Math.random() - 0.5) * 0.5
            y += dirY + (Math.random() - 0.5) * 0.5
        }
    }

    private generateIslands(grid: (Tile | null)[][]): void {
        // Find large contiguous water areas and possibly add islands
        const visited: boolean[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => false)
        )

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (visited[y][x] || !(grid[y][x]?.biome instanceof Water)) continue

                // Flood fill to find water area
                const waterTiles: { x: number; y: number }[] = []
                const queue: { x: number; y: number }[] = [{ x, y }]
                visited[y][x] = true

                while (queue.length > 0) {
                    const current = queue.shift()!
                    waterTiles.push(current)

                    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
                    for (const [dx, dy] of directions) {
                        const nx = current.x + dx
                        const ny = current.y + dy
                        if (
                            nx >= 0 && nx < this.width &&
                            ny >= 0 && ny < this.height &&
                            !visited[ny][nx] &&
                            grid[ny][nx]?.biome instanceof Water
                        ) {
                            visited[ny][nx] = true
                            queue.push({ x: nx, y: ny })
                        }
                    }
                }

                // If water area is large enough (>40 tiles), maybe add an island
                if (waterTiles.length > 40 && Math.random() < 0.7) {
                    this.placeIsland(grid, waterTiles)
                }
            }
        }
    }

    private placeIsland(grid: (Tile | null)[][], waterTiles: { x: number; y: number }[]): void {
        // Find center-ish tiles (not at the edge of the water)
        const margin = 2
        const innerTiles = waterTiles.filter(t => {
            const nearEdge = waterTiles.filter(w =>
                Math.abs(w.x - t.x) <= margin && Math.abs(w.y - t.y) <= margin
            ).length
            return nearEdge >= (margin * 2 + 1) * (margin * 2 + 1) * 0.7
        })

        if (innerTiles.length < 4) return

        // Pick a random center point for the island
        const center = innerTiles[Math.floor(Math.random() * innerTiles.length)]

        // Create island (8-20 tiles) - needs to be large enough for interior biomes after beach
        const islandSize = 8 + Math.floor(Math.random() * 13)
        const islandTiles: { x: number; y: number }[] = [center]

        // Clear the center water tile (will be filled by biome growth later)
        grid[center.y][center.x] = null

        // Grow island organically
        for (let i = 1; i < islandSize && islandTiles.length < islandSize; i++) {
            const candidates: { x: number; y: number }[] = []
            for (const tile of islandTiles) {
                const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
                for (const [dx, dy] of directions) {
                    const nx = tile.x + dx
                    const ny = tile.y + dy
                    if (
                        waterTiles.some(w => w.x === nx && w.y === ny) &&
                        !islandTiles.some(t => t.x === nx && t.y === ny)
                    ) {
                        candidates.push({ x: nx, y: ny })
                    }
                }
            }
            if (candidates.length === 0) break
            const next = candidates[Math.floor(Math.random() * candidates.length)]
            grid[next.y][next.x] = null // Clear water for island tile
            islandTiles.push(next)
        }
    }

    private generateLake(grid: (Tile | null)[][]): void {
        // Find a random empty spot away from edges
        const margin = 3
        let attempts = 50
        while (attempts > 0) {
            const x = margin + Math.floor(Math.random() * (this.width - margin * 2))
            const y = margin + Math.floor(Math.random() * (this.height - margin * 2))

            if (!grid[y][x]) {
                // Create lake of 1-4 tiles
                const lakeSize = 1 + Math.floor(Math.random() * 4)
                const lakeTiles: { x: number; y: number }[] = [{ x, y }]
                grid[y][x] = { biome: new Water(), x, y }

                // Grow lake by adding adjacent tiles
                for (let i = 1; i < lakeSize; i++) {
                    const candidates: { x: number; y: number }[] = []
                    for (const tile of lakeTiles) {
                        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
                        for (const [dx, dy] of directions) {
                            const nx = tile.x + dx
                            const ny = tile.y + dy
                            if (
                                nx >= margin && nx < this.width - margin &&
                                ny >= margin && ny < this.height - margin &&
                                !grid[ny][nx] &&
                                !lakeTiles.some(t => t.x === nx && t.y === ny)
                            ) {
                                candidates.push({ x: nx, y: ny })
                            }
                        }
                    }
                    if (candidates.length === 0) break
                    const next = candidates[Math.floor(Math.random() * candidates.length)]
                    grid[next.y][next.x] = { biome: new Water(), x: next.x, y: next.y }
                    lakeTiles.push(next)
                }
                return
            }
            attempts--
        }
    }

    private surroundWaterWithBeach(grid: (Tile | null)[][]): void {
        const beachPositions: { x: number; y: number }[] = []

        // Find all empty tiles adjacent to water
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (grid[y][x]) continue // Skip filled tiles

                const directions = [
                    [0, -1], [0, 1], [-1, 0], [1, 0],
                    [-1, -1], [1, -1], [-1, 1], [1, 1],
                ]

                for (const [dx, dy] of directions) {
                    const nx = x + dx
                    const ny = y + dy
                    if (
                        nx >= 0 && nx < this.width &&
                        ny >= 0 && ny < this.height &&
                        grid[ny][nx]?.biome instanceof Water
                    ) {
                        beachPositions.push({ x, y })
                        break
                    }
                }
            }
        }

        // Place beaches
        for (const { x, y } of beachPositions) {
            grid[y][x] = { biome: new Beach(), x, y }
        }
    }

    private randomBiome(): BiomeConstructor {
        const totalWeight = this.availableBiomes.reduce((sum, entry) => sum + entry.weight, 0)
        let random = Math.random() * totalWeight

        for (const entry of this.availableBiomes) {
            random -= entry.weight
            if (random <= 0) return entry.biome
        }
        return this.availableBiomes[0].biome
    }

    private getEmptyTiles(grid: (Tile | null)[][]): { x: number; y: number }[] {
        const empty: { x: number; y: number }[] = []
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!grid[y][x]) empty.push({ x, y })
            }
        }
        return empty
    }

    private getRandomFilledNeighbor(grid: (Tile | null)[][], x: number, y: number): Tile | null {
        const neighbors: Tile[] = []
        const directions = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]

        for (const [dx, dy] of directions) {
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                const tile = grid[ny][nx]
                if (tile) neighbors.push(tile)
            }
        }

        if (neighbors.length === 0) return null
        return neighbors[Math.floor(Math.random() * neighbors.length)]
    }

    getTile(x: number, y: number): Tile | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null
        return this.tiles[y][x]
    }

    findSpawnPoint(): { x: number; y: number } {
        // Find a plains or beach tile near the center of the map
        const centerX = Math.floor(this.width / 2)
        const centerY = Math.floor(this.height / 2)

        // Search in expanding squares from center
        for (let radius = 0; radius < Math.max(this.width, this.height); radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
                    const x = centerX + dx
                    const y = centerY + dy
                    const tile = this.getTile(x, y)
                    if (tile && (tile.biome instanceof Plains || tile.biome instanceof Beach)) {
                        return { x, y }
                    }
                }
            }
        }

        // Fallback to center
        return { x: centerX, y: centerY }
    }
}
