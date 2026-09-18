export type PlatformDefinition = [x: number, y: number, width: number, height: number]
export type CollectibleDefinition = { x: number; y: number }

export const birthdayValley = {
  playerSpawn: { x: 220, y: 520 },
  collectibles: [
    { x: 650, y: 475 },
    { x: 1090, y: 395 },
    { x: 1510, y: 510 },
    { x: 1950, y: 360 },
    { x: 2450, y: 460 },
    { x: 2925, y: 330 },
    { x: 3820, y: 390 },
    { x: 4330, y: 460 },
  ] satisfies CollectibleDefinition[],
    platforms: [
    [0, 771, 4800, 70],
    [520, 500, 130, 32],
    [980, 380, 110, 32],
    [1380, 480, 140, 32],
    [1830, 340, 100, 32],
    [2300, 460, 150, 32],
    [2820, 320, 100, 32],
    [3240, 500, 140, 32],
    [3700, 360, 130, 32],
    [4200, 480, 150, 32],
    ] satisfies PlatformDefinition[],
}