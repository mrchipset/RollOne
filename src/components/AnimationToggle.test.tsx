import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimationToggle } from './AnimationToggle'

describe('AnimationToggle', () => {
  it('用 switch 语义暴露开关状态', () => {
    render(<AnimationToggle enabled onChange={() => {}} />)

    const toggle = screen.getByRole('switch', { name: '投掷动画' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('关闭状态暴露 aria-checked=false', () => {
    render(<AnimationToggle enabled={false} onChange={() => {}} />)

    expect(screen.getByRole('switch', { name: '投掷动画' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('点击时把状态取反回调出去', () => {
    const onChange = vi.fn()
    render(<AnimationToggle enabled={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch', { name: '投掷动画' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

