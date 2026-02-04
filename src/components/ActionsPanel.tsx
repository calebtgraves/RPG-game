import { useRef, useEffect } from "preact/hooks"
import type { JSX } from "preact"
import type { Action } from "../types"

type ActionEntry = {
    action: Action
    target: any
}

type Props = {
    actions: ActionEntry[]
    onExecute: (action: Action, target: any) => void
    history: string[]
    style?: JSX.CSSProperties
}

export default function ActionsPanel({ actions, onExecute, history, style }: Props) {
    const historyEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [history])

    return (
        <div class="actions-panel" style={style}>
            <div class="action-history">
                {history.map((message, i) => (
                    <div key={i} class="history-entry">
                        {message}
                    </div>
                ))}
                <div ref={historyEndRef} />
            </div>
            <div class="actions-list">
                {actions.length === 0 ? (
                    <div class="no-actions">No actions available</div>
                ) : (
                    actions.map(({ action, target }) => (
                        <button
                            key={`${action.id}-${target.name}`}
                            class="action-button"
                            onClick={() => onExecute(action, target)}
                            title={action.description}
                        >
                            {action.getLabel(target)}
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}
