export type PlatformDefinition = [x: number, y: number, width: number, height: number]
export type CollectibleDefinition = { x: number; y: number }
export type HazardDefinition = { x: number; count: number }
export type ChestAnchor = { x: number; surfaceY: number }

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

// ---------------------------------------------------------------------------
// Geometry the rest of the game depends on
// ---------------------------------------------------------------------------
// addPlatform() builds the collision strip 12px below the declared y for the
// enlarged floating platforms, and 31px below the declared y for the ground.
// These two helpers are the single source of truth for "where the player's
// feet actually rest", so chests and spikes sit flush instead of floating.
export const GROUND_PLATFORM: PlatformDefinition = [0, 771, 4800, 70]
export const GROUND_SURFACE_Y = 740
export function platformSurfaceY(y: number): number {
  return y - 12
}

// Jump budget, derived from Player.ts (jumpVelocity -610, world gravity 1250):
//   single jump rise  ~149px, flat range ~318px
//   double jump rise  ~298px, flat range ~548px
// The player body is 150 tall, so its head clears CEILING_Y - 299 on the final
// rung. CEILING_Y is set to keep that comfortably below the world's top edge,
// which is what stops the player from jamming into the invisible ceiling.
const CEILING_Y = 280
const SUMMIT_FLOOR_Y = 410
const PLATFORM_WIDTH = 130
const PLATFORM_HEIGHT = 32
const MAX_X = 4400

const MIN_VERTICAL_STEP = 55
const MAX_VERTICAL_STEP = 95

// ---------------------------------------------------------------------------
// Gap sizing: tied to the player's actual physics, not arbitrary numbers
// ---------------------------------------------------------------------------
// These four must match Player.ts / config.ts exactly - they are what a jump
// can physically cover, so the gap generator can place platforms right at the
// edge of what's reachable instead of somewhere in a comfortable middle range.
//   moveSpeed   -> Player.ts private readonly moveSpeed
//   jumpVelocity -> Player.ts private readonly jumpVelocity (magnitude)
//   gravityRise  -> config.ts arcade.gravity.y (only force while ascending)
//   gravityFall  -> config.ts gravity.y + Player.ts's extra fall gravity (1250 + 340)
const MOVE_SPEED = 345
const JUMP_VELOCITY = 610
const GRAVITY_RISE = 1250
const GRAVITY_FALL = 1590

// A jump timed and released with zero slack would land exactly at the
// theoretical maximum - not a real input. This is subtracted from that max so
// the gap is "just enough to make the jump" rather than frame-perfect.
const MIN_JUMP_SAFETY_MARGIN = 20
const MAX_JUMP_SAFETY_MARGIN = 55

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// The horizontal distance a double jump can cover, launching now and landing
// `riseAboveLaunch` px higher than the launch point (negative = landing
// lower, which only adds range since the fall covers more ground).
function maxDoubleJumpReach(riseAboveLaunch: number): number {
  const apex = (JUMP_VELOCITY * JUMP_VELOCITY) / GRAVITY_RISE
  const risingTime = (2 * JUMP_VELOCITY) / GRAVITY_RISE // both jump impulses happen back to back
  const clampedRise = Math.min(riseAboveLaunch, apex) // can't land higher than the jump can reach
  const fallingTime = Math.sqrt((2 * (apex - clampedRise)) / GRAVITY_FALL)
  return MOVE_SPEED * (risingTime + fallingTime)
}

// The empty-air clearance a jump must cross: from the right edge of the
// platform being launched from to the left edge of the one being landed on.
// This - not the distance between anchors - is what maxDoubleJumpReach()
// measures, so it's placed right at the edge of double-jump range for
// whatever vertical step this particular gap rolled.
function nextClearance(riseAboveLaunch: number): number {
  return maxDoubleJumpReach(riseAboveLaunch) - randomBetween(MIN_JUMP_SAFETY_MARGIN, MAX_JUMP_SAFETY_MARGIN)
}

// Anchors (the platform tuple's x) are left edges, so advancing to the next
// one means clearing the gap AND crossing the platform being launched from.
function nextPitch(riseAboveLaunch: number): number {
  return nextClearance(riseAboveLaunch) + PLATFORM_WIDTH
}

