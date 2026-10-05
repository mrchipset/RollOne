/**
 * 投掷动画开关：持久化读写 + 默认值推导。
 *
 * 默认值尊重系统的「减少动态效果」偏好；但用户一旦显式切换过开关，
 * 就以用户的选择为准（显式选择优先于系统设置）。
 */

export const ANIMATION_PREFERENCE_KEY = 'rollone:animation-enabled'

/** 系统是否要求减少动态效果。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 取 localStorage；在不可用的运行时（SSR、沙箱）返回 null 而不是抛错。 */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // 某些浏览器在禁用存储时，连读取 localStorage 本身都会抛错
    return null
  }
}

/** 读取已保存的开关；从未保存过、值非法或存储不可用时返回 null。 */
export function readAnimationPreference(): boolean | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(ANIMATION_PREFERENCE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

/** 保存开关；存储不可用时静默忽略，本次会话内的状态依然生效。 */
export function writeAnimationPreference(enabled: boolean): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(ANIMATION_PREFERENCE_KEY, String(enabled))
  } catch {
    // 忽略：写不进去只影响下次访问，不影响当前状态
  }
}

/** 首次渲染的初始开关：优先用户保存值，其次系统偏好，默认开启。 */
export function initialAnimationEnabled(): boolean {
  return readAnimationPreference() ?? !prefersReducedMotion()
}

