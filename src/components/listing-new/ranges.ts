/*
 * 층수 · 연령대처럼 숫자나 `min~max` 로 보내는 값들.
 *
 * 서버가 받는 모양은 이렇다.
 *
 *   totalFloors      number   1 이상
 *   usedFloorRange   string   "1~2"  (최대가 totalFloors 를 넘을 수 없다)
 *   ageRange         string   "20~35"
 *
 * 응답에서는 usedFloorMin · usedFloorMax, ageMin · ageMax 로 갈라져 온다 —
 * 보낼 때와 받을 때 모양이 다르다는 걸 스펙이 따로 짚어 두었다.
 *
 * ── 「층」을 어떻게 다루나 ──
 * 시안 예시가 「예: 8층」·「예: 2~4층」이라 사용자는 「층」을 붙여 친다. 그래서 칸에는
 * 적은 그대로 두고 보낼 때만 뗀다.
 *
 * 다만 숫자만 훑어 내면 안 된다 — 「지하1~4층」이 「1~4」가 되고 「8, 9층」이 89층이 되어
 * 화면에 보이는 것과 보내는 값이 달라진다. 그래서 아래 형식에 **정확히 맞을 때만** 읽고
 * 나머지는 오류로 돌려준다. 못 읽은 값은 아예 안 보낸다.
 */

/** 「8」 · 「8층」 을 숫자로. 그 밖의 모양이면 null 이다. */
export function parseCount(text: string): number | null {
  const match = /^(\d+)\s*층?$/.exec(text.trim())
  return match ? Number(match[1]) : null
}

/**
 * 「2~4」 · 「2~4층」 · 「2층~4층」 을 숫자 두 개로. 그 밖이면 null 이다.
 *
 * 물결표는 반각(~)과 전각(～) 둘 다 받는다 — 입력기에 따라 전각이 들어오는 일이 있다.
 */
export function parseSpan(text: string): { min: number; max: number } | null {
  const match = /^(\d+)\s*층?\s*[~～]\s*(\d+)\s*층?$/.exec(text.trim())
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null
}

/** 슬라이더가 담아 두는 순수 `min~max` 문자열. 「층」이 붙지 않는다. */
export function parseRange(text: string): { min: number; max: number } | null {
  const match = /^(\d+)~(\d+)$/.exec(text.trim())
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null
}

/** 숫자 두 개를 서버가 받는 한 칸 문자열로 만든다. */
export const formatRange = (min: number, max: number) => `${min}~${max}`

/** 라벨 줄에 붙일 표시용 문구. 저장값과 달리 단위가 붙는다. */
export const rangeText = (range: { min: number; max: number }, unit: string) =>
  `${range.min}${unit} ~ ${range.max}${unit}`

/**
 * 이용 연령대 슬라이더의 폭.
 *
 * 시안이 없어 우리가 정한 값이다 — 외국인 유학생 · 직장인이 주 대상이라 이 범위를 벗어나는
 * 매물은 사실상 없다. 서버는 숫자 범위를 따로 제한하지 않아 언제든 넓힐 수 있다.
 */
export const AGE_BOUND = { min: 18, max: 70 }

/** 총 층수 칸을 검사한다. 통과하면 null 이다. */
export function floorCountError(text: string): string | null {
  if (text.trim() === '') return null
  const count = parseCount(text)
  if (count === null) return '8 또는 8층 처럼 적어 주세요'
  if (count < 1) return '총 층수는 1층부터 적을 수 있어요'
  return null
}

/**
 * 지점 운영층 칸을 검사한다.
 *
 * `total` 은 총 층수다. 운영층 최대가 이걸 넘으면 서버가 400 을 내므로 미리 잡는다.
 */
export function floorSpanError(text: string, total: number | null): string | null {
  if (text.trim() === '') return null

  const span = parseSpan(text)
  if (span === null) return '1~2 또는 2~4층 처럼 적어 주세요'
  if (span.min < 1) return '운영층은 1층부터 적을 수 있어요'
  if (span.min > span.max) return '앞 층이 뒤 층보다 높을 수 없어요'
  if (total !== null && span.max > total) return '운영층이 총 층수를 넘을 수 없어요'

  return null
}
