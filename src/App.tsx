import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimationToggle } from './components/AnimationToggle'
import { Dice } from './components/Dice'
import { COLORS } from './config/colors'
import { initialAnimationEnabled, writeAnimationPreference } from './lib/animationPreference'
import { buildSwapSchedule } from './lib/rollAnimation'
import { buildFaces, faceLabel, rollFace, type Face } from './lib/roll'

function App() {
  const faces = useMemo(() => buildFaces(COLORS), [])
  const schedule = useMemo(() => buildSwapSchedule(), [])

  const [face, setFace] = useState<Face>(() => rollFace(faces))
  const [isRolling, setIsRolling] = useState(false)
  const [animationEnabled, setAnimationEnabled] = useState(() => initialAnimationEnabled())

  const nextSwap = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (nextSwap.current !== null) window.clearTimeout(nextSwap.current)
    }
  }, [])

  const updateAnimation = useCallback((enabled: boolean) => {
    setAnimationEnabled(enabled)
    writeAnimationPreference(enabled)
  }, [])

  const roll = useCallback(() => {
    if (isRolling) return

    const finalFace = rollFace(faces)

    if (!animationEnabled) {
      setFace(finalFace)
      return
    }

    setIsRolling(true)

    // 从快到慢地换面，最后定格在最终结果
    let step = 0
    const advance = () => {
      if (step >= schedule.length) {
        nextSwap.current = null
        setFace(finalFace)
        setIsRolling(false)
        return
      }

      setFace(rollFace(faces))
      const delay = schedule[step]
      step += 1
      nextSwap.current = window.setTimeout(advance, delay)
    }

    advance()
  }, [animationEnabled, faces, isRolling, schedule])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-white px-6 py-10 text-slate-900">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">RollOne 骰子</h1>
        <p className="mt-2 text-sm text-slate-500">
          共 {faces.length} 种等概率结果 · {COLORS.length} 种颜色 + 1 个问号
        </p>
      </header>

      <Dice face={face} isRolling={isRolling} animationEnabled={animationEnabled} />

      <div className="flex w-full max-w-[min(78vw,22rem)] flex-col items-center gap-3">
        <button
          type="button"
          onClick={roll}
          disabled={isRolling}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRolling ? '投掷中…' : '投掷骰子'}
        </button>

        <p className="text-sm text-slate-500" role="status" aria-live="polite">
          {isRolling ? '投掷中…' : `结果：${faceLabel(face)}`}
        </p>

        <AnimationToggle enabled={animationEnabled} onChange={updateAnimation} />
      </div>
    </main>
  )
}

export default App
