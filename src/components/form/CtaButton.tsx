/*
 * 시안의 「CTA Button」 두 색.
 *
 * 높이 48 · 모서리 16 · 16px SemiBold 흰 글자까지 같고 배경만 다르다. 팝업마다 한 벌씩
 * 적어 두면 색이 조금씩 어긋나서 여기 모았다. 비활성도 회색(cool-neutral/20)이라
 * 「회색 버튼」과 그림이 같은데, 뜻이 달라서(누를 수 없음 / 보조 행동) 따로 둔다.
 */
const ctaShape =
  'flex h-12 items-center justify-center rounded-2xl border px-3 ' +
  'text-base leading-6 font-semibold text-white transition'

/** 주 행동. 검정(label/normal). */
export const ctaPrimaryClass = `${ctaShape} border-line-normal bg-label-normal hover:brightness-125`

/** 보조 행동(취소 · 다시 찾기). 회색(cool-neutral/20). */
export const ctaSecondaryClass = `${ctaShape} border-line-alternative bg-cool-neutral-20 hover:brightness-95`

/** 누를 수 없는 상태. 보조 행동과 색이 같아 커서로만 구분된다. */
export const ctaDisabledClass = `${ctaShape} border-line-alternative bg-cool-neutral-20 cursor-not-allowed`
