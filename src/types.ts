import type Biome from "./classes/biomes/biome"

export type Stats = {
    strength: number
    speed: number
    smarts: number
    hitpoints: number
}

export type SpawnEntry = {
    mob: new (...args: any[]) => any
    weight: number
}

export type Tile = {
    biome: Biome
    x: number
    y: number
    landmassId?: number
    waterBodyId?: number
}

export type Landmass = {
    id: number
    name: string
    tiles: { x: number; y: number }[]
    isMainland: boolean
}

export type WaterBody = {
    id: number
    name: string
    tiles: { x: number; y: number }[]
    type: 'lake' | 'bay' | 'ocean'
}

export type BiomeConstructor = new () => Biome

export type BiomeEntry = {
    biome: BiomeConstructor
    weight: number
}