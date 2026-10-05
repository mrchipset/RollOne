import { describe, expect, it } from 'vitest'
import { WORD_SPACE, randBelow, randBelowInSpace, randomUint32 } from './random'

describe('randomUint32', () => {
  it('返回 [0, 2**32) 内的整数', () => {
    for (let i = 0; i < 1000; i += 1) {
      const value = randomUint32()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(WORD_SPACE)
    }
  })

  it('能覆盖高低两半（非恒定输出）', () => {
    const values = Array.from({ length: 2000 }, () => randomUint32())
    expect(Math.max(...values)).toBeGreaterThan(WORD_SPACE / 2)
    expect(Math.min(...values)).toBeLessThan(WORD_SPACE / 2)
  })
})

describe('randBelowInSpace 的无偏性', () => {
  it('穷举全部被接受的字，每个结果分到的字数完全相同', () => {
    const space = 8
    const limit = 3
    // 被接受的上界 = floor(8 / 3) * 3 = 6，即字 6、7 会被丢弃
    const bound = Math.floor(space / limit) * limit
    const counts = [0, 0, 0]

    // space 取 bound 时不会丢弃任何字，于是穷举的就是真实的接受集
    for (let word = 0; word < bound; word += 1) {
      counts[randBelowInSpace(limit, bound, () => word)] += 1
    }

    expect(bound).toBe(6)
    expect(bound % limit).toBe(0)
    expect(counts).toEqual([2, 2, 2])
  })

  it('余数字会被丢弃重抽，而不是直接取模', () => {
    const drawn: number[] = []
    const sequence = [6, 7, 5]
    let cursor = 0

    const value = randBelowInSpace(3, 8, () => {
      const word = sequence[Math.min(cursor, sequence.length - 1)]
      cursor = Math.min(cursor + 1, sequence.length - 1)
      drawn.push(word)
      return word
    })

    expect(drawn).toEqual([6, 7, 5])
    expect(value).toBe(5 % 3)
  })

  it('字空间恰好被 limit 整除时不丢弃任何字', () => {
    const counts = [0, 0, 0, 0]
    for (let word = 0; word < 8; word += 1) {
      counts[randBelowInSpace(4, 8, () => word)] += 1
    }
    expect(counts).toEqual([2, 2, 2, 2])
  })
})

describe('randBelow', () => {
  it('结果始终落在 [0, limit)', () => {
    for (let i = 0; i < 5000; i += 1) {
      const value = randBelow(6)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(6)
    }
  })

  it('limit 为 1 时恒定返回 0', () => {
    expect(randBelow(1)).toBe(0)
  })

  it('拒绝非法参数', () => {
    expect(() => randBelow(0)).toThrow(RangeError)
    expect(() => randBelow(-3)).toThrow(RangeError)
    expect(() => randBelow(2.5)).toThrow(RangeError)
    expect(() => randBelow(WORD_SPACE + 1)).toThrow(RangeError)
    expect(() => randBelowInSpace(3, 2, () => 0)).toThrow(RangeError)
  })

  it('拒绝越界的随机源输出', () => {
    expect(() => randBelowInSpace(3, 8, () => 8)).toThrow(RangeError)
    expect(() => randBelowInSpace(3, 8, () => -1)).toThrow(RangeError)
    expect(() => randBelowInSpace(3, 8, () => 1.5)).toThrow(RangeError)
  })

  it('真实随机源下 6 个结果各占约 1/6（±3%）', () => {
    const total = 30_000
    const counts = [0, 0, 0, 0, 0, 0]

    for (let i = 0; i < total; i += 1) {
      counts[randBelow(6)] += 1
    }

    for (const count of counts) {
      expect(Math.abs(count / total - 1 / 6)).toBeLessThan(0.03)
    }
  })
})
