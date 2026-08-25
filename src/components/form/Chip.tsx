import type { ReactNode } from 'react'

type ChipProps = {
  selected: boolean
  onClick: () => void
  children: ReactNode
  /** 있음/없음처럼 폭이 고정된 칩에 w-[200px] 같은 클래스를 넘긴다. */
  className?: string
}

/**
 * 선택형 칩. 디자인 시스템 「칩 Chip」 문서의 default · hover · pressed 를 그대로 따른다.
 *
 * | 상태 | 테두리 | 글자 |
 * | default | line/alternative | label/neutral |
 * | hover | 그대로 | primary/normal |
 * | pressed | primary/normal | primary/press |
 *
 * 굵기는 세 상태 모두 Medium 이다. 배경도 secondary/5 로 고정이고 변하지 않는다.
 *
 * 높이 44 고정 · 좌우 15 는 시안의 여백(16·12)에서 테두리 1px 을 뺀 값이다.
 * Figma 는 선을 안쪽에 그려 44x81 이 되지만, CSS 는 테두리가 밖으로 붙어 46x83 이 된다.
 */
export function Chip({ selected, onClick, children, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        'bg-secondary-5 flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border px-[15px] text-center text-sm leading-5 font-medium transition-colors ' +
        (selected
          ? 'border-primary-50 text-primary-press'
          : 'border-line-alternative text-label-neutral hover:text-primary-50') +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </button>
  )
}

/** 칩을 감싸는 줄. 시안의 기본 간격은 8px 이고, 다른 간격이 필요하면 gap 을 넘긴다. */
export function ChipGroup({
  children,
  gap = 'gap-2',
}: {
  children: ReactNode
  gap?: string
}) {
  return <div className={'flex w-full flex-wrap ' + gap}>{children}</div>
}
