import { QUESTION_FACE, type ColorDef } from '../config/colors'
import { randBelow, type Uint32Source } from './random'

export type Face = {
  kind: 'color' | 'question'
  id: string
  /** 中文名，用于结果播报 */
  label: string
  /** 骰子面颜色 */
  color: string
}

/** 由颜色配置构造等概率结果集：每种颜色一面，末尾追加一个问号面。 */
export function buildFaces(colors: ColorDef[]): Face[] {
  return [
    ...colors.map(
      (entry): Face => ({
        kind: 'color',
        id: entry.id,
        label: entry.label,
        color: entry.color,
      }),
    ),
    {
      kind: 'question',
      id: QUESTION_FACE.id,
      label: QUESTION_FACE.label,
      color: QUESTION_FACE.color,
    },
  ]
}

/** 等概率返回 [0, faceCount) 内的下标；无偏性与随机源注入见 randBelow。 */
export function pickIndex(faceCount: number, source?: Uint32Source): number {
  return randBelow(faceCount, source)
}

/** 等概率从集合中取一个元素，语义等价于 Python 的 `random.choice`。 */
export function choice<T>(items: readonly T[], source?: Uint32Source): T {
  if (items.length === 0) {
    throw new RangeError('choice 不能用于空集合')
  }

  return items[pickIndex(items.length, source)]
}

/** 从结果集中等概率抽取一个结果。 */
export function rollFace(faces: Face[], source?: Uint32Source): Face {
  return choice(faces, source)
}

/** 结果的中文展示文案。 */
export function faceLabel(face: Face): string {
  return face.label
}

