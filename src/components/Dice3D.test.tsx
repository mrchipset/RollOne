import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COLORS } from '../config/colors'
import { CUBE_SLOTS } from '../lib/cube'
import { buildFaces } from '../lib/roll'
import { Dice3D, type Dice3DProps } from './Dice3D'

const faces = buildFaces(COLORS)

function renderDice(overrides: Partial<Dice3DProps> = {}) {
  const handlers = {
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerCancel: vi.fn(),
  }

  render(
    <Dice3D
      faces={faces}
      transform="translate3d(0px, 0px, 0px) rotateY(0deg) rotateX(0deg) rotateZ(0deg)"
      transitionMs={0}
      easing="ease-out"
      shadowStyle={{}}
      topSlot={0}
      dragging={false}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('Dice3D', () => {
  it('渲染恰好 6 个面，且每个面对应一个立方体槽位', () => {
    renderDice()

    expect(document.querySelectorAll('.dice-face')).toHaveLength(CUBE_SLOTS.length)
    for (const slot of CUBE_SLOTS) {
      expect(document.querySelector(`.dice-face--${slot}`)).not.toBeNull()
    }
  })

  it('问号只在问号那一面渲染，且每个面都带上自己的颜色', () => {
    renderDice()

    expect(screen.getAllByText('?')).toHaveLength(1)
    for (const [index, face] of faces.entries()) {
      const node = document.querySelector(`[data-face-index="${index}"]`) as HTMLElement | null
      expect(node).not.toBeNull()
      expect(node?.getAttribute('data-face-id')).toBe(face.id)
      expect(node?.style.backgroundColor).toBeTruthy()
    }
  })

  it('骰子暴露当前顶面槽位，供外部断言结果', () => {
    renderDice({ topSlot: 3 })

    const cube = screen.getByTestId('dice')
    expect(cube).toHaveAttribute('data-top-slot', '3')
    expect(cube).toHaveAttribute('data-face-id', faces[3].id)
  })

  it('拖拽中给舞台加上 grabbing 类', () => {
    renderDice({ dragging: true })

    expect(screen.getByTestId('dice-stage')).toHaveClass('dice-stage--dragging')
    expect(screen.getByTestId('dice')).toHaveAttribute('data-dragging', 'true')
  })

  it('把 transform 与过渡参数原样写到骰子上', () => {
    renderDice({
      transform: 'translate3d(5px, 6px, 7px) rotateY(10deg) rotateX(20deg) rotateZ(30deg)',
      transitionMs: 480,
      easing: 'linear',
    })

    const cube = screen.getByTestId('dice')
    expect(cube.style.transform).toContain('rotateY(10deg)')
    expect(cube.style.transitionDuration).toBe('480ms')
    expect(cube.style.transitionTimingFunction).toBe('linear')
  })

  it('指针事件从舞台透传出去', () => {
    const handlers = renderDice()
    const stage = screen.getByTestId('dice-stage')

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 10, clientY: 20 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 30, clientY: 40 })
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 30, clientY: 40 })

    expect(handlers.onPointerDown).toHaveBeenCalledTimes(1)
    expect(handlers.onPointerMove).toHaveBeenCalledTimes(1)
    expect(handlers.onPointerUp).toHaveBeenCalledTimes(1)
  })
})

