import markUrl from '../assets/kohere-mark.svg'

/**
 * 로고 워드마크 + 태그라인.
 *
 * 마크 크기 · 간격 · 여백을 전부 워드마크 글자 크기(em) 기준으로 잡아서,
 * 글자 크기 하나만 바뀌면 전체가 비례해 줄어든다. 시안 기준값은 115.2px 이고
 * 좁은 화면에서는 clamp 로 내려간다.
 */
export function KohereLogo() {
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="flex w-full items-center justify-center"
        style={{
          fontSize: 'clamp(56px, 25vw, 115.2px)',
          gap: '0.1146em', // 13.2px
          padding: '0.0625em 0.1667em', // 7.2px 19.2px
        }}
      >
        {/*
          Figma 가 preserveAspectRatio="none" 로 내보내서, 비율이 다른 상자에 넣으면 그대로 늘어난다.
          그래서 SVG 자체 비율(45.0048 × 90.1635)을 그대로 쓴다.
          시안의 컨테이너(42.785 × 88.049)보다 살짝 큰 건 선 두께가 밖으로 번지는 만큼이다.
        */}
        <img
          src={markUrl}
          alt=""
          className="shrink-0"
          style={{ width: '0.390667em', height: '0.782669em' }}
        />
        <p
          className="text-primary-50 font-display whitespace-nowrap"
          style={{
            lineHeight: 1.0417, // 120px
            letterSpacing: '-0.16px',
            fontVariationSettings: '"SOFT" 0, "WONK" 1',
          }}
        >
          ko<span className="italic">here</span>
        </p>
      </div>

      <p className="text-cool-neutral-50 w-full text-center text-2xl leading-6 font-bold">
        외국인의 한국 주거 탐색을 더 쉽게
      </p>
    </div>
  )
}
