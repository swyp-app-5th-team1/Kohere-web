import { StepFooter } from './StepFooter'
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
      <main className="flex w-full flex-1 flex-col items-center justify-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">
            어떤 공간을 등록하시나요?
          </h1>

          {/* 라디오처럼 하나만 고르는 카드 묶음 */}
          <div role="radiogroup" aria-label="매물 유형" className="flex w-full items-center gap-6">
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
                    // 너비는 셋으로 정확히 나눠 고정한다. flex-1 로 두면 선택된 카드의 테두리
                    // 2px 만큼 그 칸만 넓어져서 시안의 310.67px 배분이 깨진다.
                    'relative flex min-h-[200px] shrink-0 grow-0 basis-[calc((100%_-_48px)/3)] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl px-[18px] py-[50px] shadow-[0_0_5px_rgba(23,23,23,0.08)] transition-colors ' +
                    (selected
                      ? 'border-primary-40 bg-primary-5 border-2'
                      : 'bg-cool-neutral-7 hover:bg-white')
                  }
                >
                  <type.Icon
                    aria-hidden
                    className={
                      'size-[68px] shrink-0 ' + (selected ? 'text-primary-50' : 'text-[#999999]')
                    }
                  />

                  <div className="flex w-full flex-col items-center gap-1.5 text-lg leading-6 whitespace-nowrap">
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
      </main>

      {/* 진행 표시줄 없이 앞에 붙는 단계라 step 을 넘기지 않고, 돌아갈 곳도 없어 onPrev 도 없다. */}
      <StepFooter onNext={onNext} nextDisabled={value === null} />
    </>
  )
}
