import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Face } from '../lib/roll'
import { Dice } from './Dice'

const colorFace: Face = { kind: 'color', id: 'red', label: '红色', color: '#ef4444' }
const questionFace: Face = {
  kind: 'question',
  id: 'question',
  label: '随机（问号）',
  color: '#64748b',
}

describe('Dice', () => {
  it('颜色面只显示颜色，不显示任何图形或问号', () => {
    render(<Dice face={colorFace} isRolling={false} animationEnabled />)

    const dice = screen.getByTestId('dice')
    expect(dice).toHaveStyle({ backgroundColor: '#ef4444' })
    expect(dice).toHaveTextContent('')
    expect(dice.querySelector('svg')).toBeNull()
  })

  it('问号面显示 ?', () => {
    render(<Dice face={questionFace} isRolling={false} animationEnabled />)

    const dice = screen.getByTestId('dice')
    expect(dice).toHaveStyle({ backgroundColor: '#64748b' })
    expect(dice).toHaveTextContent('?')
  })

  it('开启动画时投掷中与定格使用不同的类', () => {
    const { rerender } = render(<Dice face={colorFace} isRolling animationEnabled />)
    expect(screen.getByTestId('dice')).toHaveClass('dice-rolling')

    rerender(<Dice face={colorFace} isRolling={false} animationEnabled />)
    expect(screen.getByTestId('dice')).toHaveClass('dice-settled')
  })

  it('关闭动画时两个动画类都不套用', () => {
    const { rerender } = render(<Dice face={colorFace} isRolling animationEnabled={false} />)
    expect(screen.getByTestId('dice')).not.toHaveClass('dice-rolling')
    expect(screen.getByTestId('dice')).not.toHaveClass('dice-settled')

    rerender(<Dice face={colorFace} isRolling={false} animationEnabled={false} />)
    expect(screen.getByTestId('dice')).not.toHaveClass('dice-rolling')
    expect(screen.getByTestId('dice')).not.toHaveClass('dice-settled')
  })
})

