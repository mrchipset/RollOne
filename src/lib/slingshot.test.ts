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

