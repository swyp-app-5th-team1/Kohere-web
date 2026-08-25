import type { ReactNode } from 'react'

/**
 * 각 단계 맨 위의 제목.
 *
 * 시안에는 줄간격이 24 로 잡혀 있는데, 그건 한 줄짜리 텍스트 상자의 높이를 그대로 옮긴
 * 값이다. 글자가 32 라 좁은 화면에서 두 줄이 되면 위아래 줄이 서로 닿는다.
 * 그래서 40 으로 넓혔다. 대신 한 줄일 때 제목 아래 요소들이 시안보다 16 내려온다.
 */
export function StepTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={'text-[32px] leading-10 font-bold text-[#242424] ' + className}>{children}</h1>
  )
}
