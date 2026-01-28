import type { Stats } from "../../types"

export default abstract class Mob {
    name: string
    stats: Stats

    constructor({ name, stats }: { name: string; stats: Stats }) {
        this.name = name
        this.stats = stats
    }
}