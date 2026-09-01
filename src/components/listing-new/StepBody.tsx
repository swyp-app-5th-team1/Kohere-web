import type { ReactNode } from 'react'

/*
 * 매물 등록 단계의 본문 영역.
 *
 * 시안에서 헤더와 하단(진행 표시줄 + 이전/다음)은 화면에 붙어 있고 단계마다 달라지는
 * 내용만 그 사이에서 스크롤된다. 그래서 페이지 전체를 굴리지 않고 이 영역만 굴린다 —
 * `ListingNewPage` 가 화면 높이에 맞춘 세로 flex 이고, 여기가 남는 높이를 전부 가져간다.
 *
 * `min-h-0` 이 있어야 줄어든다. flex 항목은 기본으로 내용보다 작아지지 않아서, 이게 없으면
 * 본문이 늘어나 하단이 화면 밖으로 밀려난다.
 */

type StepBodyProps = {
  /**
   * 내용을 세로 가운데에 둔다 (매물 유형 · 등록 완료처럼 짧은 화면).
   *
   * `safe` 를 붙인 건 창이 낮을 때를 위해서다. 그냥 가운데 정렬이면 내용이 넘칠 때 위쪽이
   * 잘려 나가고 스크롤로도 못 올라간다.
   */
  center?: boolean
  children: ReactNode
}

export function StepBody({ center = false, children }: StepBodyProps) {
  return (
    <main
      className={
        'flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-14 ' +
        (center ? 'justify-center-safe' : '')
      }
    >
      {children}
    </main>
  )
}
