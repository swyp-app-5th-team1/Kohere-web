import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import { SPACE_TYPES, type SpaceType } from './spaceTypes'
import checkUrl from '../../assets/icon-circle-check-fill.svg'

type SpaceTypeStepProps = {
  value: SpaceType | null
  onChange: (value: SpaceType) => void
  onNext: () => void
}

/**
 * 매물 등록 1단계 — 매물 유형 선택.
 *
 * 시안에 진행 표시줄이 없어 여기서는 넣지 않았다. 유형을 고르기 전에는 다음으로 못 넘어간다.
 */
export function SpaceTypeStep({ value, onChange, onNext }: SpaceTypeStepProps) {
  return (
    <>
      <StepBody center>
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>어떤 공간을 등록하시나요?</StepTitle>

          {/*
            라디오처럼 하나만 고르는 카드 묶음.
            좁은 화면에서는 시안(182:7205)대로 세로로 쌓고 아이콘을 왼쪽에 둔다.
          */}
          <div
            role="radiogroup"
            aria-label="매물 유형"
            className="flex w-full flex-col gap-4 md:flex-row md:items-center md:gap-6"
          >
            {SPACE_TYPES.map((type) => {
              const selected = value === type.value

              return (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(type.value)}
                  className={
                    // 넓은 화면의 너비는 셋으로 정확히 나눠 고정한다. flex-1 로 두면 선택된 카드의
                    // 테두리 2px 만큼 그 칸만 넓어져서 시안의 310.67px 배분이 깨진다.
                    'relative flex cursor-pointer items-center gap-4 rounded-xl px-5 py-5 shadow-[0_0_5px_rgba(23,23,23,0.08)] transition-colors ' +
                    'md:min-h-[200px] md:shrink-0 md:grow-0 md:basis-[calc((100%_-_48px)/3)] md:flex-col md:justify-center md:px-[18px] md:py-[50px] ' +
                    (selected
                      ? 'border-primary-40 bg-primary-5 border-2'
                      : // 기본은 테두리 없는 회색, hover 는 흰 배경 + neutral/30 테두리다.
                        'bg-cool-neutral-7 hover:border hover:border-neutral-30 hover:bg-white')
                  }
                >
                  <type.Icon
                    aria-hidden
                    className={
                      'size-[68px] shrink-0 ' + (selected ? 'text-primary-50' : 'text-[#999999]')
                    }
                  />

                  <div className="flex flex-col items-start gap-1.5 text-lg leading-6 whitespace-nowrap md:w-full md:items-center">
                    <span className="text-neutral-70 font-semibold">{type.label}</span>
                    <span className="text-cool-neutral-40 font-medium">{type.description}</span>
                  </div>

                  {selected && (
                    <img src={checkUrl} alt="" className="absolute top-5 right-5 size-6" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </StepBody>

      {/* 진행 표시줄 없이 앞에 붙는 단계라 step 을 넘기지 않고, 돌아갈 곳도 없어 onPrev 도 없다. */}
      <StepFooter onNext={onNext} nextDisabled={value === null} />
    </>
  )
}