// Climbs to the ceiling, then runs a randomized traverse along the summit so
// the tail of the level still changes on every load now that the ceiling is
// low enough to keep jumps clean.
function generateClimb(startX: number, startY: number): PlatformDefinition[] {
  const platforms: PlatformDefinition[] = []
  let x = startX
  let y = startY

  while (y > CEILING_Y && x < MAX_X) {
    const nextY = Math.max(CEILING_Y, y - randomBetween(MIN_VERTICAL_STEP, MAX_VERTICAL_STEP))
    const rise = y - nextY // positive: this rung is higher than the last
    x += nextPitch(rise)
    y = nextY
    platforms.push([Math.round(x), Math.round(y), PLATFORM_WIDTH, PLATFORM_HEIGHT])
  }

  const traverseCount = Math.floor(randomBetween(4, 7))
  for (let index = 0; index < traverseCount; index += 1) {
    const nextY = clamp(y + randomBetween(-70, 70), CEILING_Y, SUMMIT_FLOOR_Y)
    const rise = y - nextY
    const nextX = x + nextPitch(rise)
    if (nextX + PLATFORM_WIDTH > MAX_X) break
    x = nextX
    y = nextY
    platforms.push([Math.round(x), Math.round(y), PLATFORM_WIDTH, PLATFORM_HEIGHT])
  }

  return platforms
}

// Spreads the 8 stars across the whole climb instead of bunching them at the
// bottom, so the counter tracks progress through the level.
function pickEvenlySpread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items
  const picked: T[] = []
  for (let index = 0; index < count; index += 1) {
    picked.push(items[Math.round((index * (items.length - 1)) / (count - 1))])
  }
  return picked
}

const lastFixedPlatform = fixedClimbPlatforms[fixedClimbPlatforms.length - 1]
const generatedPlatforms = generateClimb(lastFixedPlatform[0], lastFixedPlatform[1])
const finalPlatform = generatedPlatforms[generatedPlatforms.length - 1]

const generatedCollectibles: CollectibleDefinition[] = generatedPlatforms.map(([x, y]) => ({
  x: x + PLATFORM_WIDTH / 2,
  y: platformSurfaceY(y) - 46,
}))

export const TOTAL_STARS = 8

// ---------------------------------------------------------------------------
// Ground spikes
// ---------------------------------------------------------------------------
// The floor is lethal almost end to end, so the floating platforms stop being
// optional. Two safe pockets are carved out of it, and nothing else.
//
// The chest pocket's position is load-bearing, not cosmetic. A double jump
// rises 297.7px; the first floating platform's surface is 232px above the
// floor (65.7px of margin) while the second is 292px above it (5.7px - not a
// jump anyone can make). So the only spot on the ground where a player can
// stop and still get back up is directly beneath the first platform, and the
// pocket is built around that: the chest sits at its centre, and a straight-up
// double jump from anywhere in it lands on the platform overhead.
const SPIKE_WIDTH = 32
const GROUND_WIDTH = GROUND_PLATFORM[2]
// Cap on how many spikes sit shoulder to shoulder before a bare slot breaks
// the row up. The bare slot leaves 44px between neighbouring hitboxes, well
// under the player's 65px body, so a breather is never somewhere to land.
const MAX_SPIKE_RUN = 11

const GROUND_CHEST_X = 608

const SAFE_GROUND_ZONES: { from: number; to: number }[] = [
  { from: 0, to: 448 },   // spawn runway - long enough to build up speed, no longer
  { from: 512, to: 704 },  // ground chest pocket, under the first floating platform
]

function buildGroundHazards(): HazardDefinition[] {
  const slotCount = Math.floor(GROUND_WIDTH / SPIKE_WIDTH)
  const spiked = Array.from({ length: slotCount }, (_unused, slot) => {
    const left = slot * SPIKE_WIDTH
    return !SAFE_GROUND_ZONES.some((zone) => left + SPIKE_WIDTH > zone.from && left < zone.to)
  })

  const runs: HazardDefinition[] = []
  let slot = 0
  while (slot < slotCount) {
    if (!spiked[slot]) {
      slot += 1
      continue
    }
    let length = 0
    while (slot + length < slotCount && spiked[slot + length] && length < MAX_SPIKE_RUN) length += 1
    runs.push({ x: slot * SPIKE_WIDTH, count: length })
    slot += length
    if (slot < slotCount && spiked[slot]) slot += 1
  }
  return runs
}

export const groundHazards: HazardDefinition[] = buildGroundHazards()

export const birthdayValley = {
  playerSpawn: { x: 220, y: 520 },
  ceilingY: CEILING_Y,
  collectibles: pickEvenlySpread(
    [...fixedClimbCollectibles, ...generatedCollectibles],
    TOTAL_STARS,
  ) satisfies CollectibleDefinition[],
  platforms: [
    GROUND_PLATFORM,
    ...fixedClimbPlatforms,
    ...generatedPlatforms,
  ] satisfies PlatformDefinition[],
  groundChest: { x: GROUND_CHEST_X, surfaceY: GROUND_SURFACE_Y } satisfies ChestAnchor,
  summitChest: {
    x: finalPlatform[0] + PLATFORM_WIDTH / 2,
    surfaceY: platformSurfaceY(finalPlatform[1]),
  } satisfies ChestAnchor,
}