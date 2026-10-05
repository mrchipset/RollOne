import { describe, expect, it } from 'vitest'
import {
  EASE_FLY,
  EASE_SETTLE,
  MAX_FLIGHT_PX,
  TIME_SCALE,
  buildTumblePlan,
  flightOffset,
  type TumblePlan,
} from './tumble'

const FORCES = [0, 0.25, 0.5, 0.75, 1]

function totalSpins(plan: TumblePlan): number {
  return plan.flySpins + plan.settleSpins
}

/** cubic-bezier 的峰值斜率（dy/dx），用采样求数值最大值。 */
function peakSlope(easing: string): number {
  const match = /cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/.exec(easing)
  if (!match) throw new Error(`无法解析缓动函数：${easing}`)

  const [x1, y1, x2, y2] = match.slice(1).map(Number)
  const point = (t: number) => ({
    x: 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3,
    y: 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3,
  })

  let peak = 0
  for (let i = 0; i <= 2000; i += 1) {
    const t = i / 2000
    const delta = 1e-4
    const before = point(Math.max(0, t - delta))
    const after = point(Math.min(1, t + delta))
    const slope = (after.y - before.y) / (after.x - before.x)
    if (Number.isFinite(slope)) peak = Math.max(peak, slope)
  }
  return peak
}

describe('buildTumblePlan', () => {
  it('力度越大，飞行越久、抬得越高、转得越多', () => {
    const weak = buildTumblePlan(0)
    const mid = buildTumblePlan(0.5)
    const strong = buildTumblePlan(1)

    expect(mid.flyMs).toBeGreaterThan(weak.flyMs)
    expect(strong.flyMs).toBeGreaterThan(mid.flyMs)
    expect(strong.liftPx).toBeGreaterThan(weak.liftPx)
    expect(totalSpins(strong)).toBeGreaterThanOrEqual(totalSpins(weak))
    expect(strong.settleMs).toBeGreaterThan(weak.settleMs)
  })

  it('所有输出都是有限的非负数', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      for (const value of [
        plan.flyMs,
        plan.settleMs,
        plan.flySpins,
        plan.settleSpins,
        plan.flyScale,
        plan.liftPx,
      ]) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('至少转两圈，保证看得出翻滚', () => {
    for (const force of FORCES) {
      expect(totalSpins(buildTumblePlan(force))).toBeGreaterThanOrEqual(2)
    }
  })

  it('起飞段和回落段都各分到至少一圈', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      expect(plan.flySpins).toBeGreaterThanOrEqual(1)
      expect(plan.settleSpins).toBeGreaterThanOrEqual(1)
    }
  })

  it('越界力度被裁剪到 [0, 1]', () => {
    expect(buildTumblePlan(-5)).toEqual(buildTumblePlan(0))
    expect(buildTumblePlan(9)).toEqual(buildTumblePlan(1))
  })

  it('拒绝非法输入', () => {
    expect(() => buildTumblePlan(Number.NaN)).toThrow(RangeError)
    expect(() => buildTumblePlan(0.5, 0)).toThrow(RangeError)
    expect(() => buildTumblePlan(0.5, -1)).toThrow(RangeError)
  })

  it('默认按 TIME_SCALE 放慢：只放大时长，圈数与距离保持基准值', () => {
    // 取 f = 0.5，基准时长恰为整数，便于精确比对
    const base = buildTumblePlan(0.5, 1)
    const slow = buildTumblePlan(0.5)

    expect(base.flyMs).toBe(350)
    expect(base.settleMs).toBe(990)

    expect(slow.flyMs).toBe(base.flyMs * TIME_SCALE)
    expect(slow.settleMs).toBe(base.settleMs * TIME_SCALE)

    // 圈数、飞行比例、抬升高度不受时间缩放影响
    expect(totalSpins(slow)).toBe(totalSpins(base))
    expect(slow.flyScale).toBe(base.flyScale)
    expect(slow.liftPx).toBe(base.liftPx)
  })
})

describe('flightOffset', () => {
  it('飞行距离不超过上限，保证骰子留在舞台内', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      const offset = flightOffset({ x: 1, y: 0 }, plan)
      expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(MAX_FLIGHT_PX + 1e-9)
    }
  })

  it('方向由方向向量决定，与力度无关', () => {
    const plan = buildTumblePlan(1)
    expect(flightOffset({ x: 0, y: -1 }, plan).y).toBeLessThan(0)
    expect(flightOffset({ x: 1, y: 0 }, plan).x).toBeGreaterThan(0)
  })
})

/**
 * 眩晕约束。翻滚的角速度 = 圈数 ÷ 该段时长，峰值还要再乘上缓动的起步斜率。
 * 缩短总时长会同比抬高角速度，所以这组测试是改 TIME_SCALE 时的安全网。
 */
describe('翻滚速度不会引起眩晕', () => {
  const flyPeakFactor = peakSlope(EASE_FLY)
  const settlePeakFactor = peakSlope(EASE_SETTLE)

  function peakRevsPerSecond(plan: TumblePlan): number {
    const fly = (plan.flySpins / (plan.flyMs / 1000)) * flyPeakFactor
    const settle = (plan.settleSpins / (plan.settleMs / 1000)) * settlePeakFactor
    return Math.max(fly, settle)
  }

  it('最多只转三圈', () => {
    for (const force of FORCES) {
      expect(totalSpins(buildTumblePlan(force))).toBeLessThanOrEqual(3)
    }
  })

  it('起飞缓动的起步斜率不再把转速推到峰值', () => {
    // 原先是 cubic-bezier(0.18, 0.72, …)，斜率 4，峰值转速被放大四倍
    expect(flyPeakFactor).toBeLessThan(2)
  })

  it('峰值角速度低于 4.5 圈/秒', () => {
    for (const force of FORCES) {
      const peak = peakRevsPerSecond(buildTumblePlan(force))
      expect(peak).toBeLessThan(4.5)
    }
  })

  it('把翻滚分摊到两段，比全挤在起飞段明显更慢', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      const crammed = (totalSpins(plan) / (plan.flyMs / 1000)) * flyPeakFactor
      expect(peakRevsPerSecond(plan)).toBeLessThan(crammed)
    }
  })
})

