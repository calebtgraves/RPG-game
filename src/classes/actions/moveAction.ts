import type { Action, ActionContext, ActionResult } from '../../types'

const MoveAction: Action = {
    id: 'move',
    getLabel: () => 'Move',
    description: 'Move to an adjacent tile',
    canExecute: (_ctx: ActionContext, _target: any): boolean => true,
    execute: (_ctx: ActionContext, _target: any): ActionResult => {
        return {
            success: true,
            message: 'Choose a direction to move.',
        }
    },
}

export default MoveAction
