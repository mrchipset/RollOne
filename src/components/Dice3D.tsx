import type { CSSProperties, PointerEventHandler } from 'react'
import { CUBE_SLOTS, SLOT_TRANSFORMS } from '../lib/cube'
import type { Face } from '../lib/roll'

export type Dice3DProps = {
  /** 固定 6 个面，下标与 CUBE_SLOTS 一一对应 */
  faces: Face[]
  transform: string
  transitionMs: number
  easing: string
  shadowStyle: CSSProperties
  /** 当前朝上的槽位（= 结果下标） */
  topSlot: number
  dragging: boolean
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onPointerCancel: PointerEventHandler<HTMLDivElement>
}

/** CSS 3D 立方体骰子。整个舞台是拖拽热区，骰子姿态由外部传入的 transform 决定。 */
export function Dice3D({
  faces,
  transform,
  transitionMs,
  easing,
  shadowStyle,
  topSlot,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Dice3DProps) {
  return (
    <div
      className={['dice-stage', dragging ? 'dice-stage--dragging' : ''].filter(Boolean).join(' ')}
      data-testid="dice-stage"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="dice-scene">
        <div className="dice-shadow" style={shadowStyle} />
        <div
          className="dice-cube"
          data-testid="dice"
          data-top-slot={topSlot}
          data-face-id={faces[topSlot]?.id}
          data-dragging={dragging ? 'true' : 'false'}
          style={{
            transform,
            transitionDuration: `${transitionMs}ms`,
            transitionTimingFunction: easing,
          }}
        >
          {CUBE_SLOTS.map((slot, index) => {
            const face = faces[index]
            if (!face) return null

            return (
              <div
                key={slot}
                className={`dice-face dice-face--${slot}`}
                style={{ backgroundColor: face.color, transform: SLOT_TRANSFORMS[slot] }}
                data-face-index={index}
                data-face-id={face.id}
              >
                {face.kind === 'question' ? <span className="dice-face-glyph">?</span> : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
