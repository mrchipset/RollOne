import type { Uint32Source } from './random'

/** SplitMix32 终结器：把任意 32 位输入彻底打散成均匀的 32 位输出。 */
function mix32(value: number): number {
  let h = value >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad)
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97)
  return (h ^ (h >>> 15)) >>> 0
}

/**
 * 把「弹弓拉动力度」和「本次投掷新取的系统熵」混合成一个种子。
 *
 * 拉力先量化成 32 位整数再与熵异或，最后过一遍 mix32 打散：
 * - 熵是均匀的 → 异或结果仍然均匀 → 结果严格等概率（不会因为人总是拉到相近区间而偏心）
 * - 拉力改变低位输入 → 同一熵下不同力度给出不同结果，拉力真实参与决定
 */
export function deriveSeed(force: number, entropy: number): number {
  if (!Number.isFinite(force)) {
    throw new RangeError(`force 必须是有限数字，收到 ${force}`)
  }
  if (!Number.isInteger(entropy) || entropy < 0 || entropy > 0xffffffff) {
    throw new RangeError(`entropy 必须是 [0, 2**32) 内的整数，收到 ${entropy}`)
  }

  const clamped = Math.min(Math.max(force, 0), 1)
  const quantized = Math.round(clamped * 0xffffffff) >>> 0
  return mix32(quantized ^ (entropy >>> 0))
}

/**
 * mulberry32：确定性 PRNG，输出 [0, 2**32) 的均匀整数。
 *
 * 返回的函数符合 `Uint32Source`，可以直接喂给 `randBelow` / `rollFace`，
 * 因此种子化的抽取与无偏抽取机制完全复用同一条路径。
 */
export function mulberry32(seed: number): Uint32Source {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
}

