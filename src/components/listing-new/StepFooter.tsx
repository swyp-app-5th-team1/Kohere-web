import arrowLeftUrl from '../../assets/icon-arrow-left.svg'
import arrowRightUrl from '../../assets/icon-arrow-right.svg'

/** 진행 표시줄 칸 수. 매물 유형 선택은 표시줄 없이 앞에 붙는 단계라 여기서 세지 않는다. */
export const TOTAL_STEPS = 7

type StepFooterProps = {
  /** 진행 표시줄에서 칠할 단계 (1부터). 없으면 표시줄을 그리지 않는다. */
  step?: number
  /** 없으면 이전 버튼이 비활성이 된다. */
  onPrev?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  /** 추가 질문 단계처럼 "건너뛰기" 로 바뀌는 화면이 있다. */
  nextLabel?: string
}

/** 모든 매물 등록 단계가 공유하는 하단 영역 (진행 표시줄 + 이전/다음). */
export function StepFooter({
  step,
  onPrev,
  onNext,
  nextDisabled = false,
  nextLabel = '다음',
}: StepFooterProps) {
  return (
    <footer className="w-full shrink-0">
      {/* 지나온 단계만 진하게 칠한다. 가로 여백 없이 화면 폭 전체를 쓴다. */}
      {step !== undefined && (
        <div className="flex w-full gap-[7px]">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <div
              key={index}
              className={
                'h-1.5 flex-1 rounded-full ' +
                (index < step ? 'bg-neutral-70' : 'bg-cool-neutral-7')
              }
            />
          ))}
        </div>
      )}

      <div className="flex w-full flex-col items-center px-6 py-10">
        <div className="flex w-full max-w-[980px] items-center justify-between">
          <button
            type="button"
            onClick={onPrev}
            disabled={onPrev === undefined}
            className="bg-cool-neutral-20 border-line-normal flex h-12 w-[158px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            <img src={arrowLeftUrl} alt="" className="size-6" />
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="bg-label-normal border-line-normal disabled:bg-cool-neutral-20 flex h-12 w-[158px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            {nextLabel}
            <img src={arrowRightUrl} alt="" className="size-6" />
          </button>
        </div>
      </div>
    </footer>
  )
}
