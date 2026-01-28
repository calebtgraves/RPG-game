import type { SpawnEntry } from "../../types"

export default abstract class Biome {
    name: string
    description: string
    color: string
    nativeMobs: SpawnEntry[]

    constructor({ name, description, color, nativeMobs }: { name: string; description: string; color: string; nativeMobs: SpawnEntry[] }) {
        this.name = name
        this.description = description
        this.color = color
        this.nativeMobs = nativeMobs
    }

    getRandomMob(): SpawnEntry["mob"] {
        const totalWeight = this.nativeMobs.reduce((sum, entry) => sum + entry.weight, 0)
        let random = Math.random() * totalWeight

        for (const entry of this.nativeMobs) {
            random -= entry.weight
            if (random <= 0) return entry.mob
        }
        return this.nativeMobs[0].mob
    }
}