import type { Action } from "./action"

const ExploreAction: Action = {
    id: "explore",
    getLabel: () => "Explore",
    description: "Search the area",
    canExecute: () => true,
    execute: (_ctx, target) => {
        return {
            success: true,
            message: `You explore the ${target.name}.`
        }
    }
}

export default ExploreAction
