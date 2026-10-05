import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { COLORS, QUESTION_FACE_ID } from './config/colors'

const KNOWN_FACE_IDS = [...COLORS.map((c) => c.id), QUESTION_FACE_ID]

describe('App', () => {
  it('初始就展示一个合法结果与配置信息', () => {
    render(<App />)

    const dice = screen.getByTestId('dice')
    expect(KNOWN_FACE_IDS).toContain(dice.getAttribute('data-face-id'))
    expect(
      screen.getByText(`共 ${COLORS.length + 1} 种等概率结果 · ${COLORS.length} 种颜色 + 1 个问号`),
    ).toBeInTheDocument()
  })

  it('投掷期间禁用按钮，结束后定格在合法结果', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '投掷骰子' }))

    expect(screen.getByRole('button', { name: '投掷中…' })).toBeDisabled()

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: '投掷骰子' })).toBeEnabled()
      },
      { timeout: 5000 },
    )

    const dice = screen.getByTestId('dice')
    expect(KNOWN_FACE_IDS).toContain(dice.getAttribute('data-face-id'))
    expect(screen.getByRole('status')).toHaveTextContent(/^结果：/)
  })

  it('问号面才显示问号字样', () => {
    render(<App />)
    const dice = screen.getByTestId('dice')
    const isQuestion = dice.getAttribute('data-face-kind') === 'question'
    expect(dice).toHaveTextContent(isQuestion ? '?' : '')
  })

  it('默认开启动画，投掷时会进入投掷中状态', () => {
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
})

