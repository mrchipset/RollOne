import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { COLORS, QUESTION_FACE_ID } from './config/colors'
import { MAX_PULL_PX } from './lib/slingshot'
import { buildTumblePlan } from './lib/tumble'

const KNOWN_FACE_IDS = [...COLORS.map((c) => c.id), QUESTION_FACE_ID]

/** 从 transform 里剥掉位移，只留旋转部分，用于判断姿态有没有变化。 */
function rotationOf(transform: string): string {
  return transform.replace(/^translate3d\([^)]*\)\s*/, '')
}

function drag(
  stage: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  fireEvent.pointerDown(stage, { pointerId: 1, clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(stage, { pointerId: 1, clientX: to.x, clientY: to.y })
}

describe('App', () => {
  it('初始就展示一个合法结果与配置信息', () => {
    render(<App />)

    expect(KNOWN_FACE_IDS).toContain(screen.getByTestId('dice').getAttribute('data-face-id'))
    expect(
      screen.getByText(
        `拖住骰子向后拉再松手 · ${COLORS.length} 种颜色 + 1 个问号，共 ${COLORS.length + 1} 种等概率结果`,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
  })

  it('拖拽时骰子跟手，纵向位移按俯视倾角做了 cos 补偿', () => {
    render(<App />)
    const stage = screen.getByTestId('dice-stage')

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 })
    expect(screen.getByTestId('dice')).toHaveAttribute('data-dragging', 'true')

    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 100, clientY: 220 })

    const match = /translate3d\((?<x>[-\d.]+)px, (?<y>[-\d.]+)px/.exec(
      screen.getByTestId('dice').style.transform,
    )
    // 屏幕位移 120px，场景倾斜 45°，纵向要放大到 120 / cos45° ≈ 169.7px 才跟得住手指
    expect(Number(match?.groups?.y)).toBeGreaterThan(120)
    expect(screen.getByRole('status')).toHaveTextContent('松手发射')
  })

  it('拉远后松手会触发投掷', () => {
    render(<App />)

    drag(screen.getByTestId('dice-stage'), { x: 100, y: 100 }, { x: 100, y: 260 })

    expect(screen.getByRole('button', { name: '投掷中…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('投掷中…')
  })

  it('拉动距离不足阈值时松手回弹，不触发投掷', () => {
    render(<App />)
    const stage = screen.getByTestId('dice-stage')

    drag(stage, { x: 100, y: 100 }, { x: 103, y: 103 })

    expect(screen.getByTestId('dice')).toHaveAttribute('data-dragging', 'false')
    expect(screen.getByRole('button', { name: '投掷骰子' })).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
  })

  it('拖拽后动画结束会定格在合法结果', async () => {
    render(<App />)

    // 用较轻的拉力（30px ≈ 力度 0.21），整段动画约 4.4s，比满力度短一半
    drag(screen.getByTestId('dice-stage'), { x: 100, y: 100 }, { x: 100, y: 130 })

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: '投掷骰子' })).toBeEnabled()
      },
      { timeout: 9000 },
    )

    const dice = screen.getByTestId('dice')
    const slot = Number(dice.getAttribute('data-top-slot'))
    expect(slot).toBeGreaterThanOrEqual(0)
    expect(slot).toBeLessThan(COLORS.length + 1)
    expect(KNOWN_FACE_IDS).toContain(dice.getAttribute('data-face-id'))
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
  })

  it('默认开启动画，用按钮投掷时会进入投掷中状态', () => {
    render(<App />)

    expect(screen.getByRole('switch', { name: '投掷动画' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: '投掷骰子' }))
    expect(screen.getByRole('button', { name: '投掷中…' })).toBeDisabled()
  })

  it('关闭动画后投掷立即出结果，不进入投掷中状态', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('switch', { name: '投掷动画' }))
    expect(screen.getByRole('switch', { name: '投掷动画' })).toHaveAttribute(
      'aria-checked',
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: '投掷骰子' }))

    expect(screen.queryByRole('button', { name: '投掷中…' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '投掷骰子' })).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
    expect(KNOWN_FACE_IDS).toContain(screen.getByTestId('dice').getAttribute('data-face-id'))
  })

  it('关闭动画后拖拽发射同样立即出结果', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('switch', { name: '投掷动画' }))
    drag(screen.getByTestId('dice-stage'), { x: 100, y: 100 }, { x: 100, y: 260 })

    expect(screen.queryByRole('button', { name: '投掷中…' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
  })

  it('翻滚只在起飞段发生：回落段的姿态角与起飞段结束时完全一致', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      const stage = screen.getByTestId('dice-stage')

      // 拖满力度
      const pull = MAX_PULL_PX + 40
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(stage, { pointerId: 1, clientX: 0, clientY: pull })
      fireEvent.pointerUp(stage, { pointerId: 1, clientX: 0, clientY: pull })

      const plan = buildTumblePlan(1)
      const cube = screen.getByTestId('dice')

      act(() => {
        vi.advanceTimersByTime(plan.flyMs)
      })
      const afterFly = rotationOf(cube.style.transform)
      const offsetAfterFly = cube.style.transform

      act(() => {
        vi.advanceTimersByTime(plan.settleMs)
      })
      const afterSettle = rotationOf(cube.style.transform)

      expect(afterFly).not.toBe('')
      // 回落段不再转：姿态角必须原地不动
      expect(afterSettle).toBe(afterFly)
      // 但位移确实回到了中央（说明回落段本身还在，只是不转）
      expect(offsetAfterFly).toContain('translate3d')
      expect(cube.style.transform).toContain('translate3d(0px, 0px, 0px)')
    } finally {
      vi.useRealTimers()
    }
  })

  it('往后拉就朝前滚：滚动轴绕 +X', () => {
    render(<App />)
    const stage = screen.getByTestId('dice-stage')

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 100, clientY: 240 })
    expect(screen.getByTestId('dice').style.transform).toContain('rotate3d(1, 0, 0,')
  })

  it('往左拉就往右滚：滚动轴绕 +Y（与往后拉不同）', () => {
    render(<App />)
    const stage = screen.getByTestId('dice-stage')

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: -40, clientY: 100 })
    expect(screen.getByTestId('dice').style.transform).toContain('rotate3d(0, 1, 0,')
  })
})
