import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimationToggle } from './components/AnimationToggle'
import { Dice3D } from './components/Dice3D'
import { COLORS } from './config/colors'
import { initialAnimationEnabled, writeAnimationPreference } from './lib/animationPreference'
import { cubeTransform, faceIndexToLandingEuler, type Euler } from './lib/cube'
import { randomUint32 } from './lib/random'
import { buildFaces, faceLabel, pickIndex, type Face } from './lib/roll'
import { deriveSeed, mulberry32 } from './lib/seededRandom'
import {
  DEFAULT_FORCE,
  MAX_PULL_PX,
  dragDistance,
  forceFromDistance,
  isThrowable,
  launchDirection,
  pullFromDrag,
  type Vector,
} from './lib/slingshot'
import { EASE_FLY, EASE_SETTLE, RELEASE_MS, buildTumblePlan, flightOffset } from './lib/tumble'

type Phase = 'idle' | 'dragging' | 'flying' | 'settling'

/** 场景俯视倾角，必须与 index.css 里 .dice-scene 的 rotateX 一致。 */
const SCENE_TILT_DEG = 45
const SCENE_COS = Math.cos((SCENE_TILT_DEG * Math.PI) / 180)

/** 拖拽时骰子顺着拉力额外倾斜的最大角度。 */
const DRAG_TILT_DEG = 16

const REST_SHADOW_OPACITY = 0.32
const FLIGHT_SHADOW_OPACITY = 0.14

