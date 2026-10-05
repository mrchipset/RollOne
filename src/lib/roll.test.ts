import { describe, expect, it } from 'vitest'
import { COLORS, QUESTION_FACE_ID } from '../config/colors'
import { randBelowInSpace } from './random'
import { buildFaces, choice, faceLabel, pickIndex, rollFace } from './roll'

describe('pickIndex', () => {
  it('用注入的随机源决定下标', () => {
    expect(pickIndex(6, () => 0)).toBe(0)
    expect(pickIndex(6, () => 5)).toBe(5)
  })

  it('穷举字空间后能覆盖全部下标', () => {
    const limit = 6
    const space = limit * 4
    const seen = new Set<number>()

    for (let word = 0; word < space; word += 1) {
      seen.add(randBelowInSpace(limit, space, () => word))
    }

    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('拒绝非法面数', () => {
    expect(() => pickIndex(0)).toThrow(RangeError)
    expect(() => pickIndex(-1)).toThrow(RangeError)
    expect(() => pickIndex(2.5)).toThrow(RangeError)
  })
})

describe('choice', () => {
  it('等概率取元素，语义等价于 Python random.choice', () => {
    const items = ['a', 'b', 'c']
    expect(choice(items, () => 0)).toBe('a')
    expect(choice(items, () => 2)).toBe('c')
  })

  it('拒绝空集合', () => {
    expect(() => choice([])).toThrow(RangeError)
  })
})

describe('buildFaces', () => {
  it('在每种颜色之后追加恰好一个问号面', () => {
    const faces = buildFaces(COLORS)

    expect(faces).toHaveLength(COLORS.length + 1)
    expect(faces.slice(0, -1).map((f) => f.id)).toEqual(COLORS.map((c) => c.id))
    expect(faces.at(-1)).toMatchObject({ kind: 'question', id: QUESTION_FACE_ID })
  })

  it('颜色面直接携带颜色值，问号面使用保留色', () => {
    const faces = buildFaces(COLORS)

    faces.slice(0, -1).forEach((face, index) => {
      expect(face.kind).toBe('color')
      expect(face.color).toBe(COLORS[index].color)
    })
    expect(faces.at(-1)?.color).not.toBe(COLORS[0].color)
  })

  it('结果集大小即概率分母', () => {
    expect(buildFaces([])).toHaveLength(1)
  })
})

describe('rollFace', () => {
  it('用注入的随机源决定结果', () => {
    const faces = buildFaces(COLORS)

    expect(rollFace(faces, () => 0).id).toBe(COLORS[0].id)
    expect(rollFace(faces, () => faces.length - 1).kind).toBe('question')
  })

  it('拒绝空结果集', () => {
    expect(() => rollFace([])).toThrow(RangeError)
  })

  it('真实随机源下每个结果各占约 1/(N+1)（±3%）', () => {
    const faces = buildFaces(COLORS)
    const counts = new Map<string, number>()
    const total = 30_000

    for (let i = 0; i < total; i += 1) {
      const id = rollFace(faces).id
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    for (const id of [...COLORS.map((c) => c.id), QUESTION_FACE_ID]) {
      expect(Math.abs((counts.get(id) ?? 0) / total - 1 / faces.length)).toBeLessThan(0.03)
    }
  })
})

describe('faceLabel', () => {
  it('返回可读的中文名', () => {
    const faces = buildFaces(COLORS)
    expect(faceLabel(rollFace(faces, () => 0))).toBe(COLORS[0].label)
    expect(faceLabel(rollFace(faces, () => faces.length - 1))).toMatch(/随机/)
  })
})

