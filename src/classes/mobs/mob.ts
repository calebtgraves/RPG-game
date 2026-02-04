import type { Stats, Action } from "../../types"
import AttackAction from "../actions/attackAction"

export default abstract class Mob {
    name: string
    stats: Stats
    menuActions: Action[] = [AttackAction]

    constructor({ name, stats }: { name: string; stats: Stats }) {
        this.name = name
        this.stats = stats
    }
}
