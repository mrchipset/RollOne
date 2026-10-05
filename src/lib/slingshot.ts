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

