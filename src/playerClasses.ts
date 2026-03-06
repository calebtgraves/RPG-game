export type PlayerClass = {
    id: string
    name: string
    description: string
    strength: number
    speed: number
    smarts: number
}

export const PLAYER_CLASSES: PlayerClass[] = [
    {
        id: 'mage',
        name: 'Mage',
        description: 'Wields powerful magic through intellect.',
        strength: 2,
        speed: 3,
        smarts: 5,
    },
    {
        id: 'warrior',
        name: 'Warrior',
        description: 'A hardened fighter with brute force.',
        strength: 5,
        speed: 3,
        smarts: 2,
    },
    {
        id: 'thief',
        name: 'Thief',
        description: 'Swift and cunning, strikes from the shadows.',
        strength: 3,
        speed: 4,
        smarts: 3,
    },
]
