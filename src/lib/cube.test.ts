import { describe, expect, it } from 'vitest'
import {
  CUBE_SLOTS,
  FACE_DOWN_TARGET,
  SLOT_FACE_DOWN,
  SLOT_NORMALS,
  SLOT_TRANSFORMS,
  TABLE_UP,
  cubeTransform,
  faceIndexToLandingEuler,
  rotateNormal,
  type CubeSlot,
  type Vec3,
} from './cube'

function expectVec(actual: Vec3, expected: Vec3): void {
  const precision = 6
  expect(actual[0]).toBeCloseTo(expected[0], precision)
  expect(actual[1]).toBeCloseTo(expected[1], precision)
  expect(actual[2]).toBeCloseTo(expected[2], precision)
}

describe('落地姿态的几何正确性', () => {
  it('每个槽位落地后，该面的法向都指向桌面法线（即成为骰子顶面）', () => {
    CUBE_SLOTS.forEach((slot, index) => {
      const euler = faceIndexToLandingEuler(index)
      expectVec(rotateNormal(euler, SLOT_NORMALS[slot]), TABLE_UP)
    })
  })

  it('每个槽位落地后，该面上的文字方向相对镜头正立', () => {
    CUBE_SLOTS.forEach((slot, index) => {
      const euler = faceIndexToLandingEuler(index)
      expectVec(rotateNormal(euler, SLOT_FACE_DOWN[slot]), FACE_DOWN_TARGET)
    })
  })

  it('六个槽位的姿态互不相同', () => {
    const keys = CUBE_SLOTS.map((_, index) => JSON.stringify(faceIndexToLandingEuler(index)))
    expect(new Set(keys).size).toBe(CUBE_SLOTS.length)
  })

  it('每个槽位落地后，朝上的正好是它自己（不会有两个面同时朝上）', () => {
    CUBE_SLOTS.forEach((slot, index) => {
      const euler = faceIndexToLandingEuler(index)
      const ups = CUBE_SLOTS.filter((other) =>
        rotateNormal(euler, SLOT_NORMALS[other]).every((v, i) => Math.abs(v - TABLE_UP[i]) < 1e-6),
      )
      expect(ups).toEqual([slot])
    })
  })
})

/**
 * SLOT_TRANSFORMS 是六个面摆放的唯一真相，SLOT_NORMALS / SLOT_FACE_DOWN 是对它的解读。
 * 这里把 transform 字符串反解回旋转矩阵，验证两张解读表确实与摆放一致 ——
 * 改错了任何一条摆放，或者表没跟着更新，都会立刻失败。
 */
