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

    constructor(name: string, classStats?: { strength: number; speed: number; smarts: number }) {
        this.name = name
        this.stats = {
            strength: classStats?.strength ?? 10,
            speed: classStats?.speed ?? 10,
            smarts: classStats?.smarts ?? 10,
            hitpoints: 20,
        }
    }
}