type Visual = {
  transform: string
  transitionMs: number
  easing: string
  shadowTransform: string
  shadowOpacity: number
  shadowTransitionMs: number
  dragging: boolean
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function shadowTransformAt(x: number, y: number, scale: number): string {
  return (
    `translate(calc(-50% + ${round(x, 2)}px), calc(-50% + ${round(y, 2)}px)) ` +
    `scale(${round(scale, 3)})`
  )
}

function restVisual(slot: number, transitionMs = 0, easing = EASE_SETTLE): Visual {
  return {
    transform: cubeTransform({ x: 0, y: 0, z: 0 }, faceIndexToLandingEuler(slot)),
    transitionMs,
    easing,
    shadowTransform: shadowTransformAt(0, 0, 1),
    shadowOpacity: REST_SHADOW_OPACITY,
    shadowTransitionMs: transitionMs,
    dragging: false,
  }
}

/** 拖拽时把底座姿态叠上一点顺着力方向的倾斜，手感更"拉得住"。 */
function tiltedEuler(base: Euler, pull: Vector): Euler {
  const nx = Math.min(Math.max(pull.x / MAX_PULL_PX, -1), 1)
  const ny = Math.min(Math.max(pull.y / MAX_PULL_PX, -1), 1)
  return {
    rx: base.rx + ny * DRAG_TILT_DEG,
    ry: base.ry,
    rz: base.rz - nx * DRAG_TILT_DEG,
  }
}

function statusText(phase: Phase, label: string): string {
  if (phase === 'dragging') return '松手发射'
  if (phase === 'idle') return `结果：${label}`
  return '投掷中…'
}

function App() {
  const faces = useMemo(() => buildFaces(COLORS), [])

  const [boot] = useState(() => {
    const slot = pickIndex(faces.length)
    return { slot, pose: faceIndexToLandingEuler(slot) }
  })

  const [topSlot, setTopSlot] = useState(boot.slot)
  const [phase, setPhase] = useState<Phase>('idle')
  const [visual, setVisual] = useState<Visual>(() => restVisual(boot.slot))
  const [animationEnabled, setAnimationEnabled] = useState(() => initialAnimationEnabled())

  /** 当前静止姿态（含累计整圈数），拖拽时以它为基准叠加倾斜。 */
  const poseRef = useRef<Euler>(boot.pose)
  const turnsRef = useRef(0)
  const dragStartRef = useRef<Vector | null>(null)
  const dragRef = useRef<Vector>({ x: 0, y: 0 })
  const flyTimer = useRef<number | null>(null)
  const settleTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (flyTimer.current !== null) window.clearTimeout(flyTimer.current)
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    }
  }, [])

  const updateAnimation = useCallback((enabled: boolean) => {
    setAnimationEnabled(enabled)
    writeAnimationPreference(enabled)
  }, [])

  const launch = useCallback(
    (force: number, direction: Vector) => {
      // 拉力参与种子，但混入本次投掷新取的 CSPRNG 熵 —— 所以每个面仍然严格等概率
      const targetSlot = pickIndex(faces.length, mulberry32(deriveSeed(force, randomUint32())))

      if (!animationEnabled) {
        const pose = faceIndexToLandingEuler(targetSlot)
        poseRef.current = pose
        setTopSlot(targetSlot)
        setPhase('idle')
        setVisual(restVisual(targetSlot))
        return
      }

      const plan = buildTumblePlan(force)
      const turns = turnsRef.current + plan.flySpins + plan.settleSpins
      turnsRef.current = turns

      const base = faceIndexToLandingEuler(targetSlot)
      // 三轴同时加 360° 整圈：模 360 等价于落地姿态，但插值时会真的转起来。
      // 起飞段先转掉大部分，回落段再补最后一圈 —— 摊开后峰值角速度显著低于全挤在起飞段。
      const settledTurns = turns - plan.settleSpins
      const midPose: Euler = {
        rx: base.rx + 360 * settledTurns,
        ry: base.ry + 360 * settledTurns,
        rz: base.rz + 360 * settledTurns,
      }
      const finalPose: Euler = {
        rx: base.rx + 360 * turns,
        ry: base.ry + 360 * turns,
        rz: base.rz + 360 * turns,
      }
      poseRef.current = finalPose

      const offset = flightOffset(direction, plan)

      setPhase('flying')
      setVisual({
        transform: cubeTransform({ x: offset.x, y: offset.y, z: plan.liftPx }, midPose),
        transitionMs: plan.flyMs,
        easing: EASE_FLY,
        shadowTransform: shadowTransformAt(offset.x, offset.y, 0.62),
        shadowOpacity: FLIGHT_SHADOW_OPACITY,
        shadowTransitionMs: plan.flyMs,
        dragging: false,
      })

      flyTimer.current = window.setTimeout(() => {
        flyTimer.current = null
        setPhase('settling')
        setVisual({
          transform: cubeTransform({ x: 0, y: 0, z: 0 }, finalPose),
          transitionMs: plan.settleMs,
          easing: EASE_SETTLE,
          shadowTransform: shadowTransformAt(0, 0, 1),
          shadowOpacity: REST_SHADOW_OPACITY,
          shadowTransitionMs: plan.settleMs,
          dragging: false,
        })

        settleTimer.current = window.setTimeout(() => {
          settleTimer.current = null
          setTopSlot(targetSlot)
          setPhase('idle')
          setVisual((current) => ({ ...current, transitionMs: 0, shadowTransitionMs: 0 }))
        }, plan.settleMs)
      }, plan.flyMs)
    },
    [animationEnabled, faces],
  )

  const resetToRest = useCallback((transitionMs: number) => {
    dragStartRef.current = null
    dragRef.current = { x: 0, y: 0 }
    setPhase('idle')
    setVisual({
      transform: cubeTransform({ x: 0, y: 0, z: 0 }, poseRef.current),
      transitionMs,
      easing: EASE_SETTLE,
      shadowTransform: shadowTransformAt(0, 0, 1),
      shadowOpacity: REST_SHADOW_OPACITY,
      shadowTransitionMs: transitionMs,
      dragging: false,
    })
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== 'idle') return
      // jsdom 未实现指针捕获，必须可选调用，否则组件测试会直接抛错
      event.currentTarget.setPointerCapture?.(event.pointerId)
      dragStartRef.current = { x: event.clientX, y: event.clientY }
      dragRef.current = { x: 0, y: 0 }
      setPhase('dragging')
      setVisual((current) => ({ ...current, dragging: true, transitionMs: 0 }))
    },
    [phase],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current
      if (phase !== 'dragging' || !start) return

      const pull = pullFromDrag(start, { x: event.clientX, y: event.clientY })
      dragRef.current = pull

      // 场景被倾斜了 45°，屏幕纵向位移要除以 cos 才能让骰子精确跟手
      const sceneX = pull.x
      const sceneY = pull.y / SCENE_COS

      setVisual((current) => ({
        ...current,
        transform: cubeTransform({ x: sceneX, y: sceneY, z: 0 }, tiltedEuler(poseRef.current, pull)),
        shadowTransform: shadowTransformAt(sceneX, sceneY, 1),
      }))
    },
    [phase],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== 'dragging') return
      event.currentTarget.releasePointerCapture?.(event.pointerId)

      const pull = dragRef.current
      const distance = dragDistance(pull)

      if (!isThrowable(distance)) {
        resetToRest(RELEASE_MS)
        return
      }

      launch(forceFromDistance(distance), launchDirection(pull))
    },
    [launch, phase, resetToRest],
  )

  const onPointerCancel = useCallback(() => {
    if (phase !== 'dragging') return
    resetToRest(RELEASE_MS)
  }, [phase, resetToRest])

  const rollViaButton = useCallback(() => {
    if (phase !== 'idle') return
    launch(DEFAULT_FORCE, { x: 0, y: -1 })
  }, [launch, phase])

  const shadowStyle: CSSProperties = {
    transform: visual.shadowTransform,
    opacity: visual.shadowOpacity,
    transitionDuration: `${visual.shadowTransitionMs}ms`,
  }

  const topFace: Face | undefined = faces[topSlot]
  const rolling = phase === 'flying' || phase === 'settling'

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 py-10 text-slate-900">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">RollOne 骰子</h1>
        <p className="mt-2 text-sm text-slate-500">
          拖住骰子向后拉再松手 · {COLORS.length} 种颜色 + 1 个问号，共 {faces.length} 种等概率结果
        </p>
      </header>

      <Dice3D
        faces={faces}
        transform={visual.transform}
        transitionMs={visual.transitionMs}
        easing={visual.easing}
        shadowStyle={shadowStyle}
        topSlot={topSlot}
        dragging={visual.dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />

      <div className="flex w-full max-w-[min(78vw,22rem)] flex-col items-center gap-3">
        <button
          type="button"
          onClick={rollViaButton}
          disabled={phase !== 'idle'}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rolling ? '投掷中…' : '投掷骰子'}
        </button>

        <p className="text-sm text-slate-500" role="status" aria-live="polite">
          {statusText(phase, topFace ? faceLabel(topFace) : '')}
        </p>

        <AnimationToggle enabled={animationEnabled} onChange={updateAnimation} />
      </div>
    </main>
  )
}

export default App
