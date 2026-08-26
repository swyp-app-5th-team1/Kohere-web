/*
 * 두 손잡이로 범위를 고르는 슬라이더.
 *
 * 시안이 없어 기존 토큰(primary/40, cool-neutral)으로 맞췄다. 디자인 시안이 나오면
 * 색과 크기만 여기서 고치면 된다.
 *
 * 손잡이를 직접 그리지 않고 `input[type=range]` 두 개를 겹쳐 쓴다. 키보드 조작(화살표 ·
 * Home · End)과 스크린 리더 대응을 브라우저가 이미 해 주기 때문이다. 직접 만들면 그걸
 * 전부 다시 구현해야 한다.
 */

type RangeSliderProps = {
  /** 고를 수 있는 최소 · 최대. 두 손잡이가 이 범위 안에서만 움직인다. */
  bound: { min: number; max: number }
  /** 지금 고른 값. 비어 있으면 양 끝에서 시작한다. */
  value: { min: number; max: number } | null
  onChange: (next: { min: number; max: number }) => void
  /** 양 끝 눈금에 붙는 단위 (`세` · `층`). */
  unit?: string
  /** 스크린 리더가 읽을 이름. */
  label: string
}

/*
 * 트랙 위에 겹쳐 두는 두 입력.
 *
 * 트랙 자체는 클릭을 받지 않고(`pointer-events-none`) 손잡이만 받는다. 그래야 아래 깔린
 * 입력의 손잡이도 잡을 수 있다 — 안 그러면 위에 있는 입력이 트랙 전체를 덮어 버린다.
 */
const thumbClass =
  'pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 ' +
  '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-primary-40 [&::-webkit-slider-thumb]:bg-white ' +
  '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(23,23,23,0.24)] ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 ' +
  '[&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-primary-40 [&::-moz-range-thumb]:bg-white'

export function RangeSlider({ bound, value, onChange, unit = '', label }: RangeSliderProps) {
  const current = value ?? bound
  const span = bound.max - bound.min

  const percent = (n: number) => ((n - bound.min) / span) * 100

  /** 손잡이끼리 지나치지 못하게 막는다. min 이 max 를 넘으면 서버가 400 을 낸다. */
  const setMin = (next: number) => onChange({ min: Math.min(next, current.max), max: current.max })
  const setMax = (next: number) => onChange({ min: current.min, max: Math.max(next, current.min) })

  /*
   * 고른 값은 여기서 그리지 않는다. 슬라이더 바로 위에 두면 트랙에 붙어 보이고 글자도
   * 커서 시선을 뺏는다. 글자 수 카운터처럼 라벨 줄 오른쪽에 붙이는 게 자연스럽다 —
   * 호출부가 Field 의 labelEnd 로 넘긴다(rangeText 참고).
   */
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="relative h-5 w-full">
        {/* 전체 구간 */}
        <span className="bg-cool-neutral-7 absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
        {/* 고른 구간 */}
        <span
          className="bg-primary-40 absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${percent(current.min)}%`, right: `${100 - percent(current.max)}%` }}
        />

        <input
          type="range"
          min={bound.min}
          max={bound.max}
          value={current.min}
          onChange={(event) => setMin(Number(event.target.value))}
          aria-label={`${label} 최소`}
          className={thumbClass}
        />
        <input
          type="range"
          min={bound.min}
          max={bound.max}
          value={current.max}
          onChange={(event) => setMax(Number(event.target.value))}
          aria-label={`${label} 최대`}
          className={thumbClass}
        />
      </div>

      <div className="text-cool-neutral-30 flex w-full justify-between text-xs leading-4">
        <span>
          {bound.min}
          {unit}
        </span>
        <span>
          {bound.max}
          {unit}
        </span>
      </div>
    </div>
  )
}
