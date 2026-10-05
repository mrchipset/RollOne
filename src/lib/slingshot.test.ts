import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORCE,
  MAX_PULL_PX,
  MIN_PULL_PX,
  dragDistance,
  forceFromDistance,
  isThrowable,
  launchDirection,
  pullFromDrag,
  rollAxis,
} from './slingshot'

describe('pullFromDrag', () => {
  it('返回手指相对按下位置的位移', () => {
    expect(pullFromDrag({ x: 100, y: 100 }, { x: 70, y: 130 })).toEqual({ x: -30, y: 30 })
  })
})

describe('dragDistance', () => {
  it('用勾股定理算长度', () => {
    expect(dragDistance({ x: 3, y: 4 })).toBe(5)
    expect(dragDistance({ x: 0, y: 0 })).toBe(0)
  })
})

describe('forceFromDistance', () => {
  it('零位移是零力度', () => {
    expect(forceFromDistance(0)).toBe(0)
  })

  it('中值位移按比例映射', () => {
    expect(forceFromDistance(MAX_PULL_PX / 2)).toBeCloseTo(0.5, 6)
  })

  it('达到与超过上限都封顶为 1', () => {
    expect(forceFromDistance(MAX_PULL_PX)).toBe(1)
    expect(forceFromDistance(MAX_PULL_PX * 5)).toBe(1)
  })

  it('拒绝非有限输入', () => {
    expect(() => forceFromDistance(Number.NaN)).toThrow(RangeError)
    expect(() => forceFromDistance(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('isThrowable', () => {
  it('低于阈值不算投掷', () => {
    expect(isThrowable(MIN_PULL_PX - 1)).toBe(false)
    expect(isThrowable(0)).toBe(false)
  })

  it('达到阈值即算投掷', () => {
    expect(isThrowable(MIN_PULL_PX)).toBe(true)
    expect(isThrowable(MIN_PULL_PX + 50)).toBe(true)
  })
})

describe('launchDirection', () => {
  it('方向与拖拽相反', () => {
    expect(launchDirection({ x: 0, y: 100 }).y).toBeCloseTo(-1, 6)
    expect(launchDirection({ x: -100, y: 0 }).x).toBeCloseTo(1, 6)
  })

  it('是单位向量，长度不影响力度的判断', () => {
    const direction = launchDirection({ x: 300, y: 400 })
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 6)
  })

  it('零位移时朝正上方', () => {
    expect(launchDirection({ x: 0, y: 0 })).toEqual({ x: 0, y: -1 })
  })
})

describe('常量', () => {
  it('阈值与默认值互相自洽', () => {
    expect(MIN_PULL_PX).toBeGreaterThan(0)
    expect(MIN_PULL_PX).toBeLessThan(MAX_PULL_PX)
    expect(DEFAULT_FORCE).toBeGreaterThan(0)
    expect(DEFAULT_FORCE).toBeLessThanOrEqual(1)
  })
})

describe('rollAxis', () => {
  it('恒为单位向量', () => {
    for (const pull of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -3, y: 4 },
      { x: 0.5, y: -0.5 },
    ]) {
      const { ax, ay } = rollAxis(pull)
      expect(Math.hypot(ax, ay)).toBeCloseTo(1, 9)
    }
  })

  it('零位移时退化为绕 +X 轴（对应"朝正上方发射"）', () => {
    expect(rollAxis({ x: 0, y: 0 })).toEqual({ ax: 1, ay: 0 })
  })

  it('滚动轴与发射方向垂直（纯滚动的必要条件）', () => {
    for (const pull of [
      { x: 0, y: 120 },
      { x: -140, y: 0 },
      { x: 90, y: -90 },
    ]) {
      const dir = launchDirection(pull)
      const { ax, ay } = rollAxis(pull)
      // 与发射方向点乘为 0
      expect(ax * dir.x + ay * dir.y).toBeCloseTo(0, 9)
    }
  })

  it('方向跟着拉力走：往下拉朝上滚、往左拉往右滚', () => {
    // 向下拉 → 朝屏幕上方发射 → 绕 +X 滚动
    expect(rollAxis({ x: 0, y: 100 })).toEqual({ ax: 1, ay: 0 })
    // 向左拉 → 朝右发射 → 绕 +Y 滚动
    expect(rollAxis({ x: -100, y: 0 })).toEqual({ ax: 0, ay: 1 })
    // 向下拉的反方向（向上拉）→ 绕 -X 滚动，方向确实翻转了
    expect(rollAxis({ x: 0, y: -100 })).toEqual({ ax: -1, ay: 0 })
  })

  it('不同拉力方向给出不同滚动轴（不再是固定方向）', () => {
    const axes = [
      { x: 0, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: -100 },
      { x: -100, y: 0 },
    ].map((p) => JSON.stringify(rollAxis(p)))
    expect(new Set(axes).size).toBe(4)
  })
})
