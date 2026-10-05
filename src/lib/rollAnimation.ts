/** 投掷动画总时长（毫秒）。 */
export const ROLL_DURATION_MS = 1800

/** 第一次换面后的等待时长，之后按 growth 逐步放慢。 */
export const SWAP_START_MS = 90

/** 每次换面间隔的放大系数（> 1 即为减速）。 */
export const SWAP_GROWTH = 1.16

/** 单次换面间隔的上限，避免末尾停顿过久。 */
export const SWAP_MAX_MS = 320

/**
 * 生成"从快到慢"的换面时间表（毫秒）。
 *
 * 骰子落定时会逐渐减速，等比递增的间隔比匀速切换更接近真实手感，
 * 也让人来得及看清最后几次换面。返回的每一项都是"上一次换面之后等多久再换"，
 * 总和不会超过 duration。
 */
export function buildSwapSchedule(
  duration: number = ROLL_DURATION_MS,
  start: number = SWAP_START_MS,
  growth: number = SWAP_GROWTH,
  max: number = SWAP_MAX_MS,
): number[] {
  if (!(duration > 0)) {
    throw new RangeError(`duration 必须是正数，收到 ${duration}`)
  }
  if (!(start > 0)) {
    throw new RangeError(`start 必须是正数，收到 ${start}`)
  }
  // growth < 1 会让间隔越缩越小、elapsed 几乎不增长，时间表无法收敛
  if (!(growth >= 1)) {
    throw new RangeError(`growth 必须 >= 1，收到 ${growth}`)
  }

  const ceiling = Math.max(start, max)
  const delays: number[] = []
  let elapsed = 0
  let delay = Math.min(start, ceiling)

  while (elapsed + delay < duration) {
    delays.push(delay)
    elapsed += delay
    delay = Math.min(delay * growth, ceiling)
  }

  return delays
}
