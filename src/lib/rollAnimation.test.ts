import { describe, expect, it } from 'vitest'
import {
  ROLL_DURATION_MS,
  SWAP_MAX_MS,
  SWAP_START_MS,
  buildSwapSchedule,
} from './rollAnimation'

describe('buildSwapSchedule', () => {
  it('生成非空时间表，且总时长不超过设定值', () => {
    const schedule = buildSwapSchedule()

    expect(schedule.length).toBeGreaterThan(0)
    expect(schedule.reduce((sum, delay) => sum + delay, 0)).toBeLessThanOrEqual(ROLL_DURATION_MS)
  })

  it('间隔单调不减，即从快到慢而不是越来越快', () => {
    const schedule = buildSwapSchedule()

    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i]).toBeGreaterThanOrEqual(schedule[i - 1])
    }
  })

  it('末尾确实比开头慢，说明有减速效果', () => {
    const schedule = buildSwapSchedule()
    const first = schedule[0]
    const last = schedule.at(-1) ?? 0

    expect(last).toBeGreaterThan(first * 2)
  })

  it('每一项都落在 [start, max] 区间内', () => {
    for (const delay of buildSwapSchedule()) {
      expect(delay).toBeGreaterThanOrEqual(SWAP_START_MS)
      expect(delay).toBeLessThanOrEqual(SWAP_MAX_MS)
    }
  })

  it('总时长放大后依然会终止且不超时', () => {
    const schedule = buildSwapSchedule(4000, 90, 1.1, 320)

    expect(schedule.reduce((sum, delay) => sum + delay, 0)).toBeLessThanOrEqual(4000)
  })

  it('拒绝会让循环无法推进的参数', () => {
    expect(() => buildSwapSchedule(0, 90, 1.16, 320)).toThrow(RangeError)
    expect(() => buildSwapSchedule(1800, 0, 1.16, 320)).toThrow(RangeError)
    expect(() => buildSwapSchedule(1800, -90, 1.16, 320)).toThrow(RangeError)
    // growth < 1 会让间隔递减到接近 0，时间表无法收敛
    expect(() => buildSwapSchedule(1800, 90, 0.5, 320)).toThrow(RangeError)
    expect(() => buildSwapSchedule(1800, 90, 0, 320)).toThrow(RangeError)
  })
})
