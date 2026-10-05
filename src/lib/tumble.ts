import type { Vector } from './slingshot'

export type TumblePlan = {
  /** 起飞段时长（毫秒） */
  flyMs: number
  /** 回落定格段时长（毫秒） */
  settleMs: number
  /** 翻滚的整圈数。全部发生在起飞段，回落段只平移、不再转。 */
  spins: number
  /** 飞行距离相对于 MAX_FLIGHT_PX 的比例 */
  flyScale: number
  /** 抬升高度（场景 Z，CSS px） */
  liftPx: number
}

/** 飞行位移上限。必须小于舞台半径减去骰子半径，保证骰子不会飞出舞台。 */
export const MAX_FLIGHT_PX = 80

/**
 * 全局时间缩放：1 = 基准速度，2 = 1/2 速度（当前设置）。
 *
 * 只放大时长，**不改圈数与飞行距离** —— 这样才是"同样的动作放慢/加快"，
 * 而不是"转得更多圈、飞得更远"。想调速改这一个数字即可。
 *
 * 注意：缩短总时长会**同比抬高**翻滚角速度。所以改这里之后，
 * 要么同步调整圈数，要么确认「翻滚速度不会引起眩晕」那组单测仍然通过。
 */
export const TIME_SCALE = 2

/**
 * 起飞段缓动。
 *
 * 这里刻意选**低起步斜率**的曲线：`cubic-bezier(x1,y1,…)` 的起步斜率约等于 y1/x1，
 * 而翻滚的峰值转速 = 平均转速 × 起步斜率。原先用的 (0.18, 0.72) 斜率为 4，
 * 把四圈全压在开头，峰值冲到 ~10 圈/秒，看久了会晕。
 * 现在降不到 1.5，起步柔和，峰值落在舒适区间内。
 */
export const EASE_FLY = 'cubic-bezier(0.35, 0.5, 0.6, 1)'

/** 落地段缓动；y 分量 > 1 制造轻微过冲，更像真的停稳。 */
export const EASE_SETTLE = 'cubic-bezier(0.22, 1.18, 0.36, 1)'

/**
 * 回落段缓动。起步斜率刻意取 **0**。
 *
 * 起飞段是 ease-out，结尾速度已经归零；回落段若再从一个高斜率起步
 * （比如 EASE_SETTLE 的 5.36），视觉上就是"停一下、又突然转起来"的断裂感。
 * 从 0 斜率起步才能和起飞段接得上，读起来是一段连续的"飞到顶点再滑回中心"。
 */
export const EASE_RETURN = 'cubic-bezier(0.4, 0, 0.2, 1)'

/** 力度不足松手时的回弹时长（刻意不跟随 TIME_SCALE，取消操作要保持跟手）。 */
export const RELEASE_MS = 260

/**
 * 起飞段占整段时长的比例。
 *
 * 翻滚全部发生在起飞段，所以这一段越长、转速越低。拉高这个比例是缩短总时长之后
 * 仍然压得住角速度的关键手段；代价是回落段变短，正好也符合"直接回到中央"。
 */
export const FLY_SHARE = 0.6

/**
 * 力度 → 翻滚计划。力越大：飞得越远、抬得越高、转得越久。
 * 所有输出都由 force 单调决定，便于单测校验边界。
 */
export function buildTumblePlan(force: number, timeScale: number = TIME_SCALE): TumblePlan {
  if (!Number.isFinite(force)) {
    throw new RangeError(`force 必须是有限数字，收到 ${force}`)
  }
  if (!(timeScale > 0)) {
    throw new RangeError(`timeScale 必须是正数，收到 ${timeScale}`)
  }

  const f = Math.min(Math.max(force, 0), 1)

  // 整段总时长不变，只在两段之间重新分配
  const totalMs = 620 + 260 * f

  return {
    flyMs: Math.round(totalMs * FLY_SHARE * timeScale),
    settleMs: Math.round(totalMs * (1 - FLY_SHARE)),
    // 只转很少几圈，且全部在起飞段完成
    spins: 2,
    flyScale: 0.35 + 0.65 * f,
    liftPx: Math.round(40 + 90 * f),
  }
}

/** 松手后骰子飞出的位移（场景坐标，CSS px），方向由拖拽反方向决定、距离由力度决定。 */
export function flightOffset(direction: Vector, plan: TumblePlan): Vector {
  const magnitude = MAX_FLIGHT_PX * plan.flyScale
  return { x: direction.x * magnitude, y: direction.y * magnitude }
}
