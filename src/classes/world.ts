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
        mainlandSize,
    }: {
        width: number
        height: number
        biomes: BiomeEntry[]
        hasOcean?: boolean
        lakeCount?: number
        mainlandSize?: number // Size of the central mainland (defaults to map size if no ocean)
    }) {
        this.width = width
        this.height = height
        this.availableBiomes = biomes
        this.tiles = this.generate({ hasOcean, lakeCount, mainlandSize })
    }

    private generate({ hasOcean, lakeCount, mainlandSize }: { hasOcean: boolean; lakeCount: number; mainlandSize?: number }): Tile[][] {
        // Initialize empty grid
        const grid: (Tile | null)[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => null)
        )

        // Step 1: Generate ocean around edges if enabled
        if (hasOcean) {
            this.generateOcean(grid, mainlandSize)
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

    private generateOcean(grid: (Tile | null)[][], mainlandSize?: number): void {
        // Mainland size defaults to slightly smaller than map
        const landSize = mainlandSize ?? Math.min(this.width, this.height) - 5
        const centerX = this.width / 2
        const centerY = this.height / 2
        const halfLand = landSize / 2

        // Create a noise map for organic mainland edges
        const noiseMap: number[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => 0)
        )

        // Generate noise for organic edges
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Base noise with sine waves for organic shapes
                const waveX = Math.sin(x * 0.3) * 2 + Math.sin(x * 0.7) * 1.5
                const waveY = Math.sin(y * 0.25) * 2 + Math.sin(y * 0.6) * 1.5
                noiseMap[y][x] = waveX + waveY + (Math.random() - 0.5) * 3
            }
        }

        // Generate bays that cut into the mainland
        const bayCount = 2 + Math.floor(Math.random() * 3)
        for (let i = 0; i < bayCount; i++) {
            this.generateMainlandBay(noiseMap, centerX, centerY, halfLand)
        }

        // Place water outside the mainland zone
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Distance from center (using max for square-ish shape)
                const distX = Math.abs(x - centerX)
                const distY = Math.abs(y - centerY)

                // Use a blend of square and circular distance for natural shape
                const squareDist = Math.max(distX, distY)
                const circularDist = Math.sqrt(distX * distX + distY * distY)
                const dist = squareDist * 0.6 + circularDist * 0.4

                // Add noise for organic edges
                const noisyDist = dist - noiseMap[y][x]

                if (noisyDist > halfLand) {
                    grid[y][x] = { biome: new Water(), x, y }
                }
            }
        }

        // Generate small islands in the ocean
        this.generateIslands(grid)
    }

    private generateMainlandBay(noiseMap: number[][], centerX: number, centerY: number, halfLand: number): void {
        // Pick a random edge of the mainland to start the bay
        const angle = Math.random() * Math.PI * 2
        const startX = centerX + Math.cos(angle) * halfLand
        const startY = centerY + Math.sin(angle) * halfLand

        // Direction pointing inward toward center
        const dirX = (centerX - startX) / halfLand
        const dirY = (centerY - startY) / halfLand

        // Bay parameters
        const bayLength = 4 + Math.floor(Math.random() * 8)
        const bayWidth = 2 + Math.floor(Math.random() * 3)

        let x = startX
        let y = startY

        for (let i = 0; i < bayLength; i++) {
            // Reduce the noise value (makes it more likely to be water)
            for (let dy = -bayWidth; dy <= bayWidth; dy++) {
                for (let dx = -bayWidth; dx <= bayWidth; dx++) {
                    const nx = Math.round(x + dx)
                    const ny = Math.round(y + dy)
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        const dist = Math.sqrt(dx * dx + dy * dy)
                        const reduction = Math.max(0, (bayLength - i) * 0.8 - dist)
                        noiseMap[ny][nx] -= reduction
                    }
                }
            }

            // Move inward with some wobble
            x += dirX * 1.5 + (Math.random() - 0.5) * 0.8
            y += dirY * 1.5 + (Math.random() - 0.5) * 0.8
        }
    }

    private generateIslands(grid: (Tile | null)[][]): void {
        // Find large contiguous water areas and add islands
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

                // Generate a few islands in large water areas
                // 2-4 islands total: 1-2 large, 1-2 small
                if (waterTiles.length > 500) {
                    const largeIslandCount = 1 + Math.floor(Math.random() * 2) // 1-2 large islands
                    const tinyIslandCount = 1 + Math.floor(Math.random() * 2)  // 1-2 small islands

                    for (let i = 0; i < largeIslandCount; i++) {
                        this.placeIsland(grid, waterTiles, "large")
                    }
                    for (let i = 0; i < tinyIslandCount; i++) {
                        this.placeIsland(grid, waterTiles, "tiny")
                    }
                }
            }
        }
    }

    private placeIsland(grid: (Tile | null)[][], waterTiles: { x: number; y: number }[], sizeType: "tiny" | "large" = "large"): void {
        // Find tiles that are still water (not already used by another island)
        const availableWater = waterTiles.filter(t => grid[t.y][t.x]?.biome instanceof Water)
        const minRequired = sizeType === "large" ? 250 : 20
        if (availableWater.length < minRequired) return

        // Find inner tiles (not at the edge of the water area)
        const margin = sizeType === "large" ? 8 : 3
        const innerTiles = availableWater.filter(t => {
            const nearbyWater = availableWater.filter(w =>
                Math.abs(w.x - t.x) <= margin && Math.abs(w.y - t.y) <= margin
            ).length
            return nearbyWater >= (margin * 2 + 1) * (margin * 2 + 1) * 0.5
        })

        if (innerTiles.length < 4) return

        // Pick a random center point for the island
        const center = innerTiles[Math.floor(Math.random() * innerTiles.length)]

        // Island sizes based on type
        let islandSize: number
        if (sizeType === "tiny") {
            islandSize = 15 + Math.floor(Math.random() * 20)  // 15-34 tiles (small)
        } else {
            islandSize = 200 + Math.floor(Math.random() * 401) // 200-600 tiles (large)
        }

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
                    // Check if this tile is still water in the grid
                    if (
                        nx >= 0 && nx < this.width &&
                        ny >= 0 && ny < this.height &&
                        grid[ny][nx]?.biome instanceof Water &&
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
        // Find the largest landmass (mainland) using flood fill
        const visited: boolean[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => false)
        )

        let largestLandmass: { x: number; y: number }[] = []
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x]
                if (visited[y][x] || tile.biome instanceof Water || tile.biome instanceof DeepWater) continue

                // Flood fill to find this landmass
                const landmass: { x: number; y: number }[] = []
                const queue: { x: number; y: number }[] = [{ x, y }]
                visited[y][x] = true

                while (queue.length > 0) {
                    const current = queue.shift()!
                    landmass.push(current)

                    for (const [dx, dy] of directions) {
                        const nx = current.x + dx
                        const ny = current.y + dy
                        if (
                            nx >= 0 && nx < this.width &&
                            ny >= 0 && ny < this.height &&
                            !visited[ny][nx]
                        ) {
                            const neighborTile = this.tiles[ny][nx]
                            if (!(neighborTile.biome instanceof Water) && !(neighborTile.biome instanceof DeepWater)) {
                                visited[ny][nx] = true
                                queue.push({ x: nx, y: ny })
                            }
                        }
                    }
                }

                // Keep track of the largest landmass
                if (landmass.length > largestLandmass.length) {
                    largestLandmass = landmass
                }
            }
        }

        // From the mainland, find plains or beach tiles for spawning
        const candidates = largestLandmass.filter(({ x, y }) => {
            const tile = this.tiles[y][x]
            return tile.biome instanceof Plains || tile.biome instanceof Beach
        })

        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)]
        }

        // Fallback to any tile on the mainland
        if (largestLandmass.length > 0) {
            return largestLandmass[Math.floor(Math.random() * largestLandmass.length)]
        }

        // Final fallback to center
        return { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) }
    }
}
