export type PlatformDefinition = [x: number, y: number, width: number, height: number]
export type CollectibleDefinition = { x: number; y: number }

// The first stretch of the climb is a fixed, hand-placed sequence so the
// opening of the level always plays the same way. Everything after that
// point is generated fresh, so the "end" of the climb is different every
// time the level loads.
const fixedClimbPlatforms: PlatformDefinition[] = [
  [520, 520, 130, 32],
  [980, 460, 110, 32],
  [1380, 400, 140, 32],
  [1830, 340, 100, 32],
]

const fixedClimbCollectibles: CollectibleDefinition[] = [
  { x: 650, y: 480 },
  { x: 1090, y: 420 },
  { x: 1510, y: 360 },
]

const CEILING_Y = 130 // highest a platform may spawn - keeps the climb inside the world bounds
const PLATFORM_WIDTH = 130
const PLATFORM_HEIGHT = 32

// These two pairs are what stop the randomized section from ever letting the
// player cheese the climb:
//  - MAX_VERTICAL_STEP is capped at roughly what a single jump can clear, so
//    no platform can be placed so far above the last one that the player
//    could double-jump straight past several rungs at once.
//  - MIN_HORIZONTAL_GAP/MAX_HORIZONTAL_GAP keep every platform far enough
//    apart that it takes a real jump to reach (not just a walk-on), but
//    close enough together that a max jump can't sail over one to the next.
// Together they force every generated platform to actually be used - there
// is no random layout this can produce where a jump reaches past one
// platform to land on a later one.
const MIN_VERTICAL_STEP = 45
const MAX_VERTICAL_STEP = 95
const MIN_HORIZONTAL_GAP = 320
const MAX_HORIZONTAL_GAP = 460

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateAscendingSection(
  startX: number,
  startY: number,
  ceilingY: number,
): { platforms: PlatformDefinition[]; collectibles: CollectibleDefinition[] } {
  const platforms: PlatformDefinition[] = []
  const collectibles: CollectibleDefinition[] = []
  let x = startX
  let y = startY

  while (y > ceilingY) {
    x += randomBetween(MIN_HORIZONTAL_GAP, MAX_HORIZONTAL_GAP)
    y = Math.max(ceilingY, y - randomBetween(MIN_VERTICAL_STEP, MAX_VERTICAL_STEP))
    platforms.push([x, y, PLATFORM_WIDTH, PLATFORM_HEIGHT])
    collectibles.push({ x, y: y - 40 })
  }

  return { platforms, collectibles }
}

const lastFixedPlatform = fixedClimbPlatforms[fixedClimbPlatforms.length - 1]
const { platforms: randomizedEndPlatforms, collectibles: randomizedEndCollectibles } =
  generateAscendingSection(lastFixedPlatform[0], lastFixedPlatform[1], CEILING_Y)

export const birthdayValley = {
  playerSpawn: { x: 220, y: 520 },
  collectibles: [
    ...fixedClimbCollectibles,
    ...randomizedEndCollectibles,
  ] satisfies CollectibleDefinition[],
  platforms: [
    [0, 771, 4800, 70],
    ...fixedClimbPlatforms,
    ...randomizedEndPlatforms,
  ] satisfies PlatformDefinition[],
}