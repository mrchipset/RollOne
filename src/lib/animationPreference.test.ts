import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANIMATION_PREFERENCE_KEY,
  initialAnimationEnabled,
  prefersReducedMotion,
  readAnimationPreference,
  writeAnimationPreference,
} from './animationPreference'

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches })),
  )
}

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('系统要求减少动态效果时返回 true', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('系统未要求时返回 false', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('读写开关', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('从未保存过时返回 null', () => {
    expect(readAnimationPreference()).toBeNull()
  })

  it('能读回写入的 true / false', () => {
    writeAnimationPreference(false)
    expect(localStorage.getItem(ANIMATION_PREFERENCE_KEY)).toBe('false')
    expect(readAnimationPreference()).toBe(false)

    writeAnimationPreference(true)
    expect(readAnimationPreference()).toBe(true)
  })

  it('存储里是垃圾值时按未保存处理', () => {
    localStorage.setItem(ANIMATION_PREFERENCE_KEY, 'maybe')
    expect(readAnimationPreference()).toBeNull()
  })
})

describe('initialAnimationEnabled', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('没有保存值时跟随系统：未要求减少动态效果则开启', () => {
    stubMatchMedia(false)
    expect(initialAnimationEnabled()).toBe(true)
  })

  it('没有保存值时跟随系统：要求减少动态效果则关闭', () => {
    stubMatchMedia(true)
    expect(initialAnimationEnabled()).toBe(false)
  })

  it('用户显式保存的值优先于系统偏好', () => {
    stubMatchMedia(true)
    writeAnimationPreference(true)
    expect(initialAnimationEnabled()).toBe(true)

    stubMatchMedia(false)
    writeAnimationPreference(false)
    expect(initialAnimationEnabled()).toBe(false)
  })
})

