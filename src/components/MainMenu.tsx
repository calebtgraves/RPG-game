import { useState } from "preact/hooks"
import { PLAYER_CLASSES } from "../playerClasses"
import type { PlayerClass } from "../playerClasses"

type Props = {
    onStart: (playerClass: PlayerClass) => void
}

type Phase = 'title' | 'class-select'

function StatBar({ label, fullLabel, value, max = 5 }: { label: string; fullLabel: string; value: number; max?: number }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div
            class="stat-row"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && <div class="stat-tooltip">{fullLabel}</div>}
            <span class="stat-label">{label}</span>
            <div class="stat-bar-track">
                {Array.from({ length: max }, (_, i) => (
                    <div key={i} class={`stat-bar-pip ${i < value ? 'filled' : ''}`} />
                ))}
            </div>
            <span class="stat-value">{value}</span>
        </div>
    )
}

export default function MainMenu({ onStart }: Props) {
    const [phase, setPhase] = useState<Phase>('title')
    const [selected, setSelected] = useState<PlayerClass | null>(null)

    if (phase === 'title') {
        return (
            <div class="main-menu">
                <div class="main-menu-content">
                    <h1 class="game-title">RPG</h1>
                    <p class="game-subtitle">A new adventure awaits.</p>
                    <button class="menu-button primary" onClick={() => setPhase('class-select')}>
                        Start Game
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div class="main-menu">
            <div class="class-select-content">
                <h2 class="class-select-title">Choose Your Class</h2>
                <div class="class-cards">
                    {PLAYER_CLASSES.map((cls) => (
                        <button
                            key={cls.id}
                            class={`class-card ${selected?.id === cls.id ? 'selected' : ''}`}
                            onClick={() => setSelected(cls)}
                        >
                            <div class="class-name">{cls.name}</div>
                            <div class="class-description">{cls.description}</div>
                            <div class="class-stats">
                                <StatBar label="STR" fullLabel="Strength" value={cls.strength} />
                                <StatBar label="SPD" fullLabel="Speed" value={cls.speed} />
                                <StatBar label="SMT" fullLabel="Smarts" value={cls.smarts} />
                            </div>
                        </button>
                    ))}
                </div>
                <div class="class-select-actions">
                    <button class="menu-button secondary" onClick={() => setPhase('title')}>
                        Back
                    </button>
                    <button
                        class="menu-button primary"
                        disabled={!selected}
                        onClick={() => selected && onStart(selected)}
                    >
                        Begin Adventure
                    </button>
                </div>
            </div>
        </div>
    )
}
