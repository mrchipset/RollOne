/** CSS 坐标系：+X 右、+Y 下、+Z 朝观察者。立方体位于"场景"坐标系里， */
/** 场景再整体施加一个绕 X 轴的俯视倾角，因此场景的 +Z 就是桌面法线（骰子顶面方向）。 */

export type Vec3 = readonly [number, number, number]

export type Euler = { rx: number; ry: number; rz: number }

/** 立方体 6 个槽位的固定顺序，下标即 Face 数组下标。 */
export const CUBE_SLOTS = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const
export type CubeSlot = (typeof CUBE_SLOTS)[number]

/** 每个槽位在立方体局部坐标系中朝外的法向量。 */
export const SLOT_NORMALS: Record<CubeSlot, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, -1, 0],
  bottom: [0, 1, 0],
}

/**
 * 每个面元素自身的变换作用在「元素内向下方向 (0,1,0)」上的结果。
 * 用于校验落到顶面时，面上的文字/问号是否相对镜头正立。
 */
export const SLOT_FACE_DOWN: Record<CubeSlot, Vec3> = {
  front: [0, 1, 0],
  back: [0, 1, 0],
  right: [0, 1, 0],
  left: [0, 1, 0],
  top: [0, 0, 1],
  bottom: [0, 0, -1],
}

/** 骰子顶面必须朝向的方向：场景里"从桌面往上"。 */
export const TABLE_UP: Vec3 = [0, 0, 1]

/** 面上的文字"向下"最终必须朝向的方向：场景里"朝着观察者"。 */
export const FACE_DOWN_TARGET: Vec3 = [0, 1, 0]

/** 面心到立方体中心的距离，也就是棱长的一半；棱长由 CSS 变量 --cube-size 决定。 */
const CUBE_HALF = 'calc(var(--cube-size) / 2)'

/**
 * 六个面在立方体上的静态摆放。这里是摆放的**唯一真相**，
 * 由 Dice3D 直接写进 inline style，因此不存在"CSS 改了、JS 表没改"的错配可能。
 * 单测会从这些字符串反解旋转，验证解出的法向与 SLOT_NORMALS / SLOT_FACE_DOWN 一致。
 */
export const SLOT_TRANSFORMS: Record<CubeSlot, string> = {
  front: `translateZ(${CUBE_HALF})`,
  back: `rotateY(180deg) translateZ(${CUBE_HALF})`,
  right: `rotateY(90deg) translateZ(${CUBE_HALF})`,
  left: `rotateY(-90deg) translateZ(${CUBE_HALF})`,
  top: `rotateX(90deg) translateZ(${CUBE_HALF})`,
  bottom: `rotateX(-90deg) translateZ(${CUBE_HALF})`,
}

/**
 * 每个槽位转到"朝上"所需的姿态，用于 `transform: rotateY(ry) rotateX(rx) rotateZ(rz)`。
 *
 * 注意目标不是"屏幕上方向"而是场景 +Z（桌面法线）：在 45° 俯视场景里，
 * 屏幕上方向对应的是背离观察者、平躺在桌面上的那一面，不是骰子顶面。
 */
const LANDING: Record<CubeSlot, Euler> = {
  front: { rx: 0, ry: 0, rz: 0 },
  back: { rx: 0, ry: 180, rz: 0 },
  right: { rx: 0, ry: -90, rz: 0 },
  left: { rx: 0, ry: 90, rz: 0 },
  top: { rx: -90, ry: 0, rz: 0 },
  bottom: { rx: 90, ry: 0, rz: 0 },
}

const DEG = Math.PI / 180

type Rotator = (v: Vec3, deg: number) => Vec3

const aboutX: Rotator = ([x, y, z], deg) => {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return [x, y * c - z * s, y * s + z * c]
}

const aboutY: Rotator = ([x, y, z], deg) => {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return [x * c + z * s, y, -x * s + z * c]
}

const aboutZ: Rotator = ([x, y, z], deg) => {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return [x * c - y * s, x * s + y * c, z]
}

/**
 * 把姿态作用到向量上，顺序与 CSS `rotateY(ry) rotateX(rx) rotateZ(rz)` 一致：
 * 先绕 Z、再绕 X、最后绕 Y。
 */
export function rotateNormal(euler: Euler, vector: Vec3): Vec3 {
  return aboutY(aboutX(aboutZ(vector, euler.rz), euler.rx), euler.ry)
}

/** 某个槽位（= 结果下标）落地后的姿态。 */
export function faceIndexToLandingEuler(index: number): Euler {
  if (!Number.isInteger(index) || index < 0 || index >= CUBE_SLOTS.length) {
    throw new RangeError(`槽位下标必须落在 [0, ${CUBE_SLOTS.length}) 内，收到 ${index}`)
  }
  return { ...LANDING[CUBE_SLOTS[index]] }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** 生成骰子的 `transform` 字符串；位移在前，旋转三轴顺序固定，便于 CSS 逐分量插值。 */
export function cubeTransform(
  translate: { x: number; y: number; z: number },
  euler: Euler,
): string {
  return (
    `translate3d(${round(translate.x)}px, ${round(translate.y)}px, ${round(translate.z)}px) ` +
    `rotateY(${round(euler.ry)}deg) rotateX(${round(euler.rx)}deg) rotateZ(${round(euler.rz)}deg)`
  )
}
