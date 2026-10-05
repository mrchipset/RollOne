import { describe, expect, it } from 'vitest'
import {
  EASE_FLY,
  EASE_RETURN,
  FLY_SHARE,
  MAX_FLIGHT_PX,
  TIME_SCALE,
  buildTumblePlan,
  flightOffset,
  type TumblePlan,
} from './tumble'

const FORCES = [0, 0.25, 0.5, 0.75, 1]

function parseBezier(easing: string): [number, number, number, number] {
  const match = /cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/.exec(easing)
  if (!match) throw new Error(`无法解析缓动函数：${easing}`)
  const [x1, y1, x2, y2] = match.slice(1).map(Number)
  return [x1, y1, x2, y2]
}

/** 缓动曲线在参数 t 处的 dy/dx，也就是瞬时速度倍率。 */
function slopeAt(easing: string, t: number): number {
  const [x1, y1, x2, y2] = parseBezier(easing)
  const point = (u: number) => ({
    x: 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3,
    y: 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3,
  })
  const delta = 1e-5
  const before = point(Math.max(0, t - delta))
  const after = point(Math.min(1, t + delta))
  return (after.y - before.y) / (after.x - before.x)
}

/** 缓动曲线的峰值速度倍率，采样求数值最大值。 */
function peakSlope(easing: string): number {
  let peak = 0
  for (let i = 0; i <= 2000; i += 1) {
    const slope = slopeAt(easing, i / 2000)
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
    expect(strong.settleMs).toBeGreaterThan(weak.settleMs)
    expect(strong.spins).toBeGreaterThanOrEqual(weak.spins)
  })

  it('所有输出都是有限的非负数', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      for (const value of [plan.flyMs, plan.settleMs, plan.spins, plan.flyScale, plan.liftPx]) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('只转 2～3 圈，保证看得出翻滚又不至于转太多', () => {
    for (const force of FORCES) {
      expect(buildTumblePlan(force).spins).toBeGreaterThanOrEqual(2)
      expect(buildTumblePlan(force).spins).toBeLessThanOrEqual(3)
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

  it('TIME_SCALE 只放大起飞段（旋转窗口），回落段长度不跟随', () => {
    // 取 f = 0.5，基准时长恰为整数，便于精确比对
    const base = buildTumblePlan(0.5, 1)
    const scaled = buildTumblePlan(0.5)

    expect(base.flyMs).toBe(450)
    expect(base.settleMs).toBe(300)

    expect(scaled.flyMs).toBe(base.flyMs * TIME_SCALE)
    // 回落段刻意不跟随缩放：它是"直接回到中央"，保持利落
    expect(scaled.settleMs).toBe(base.settleMs)

    // 圈数、飞行比例、抬升高度不受时间缩放影响
    expect(scaled.spins).toBe(base.spins)
    expect(scaled.flyScale).toBe(base.flyScale)
    expect(scaled.liftPx).toBe(base.liftPx)
  })

  it('两段时长分别由各自公式决定', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      const totalMs = 620 + 260 * force
      expect(plan.flyMs).toBe(Math.round(totalMs * FLY_SHARE * TIME_SCALE))
      expect(plan.settleMs).toBe(Math.round(totalMs * (1 - FLY_SHARE)))
    }
  })

  it('起飞段明显长于回落段：翻滚需要时间，回落只需要利落地滑回', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force)
      expect(plan.flyMs).toBeGreaterThan(plan.settleMs)
    }
  })

  it('TIME_SCALE = 1 时两段严格按 FLY_SHARE 划分', () => {
    for (const force of FORCES) {
      const plan = buildTumblePlan(force, 1)
      const share = plan.flyMs / (plan.flyMs + plan.settleMs)
      expect(share).toBeCloseTo(FLY_SHARE, 2)
    }
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
 * 眩晕约束。翻滚全部发生在起飞段，所以角速度 = 圈数 ÷ 起飞时长，
 * 峰值还要再乘上起飞缓动的起步斜率。缩短总时长会同比抬高角速度，
 * 这组测试是改 TIME_SCALE 时的安全网。
 */
describe('翻滚速度不会引起眩晕', () => {
  const flyPeakFactor = peakSlope(EASE_FLY)

  function peakRevsPerSecond(plan: TumblePlan): number {
    return (plan.spins / (plan.flyMs / 1000)) * flyPeakFactor
  }

  it('起飞缓动的起步斜率不再把转速推到峰值', () => {
    // 原先是 cubic-bezier(0.18, 0.72, …)，斜率 4，峰值转速被放大四倍
    expect(flyPeakFactor).toBeLessThan(2)
  })

  it('峰值角速度低于 4.5 圈/秒', () => {
    // 约束最紧的是**最小力度**那档：圈数固定为 2，而起飞段时长随力度增长，
    // 于是力度越小 → 起飞段越短 → 转速越高。TIME_SCALE = 2 时最小力度约 4.03 圈/秒，
    // 是整条曲线上的最坏值。想让弱力度也别转那么快，就得给 flyMs 加下限，
    // 或者让圈数随力度变化 —— 见 README「翻滚速度与眩晕约束」。
    for (const force of FORCES) {
      expect(peakRevsPerSecond(buildTumblePlan(force))).toBeLessThan(4.5)
    }
  })
})

/**
 * 两段之间的衔接。用户反馈过"先转几圈停下、然后又转几圈回中间"，
 * 根因就是回落段既要继续转、缓动又是从高斜率起步。
 */
describe('起飞与回落的衔接不会出现第二次转圈', () => {
  it('起飞段结尾速度归零', () => {
    expect(Math.abs(slopeAt(EASE_FLY, 1))).toBeLessThan(0.05)
  })

  it('回落段从零速度起步，接得上起飞段的结尾', () => {
    expect(Math.abs(slopeAt(EASE_RETURN, 0))).toBeLessThan(0.05)
  })

  it('回落段缓动不再是高斜率起步（那是旧版"又转起来"的观感来源）', () => {
    expect(slopeAt(EASE_RETURN, 0)).toBeLessThan(peakSlope(EASE_FLY))
    expect(Math.abs(slopeAt(EASE_RETURN, 0))).toBeLessThan(0.5)
  })

  it('翻滚计划里不再有"回落段圈数"这个概念', () => {
    const plan = buildTumblePlan(1)
    expect(Object.keys(plan).sort()).toEqual(
      ['flyMs', 'flyScale', 'liftPx', 'settleMs', 'spins'].sort(),
    )
  })
})
