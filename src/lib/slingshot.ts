export type Vector = { x: number; y: number }

/** 低于这个屏幕位移视为"没拉动"，松手回弹、不触发投掷。 */
export const MIN_PULL_PX = 12

/** 达到这个屏幕位移即视为满力度。 */
export const MAX_PULL_PX = 140

/** 后备按钮使用的默认力度。 */
export const DEFAULT_FORCE = 0.65

/** 手指当前位置相对按下位置的位移。 */
export function pullFromDrag(start: Vector, current: Vector): Vector {
  return { x: current.x - start.x, y: current.y - start.y }
}

export function dragDistance(drag: Vector): number {
  return Math.hypot(drag.x, drag.y)
}

/** 位移 → 归一化力度 [0, 1]。 */
export function forceFromDistance(distance: number): number {
  if (!Number.isFinite(distance)) {
    throw new RangeError(`distance 必须是有限数字，收到 ${distance}`)
  }
  return Math.min(Math.max(distance / MAX_PULL_PX, 0), 1)
}

export function isThrowable(distance: number): boolean {
  return distance >= MIN_PULL_PX
}

/** 发射方向：与拖拽方向相反的单位向量；零位移时朝正上方。 */
export function launchDirection(drag: Vector): Vector {
  const length = Math.hypot(drag.x, drag.y)
  if (length === 0) {
    return { x: 0, y: -1 }
  }
  return { x: -drag.x / length, y: -drag.y / length }
}

/**
 * 滚动轴：骰子朝发射方向在桌面上"纯滚动"时，角速度方向 = 桌面法线 × 发射方向。
 *
 * 桌面法线是场景 +Z，发射方向 d = (dx, dy, 0)，于是
 *   axis = (0,0,1) × (dx, dy, 0) = (-dy, dx, 0)
 * 代入 dx = -px/L、dy = -py/L（发射方向是拖拽的反方向）得到 (py, -px, 0) / L。
 *
 * 效果：往后拉就朝前滚，往左拉就往右滚 —— 翻滚方向跟着投掷方向走。
 * 返回值恒为单位向量且位于水平面内（z 分量为 0，隐含）。
 */
export function rollAxis(pull: Vector): { ax: number; ay: number } {
  const length = Math.hypot(pull.x, pull.y)
  if (length === 0) {
    // 零位移时发射方向是正上方，对应绕 +X 滚动
    return { ax: 1, ay: 0 }
  }
  // 乘除法会产生 -0，它字符串化成 "0" 没问题，但比较时会和 0 不相等，统一归一化
  return { ax: zeroSafe(pull.y / length), ay: zeroSafe(-pull.x / length) }
}

function zeroSafe(value: number): number {
  return value === 0 ? 0 : value
}
