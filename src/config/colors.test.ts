import { describe, expect, it } from 'vitest'
import { COLORS, QUESTION_FACE, QUESTION_FACE_ID, assertValidColors, type ColorDef } from './colors'

function makeColor(overrides: Partial<ColorDef> = {}): ColorDef {
  return { id: 'x', label: 'X', color: '#ffffff', ...overrides }
}

describe('COLORS 默认配置', () => {
  it('非空且全部合法', () => {
    expect(COLORS.length).toBeGreaterThan(0)
    expect(() => assertValidColors(COLORS)).not.toThrow()
  })

  it('id 唯一', () => {
    const ids = COLORS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('不占用问号面的保留 id', () => {
    expect(COLORS.some((c) => c.id === QUESTION_FACE_ID)).toBe(false)
    expect(QUESTION_FACE.id).toBe(QUESTION_FACE_ID)
  })

  it('每种颜色互不相同', () => {
    const hexes = COLORS.map((c) => c.color.toLowerCase())
    expect(new Set(hexes).size).toBe(hexes.length)
  })
})

describe('assertValidColors', () => {
  it('拒绝空列表', () => {
    expect(() => assertValidColors([])).toThrow(/至少/)
  })

  it('拒绝重复 id', () => {
    expect(() => assertValidColors([makeColor(), makeColor()])).toThrow(/重复/)
  })

  it('拒绝空白字段', () => {
    expect(() => assertValidColors([makeColor({ id: '  ' })])).toThrow(/id/)
    expect(() => assertValidColors([makeColor({ label: '  ' })])).toThrow(/label/)
  })

  it('拒绝非法颜色', () => {
    expect(() => assertValidColors([makeColor({ color: 'red' })])).toThrow(/color/)
    expect(() => assertValidColors([makeColor({ color: '#12345' })])).toThrow(/color/)
  })

  it('拒绝占用保留 id', () => {
    expect(() => assertValidColors([makeColor({ id: QUESTION_FACE_ID })])).toThrow(/保留值/)
  })
})

