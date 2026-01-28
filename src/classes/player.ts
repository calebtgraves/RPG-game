export default class Player {
    name: string
    stats: {
        strength: number
        speed: number
        smarts: number
        hitpoints: number
    }
    inventory: object[] = []
    actions: object[] = []

    constructor(name: string) {
        this.name = name
        this.stats = {
            strength: 10,
            speed: 10,
            smarts: 10,
            hitpoints: 20,
        }
    }
}