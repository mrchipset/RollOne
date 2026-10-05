/** 随机源的契约：每次调用返回 [0, 2**32) 内的均匀整数。 */
export type Uint32Source = () => number

/** 单个随机“字”的取值空间大小。 */
export const WORD_SPACE = 2 ** 32

/** 从 CSPRNG 取一个 32 位无符号整数；无 crypto 的运行时回退到 Math.random。 */
export function randomUint32(): number {
  const cryptoObj = globalThis.crypto

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    cryptoObj.getRandomValues(buffer)
    return buffer[0]
  }

  return Math.floor(Math.random() * WORD_SPACE)
}

/**
 * 在 [0, limit) 上做**严格无偏**抽取，等价于 Python `random.choice` 内部的 _randbelow。
 *
 * 注意这里不是取模。当 limit 不能整除 2**32 时（例如 6），直接 `value % limit`
 * 会让靠前的余数多分到一些字，产生偏差。拒绝采样的做法是先求出不超过字空间的
 * 最大 limit 倍数作为上界，把落在 [上界, 字空间) 的字整段丢弃后重抽，
 * 于是每个结果对应**数量完全相同**的字，概率精确等于 1 / limit。
 */
export function randBelow(limit: number, source: Uint32Source = randomUint32): number {
  return randBelowInSpace(limit, WORD_SPACE, source)
}

/**
 * `randBelow` 的实现体，字空间可注入。
 * 暴露出来是为了让测试能用小字空间**穷举**验证无偏性；生产路径固定使用 2**32。
 *
 * 契约：`source` 必须是真实的随机源。若源恒定返回落在丢弃区 [bound, space) 的值，
 * 循环不会终止（与 Python `_randbelow` 的行为一致）；真实 CSPRNG 下该概率可忽略。
 *
 * @internal
 */
export function randBelowInSpace(limit: number, space: number, source: () => number): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`limit 必须是正整数，收到 ${limit}`)
  }
  if (!Number.isInteger(space) || space < limit) {
    throw new RangeError(`space 必须是 >= limit 的整数，收到 ${space}`)
  }

  // 不超过 space 的最大 limit 倍数；[bound, space) 这一整段会被丢弃重抽。
  const bound = Math.floor(space / limit) * limit

  for (;;) {
    const value = source()

    if (!Number.isInteger(value) || value < 0 || value >= space) {
      throw new RangeError(`随机源必须返回 [0, ${space}) 内的整数，收到 ${value}`)
    }
    if (value < bound) {
      return value % limit
    }
  }
}
