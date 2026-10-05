import type { Face } from '../lib/roll'

type DiceProps = {
  face: Face
  isRolling: boolean
  /** 关闭时完全不套用动画类，直接定格 */
  animationEnabled: boolean
}

const CARD_CLASS = [
  'relative aspect-square w-full max-w-[min(78vw,22rem)] overflow-hidden',
  'rounded-[1.75rem] border border-slate-200',
  'shadow-xl shadow-slate-900/15 transition-colors duration-150',
].join(' ')

/** 骰子面：底色就是结果本身；问号面额外显示一个「?」。 */
export function Dice({ face, isRolling, animationEnabled }: DiceProps) {
  const motionClass = animationEnabled
    ? isRolling
      ? 'dice-rolling'
      : 'dice-settled'
    : ''

  return (
    <div
      className={[CARD_CLASS, motionClass].filter(Boolean).join(' ')}
      style={{ backgroundColor: face.color }}
      data-testid="dice"
      data-face-id={face.id}
      data-face-kind={face.kind}
    >
      {face.kind === 'question' ? (
        /*
         * 问号铺满整块色块。「?」的字形高度约为字号的 0.723 倍（实测 Segoe UI Bold），
         * 故字号取卡片尺寸的 min(95vw,27rem) —— 因为卡片是 min(78vw,22rem)，
         * 比值 1.22 对应字形约占卡片高度 88%，各屏幕尺寸下一致。
         * 行盒比卡片高是正常的：它没有背景，被 overflow-hidden 裁掉，字形仍居中。
         */
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden text-[min(95vw,27rem)] font-bold leading-none text-white"
        >
          ?
        </span>
      ) : null}
      <span className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-white/30 ring-inset" />
    </div>
  )
}
