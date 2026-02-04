import type { Action } from "./action"

const AttackAction: Action = {
    id: "attack",
    getLabel: (target) => `Attack ${target.name}`,
    description: "Attack this creature",
    canExecute: (_ctx, target) => target.stats.hitpoints > 0,
    execute: (ctx, target) => {
        const damage = Math.max(1, ctx.player.stats.strength - target.stats.strength + Math.floor(Math.random() * 3))
        target.stats.hitpoints -= damage

        if (target.stats.hitpoints <= 0) {
            return {
                success: true,
                message: `You strike the ${target.name} for ${damage} damage! The ${target.name} has been defeated!`
            }
        }

        return {
            success: true,
            message: `You strike the ${target.name} for ${damage} damage! (${target.stats.hitpoints} HP remaining)`
        }
    }
}

export default AttackAction