describe('面摆放与法向量表一致', () => {
  function parseTransform(slot: CubeSlot): string[] {
    return [...SLOT_TRANSFORMS[slot].matchAll(/(rotateX|rotateY|rotateZ)\((-?[\d.]+)deg\)/g)].map(
      (m) => `${m[1]}:${m[2]}`,
    )
  }

  function applyPlacement(slot: CubeSlot, vector: Vec3): Vec3 {
    const ops = [...SLOT_TRANSFORMS[slot].matchAll(/(rotateX|rotateY|rotateZ)\((-?[\d.]+)deg\)/g)]
      .map((m) => ({ axis: m[1], deg: Number(m[2]) }))
      .reverse() // transform 列表左乘，最右边的变换先作用到向量上

    return ops.reduce<Vec3>((acc, op) => {
      return rotateNormal(
        {
          rx: op.axis === 'rotateX' ? op.deg : 0,
          ry: op.axis === 'rotateY' ? op.deg : 0,
          rz: op.axis === 'rotateZ' ? op.deg : 0,
        },
        acc,
      )
    }, vector)
  }

  it('六个面摆放解出的朝向与 SLOT_NORMALS 完全一致', () => {
    for (const slot of CUBE_SLOTS) {
      expectVec(applyPlacement(slot, [0, 0, 1]), SLOT_NORMALS[slot])
    }
  })

  it('六个面摆放解出的「面内向下方向」与 SLOT_FACE_DOWN 完全一致', () => {
    for (const slot of CUBE_SLOTS) {
      expectVec(applyPlacement(slot, [0, 1, 0]), SLOT_FACE_DOWN[slot])
    }
  })

  it('每个面都是「先旋转、再平移出半个棱长」，且只旋转一次', () => {
    for (const slot of CUBE_SLOTS) {
      const transform = SLOT_TRANSFORMS[slot]
      expect(transform).toContain('translateZ(calc(var(--cube-size) / 2))')
      expect(parseTransform(slot).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('faceIndexToLandingEuler', () => {
  it('返回姿态的副本，改动它不会污染常量表', () => {
    const first = faceIndexToLandingEuler(0)
    first.rx = 999
    expect(faceIndexToLandingEuler(0).rx).toBe(0)
  })

  it('拒绝越界与非法下标', () => {
    expect(() => faceIndexToLandingEuler(-1)).toThrow(RangeError)
    expect(() => faceIndexToLandingEuler(6)).toThrow(RangeError)
    expect(() => faceIndexToLandingEuler(1.5)).toThrow(RangeError)
  })
})

describe('rotateNormal', () => {
  it('单位姿态不改变向量', () => {
    expectVec(rotateNormal({ rx: 0, ry: 0, rz: 0 }, [1, 2, 3]), [1, 2, 3])
  })

  it('顺序与 CSS rotateY(ry) rotateX(rx) rotateZ(rz) 一致（先 Z 再 X 后 Y）', () => {
    const euler = { rx: 90, ry: 0, rz: 90 }
    // (1,0,0) 先绕 Z 转 90° → (0,1,0)，再绕 X 转 90° → (0,0,1)
    expectVec(rotateNormal(euler, [1, 0, 0]), [0, 0, 1])
  })
})

describe('cubeTransform', () => {
  const restSpin = { ax: 1, ay: 0, deg: 0 }

  it('函数列表顺序固定：位移 → rotate3d → 落地姿态三轴', () => {
    const transform = cubeTransform({ x: 12, y: -3, z: 40 }, { rx: 90, ry: -90, rz: 0 }, restSpin)
    expect(transform).toBe(
      'translate3d(12px, -3px, 40px) rotate3d(1, 0, 0, 0deg) ' +
        'rotateY(-90deg) rotateX(90deg) rotateZ(0deg)',
    )
  })

  it('位移保留两位小数，避免逐帧微抖动写出超长字符串', () => {
    const transform = cubeTransform({ x: 1.23456, y: 0, z: 0 }, { rx: 0, ry: 0, rz: 0 }, restSpin)
    expect(transform).toContain('translate3d(1.23px, 0px, 0px)')
  })

  it('滚动轴按原样写进 rotate3d，任意方向都保留足够精度', () => {
    const axis = { ax: Math.SQRT1_2, ay: -Math.SQRT1_2, deg: 720 }
    const transform = cubeTransform({ x: 0, y: 0, z: 0 }, { rx: 0, ry: 0, rz: 0 }, axis)
    expect(transform).toContain('rotate3d(0.707107, -0.707107, 0, 720deg)')
  })

  it('依次调用时 rotate3d 排在落地姿态之前，两者的角度互不干扰', () => {
    const transform = cubeTransform(
      { x: 0, y: 0, z: 0 },
      { rx: 90, ry: 180, rz: 0 },
      { ax: 0, ay: 1, deg: 1080 },
    )
    expect(transform.indexOf('rotate3d')).toBeLessThan(transform.indexOf('rotateY'))
    expect(transform).toContain('rotate3d(0, 1, 0, 1080deg)')
    expect(transform).toContain('rotateY(180deg) rotateX(90deg) rotateZ(0deg)')
  })
})

describe('RollSpin 静止语义', () => {
  it('deg 为 360 的整数倍时，任意轴的 rotate3d 都是等效的（所以换轴、清零不会跳变）', () => {
    const euler = { rx: 0, ry: 0, rz: 0 }
    const a = cubeTransform({ x: 0, y: 0, z: 0 }, euler, { ax: 1, ay: 0, deg: 720 })
    const b = cubeTransform({ x: 0, y: 0, z: 0 }, euler, { ax: 0, ay: 1, deg: 1080 })
    const stripSpin = (t: string) => t.replace(/rotate3d\([^)]*\)\s*/, '')
    expect(stripSpin(a)).toBe(stripSpin(b))
  })
})
