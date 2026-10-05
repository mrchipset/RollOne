/**
 * 颜色骰子的唯一配置入口。
 *
 * 等概率结果集 = COLORS 中的每种颜色 + 1 个问号面，
 * 因此每个结果的概率恒为 1 / (COLORS.length + 1)。
 * 增删颜色只需要改这个文件，无需动其它代码。
 */

export type ColorDef = {
  /** 唯一标识；保留值 'question' 不可使用 */
  id: string
  /** 中文颜色名，用于结果播报 */
  label: string
  /** 骰子面颜色 */
  color: string
}

/** 问号面的保留标识，颜色 id 不可与之冲突 */
export const QUESTION_FACE_ID = 'question'

export const QUESTION_FACE = {
  id: QUESTION_FACE_ID,
  label: '随机（问号）',
  color: '#64748b',
} as const

const QUESTION_ID = QUESTION_FACE_ID
const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * 默认调色板：5 种颜色，因此当前共有 6 个等概率结果。
 *
 * 颜色取自实体教具照片的像素采样（受光面众数，未做白平衡放大）：
 * 红=梯形 #BB3A3C / 橙=六边形 #AD692A / 黄=菱形 #EACB26 / 绿=圆片 #335D2C。
 * 紫色半圆片有较大自遮挡侧面（44% 像素落在 #564569），故取其受光面 #9D92AD
 * 与暗面之间的偏暗中间值 #7F7099 作为代表色。
 */
export const COLORS: ColorDef[] = [
  { id: 'red', label: '红色', color: '#bb3a3c' },
  { id: 'orange', label: '橙色', color: '#ad692a' },
  { id: 'yellow', label: '黄色', color: '#eacb26' },
  { id: 'green', label: '绿色', color: '#335d2c' },
  { id: 'purple', label: '紫色', color: '#7f7099' },
]

/** 校验颜色配置，配置非法时立即抛错，避免静默产生错误的概率分布。 */
export function assertValidColors(colors: ColorDef[]): void {
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new Error('COLORS 至少需要包含 1 种颜色')
  }

  const seen = new Set<string>()

  colors.forEach((entry, index) => {
    const at = `COLORS[${index}]`
    if (typeof entry.id !== 'string' || entry.id.trim() === '') {
      throw new Error(`${at}.id 必须是非空字符串`)
    }
    if (entry.id === QUESTION_ID) {
      throw new Error(`${at}.id 不能使用保留值 "${QUESTION_ID}"`)
    }
    if (seen.has(entry.id)) {
      throw new Error(`${at}.id 重复："${entry.id}"`)
    }
    seen.add(entry.id)

    if (typeof entry.label !== 'string' || entry.label.trim() === '') {
      throw new Error(`${at}.label 必须是非空字符串`)
    }
    if (typeof entry.color !== 'string' || !COLOR_PATTERN.test(entry.color)) {
      throw new Error(`${at}.color 必须是 #RGB/#RRGGBB 形式的颜色，收到 "${entry.color}"`)
    }
  })
}

assertValidColors(COLORS)
