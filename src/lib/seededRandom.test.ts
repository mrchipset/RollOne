import { describe, expect, it } from 'vitest'
import { deriveSeed, mulberry32 } from './seededRandom'

describe('deriveSeed', () => {
  it('输出是 [0, 2**32) 内的整数', () => {
    for (let i = 0; i < 500; i += 1) {
      const seed = deriveSeed(i / 500, 123456789)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(2 ** 32)
    }
  })

  it('对力度敏感：同一熵下不同力度给出不同种子', () => {
    const seeds = new Set([0, 0.25, 0.5, 0.75, 1].map((f) => deriveSeed(f, 42)))
    expect(seeds.size).toBe(5)
  })

  it('对熵敏感：同一力度下不同熵给出不同种子', () => {
    const seeds = new Set([1, 2, 3, 4, 5].map((e) => deriveSeed(0.5, e)))
    expect(seeds.size).toBe(5)
  })

  it('越界力度被裁剪，等价于边界力度', () => {
    expect(deriveSeed(-3, 7)).toBe(deriveSeed(0, 7))
    expect(deriveSeed(9, 7)).toBe(deriveSeed(1, 7))
  })

  it('拒绝非法输入', () => {
    expect(() => deriveSeed(Number.NaN, 1)).toThrow(RangeError)
    expect(() => deriveSeed(0.5, 1.5)).toThrow(RangeError)
    expect(() => deriveSeed(0.5, -1)).toThrow(RangeError)
    expect(() => deriveSeed(0.5, 2 ** 32)).toThrow(RangeError)
  })
})

describe('mulberry32', () => {
  it('相同种子给出完全相同的序列（确定性）', () => {
    const a = mulberry32(20261005)
    const b = mulberry32(20261005)
    const seqA = Array.from({ length: 50 }, () => a())
    const seqB = Array.from({ length: 50 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('不同种子给出不同序列', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 50 }, () => a())
    const seqB = Array.from({ length: 50 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('输出恒为 [0, 2**32) 内的整数', () => {
    const source = mulberry32(99)
    for (let i = 0; i < 5000; i += 1) {
      const value = source()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(2 ** 32)
    }
  })

  it('低位不是常量（避免被取模放大成偏差）', () => {
    const source = mulberry32(7)
    // 2000 次采样下，均匀分布的低字节期望覆盖 256×(1−e^−7.8) ≈ 255.9 种
    const lowBits = new Set(Array.from({ length: 2000 }, () => source() & 0xff))
    expect(lowBits.size).toBeGreaterThan(240)
  })
})
