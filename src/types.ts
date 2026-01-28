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
}

export type BiomeConstructor = new () => Biome

export type BiomeEntry = {
    biome: BiomeConstructor
    weight: number
}