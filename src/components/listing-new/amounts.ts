/*
 * 방 타입의 금액 · 이용기간처럼 숫자로 보내는 값들.
 *
 * 서버가 받는 모양은 이렇다 (`POST /api/v2/listings` 의 `roomOffers[]`).
 *
 *   pricing.deposit         number   보증금 (원)
 *   pricing.maintenanceFee  number   관리비 (원)
 *   pricing.monthlyRent     number   월세 (원)
 *   contract.minStayMonths  number   최소 이용기간 (개월)
 *   contract.maxStayMonths  number   최대 이용기간 (개월)
 *
 * 다섯 다 단위가 붙지 않은 순수한 숫자다. `maxStayMonths` 는 `minStayMonths` 보다 작을 수
 * 없고, 어기면 서버가 400 을 낸다.
 *
 * ── 단위를 어떻게 다루나 ──
 * **아예 숫자만 쳐지게 막는다**(`digitsOnly`). 층수 칸과 다른 선택이다 — 그쪽은 시안
 * placeholder 가 「예: 8층」이라 「층」을 적으라고 유도해서 받아 줄 수밖에 없었지만, 여기
 * placeholder 는 「입력하기」·「최소」라 단위를 적을 이유가 없다. 한글이나 「만원」을 쳐도
 * 그냥 안 들어간다.
 *
 * 그래서 「35만원」이 35 원이 되는 길이 애초에 없다. 아래 parse 들은 임시 저장에서 되살린
 * 옛 값처럼 칸을 거치지 않고 들어온 값을 걸러 내는 안전망으로 남겨 둔다.
 *
 * 단위는 칸 안 오른쪽에 붙여 둔다(TextField 의 suffix). 시안 placeholder 에는 단위가 없어서
 * 원 단위로 다 적어야 하는 것도 이용기간이 개월인 것도 알 길이 없다.
 */

/**
 * 숫자만 남긴다. 금액·이용기간 칸의 onChange 에 물린다.
 *
 * 앞자리 0 도 지운다. 「0350000」을 그대로 두면 보내는 값(350000)과 화면이 달라진다.
 * 다만 0 하나는 남긴다 — 관리비 0 원인 매물이 있다.
 */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

/** 「350000」 · 「350,000」 · 「350,000원」 을 숫자로. 그 밖의 모양이면 null 이다. */
export function parseMoney(text: string): number | null {
  // 「원」은 붙여 적어도 받는다. 「만원」은 10,000 을 곱해야 해서 여기서 걸러진다.
  const amount = text.trim().replace(/\s*원$/, '')
  if (!/^\d+$|^\d{1,3}(,\d{3})+$/.test(amount)) return null
  return Number(amount.replace(/,/g, ''))
}

/** 금액 칸을 검사한다. 통과하면 null 이다. */
export function moneyError(text: string): string | null {
  if (text.trim() === '') return null
  if (parseMoney(text) === null) return '숫자만 적어 주세요'
  return null
}

/** 「6」 · 「6개월」 을 숫자로. 「1년」처럼 12 를 곱해야 하는 건 받지 않는다. */
export function parseMonths(text: string): number | null {
  const match = /^(\d+)\s*(?:개월)?$/.exec(text.trim())
  return match ? Number(match[1]) : null
}

/** 이용기간 칸을 검사한다. 통과하면 null 이다. */
export function stayError(text: string): string | null {
  if (text.trim() === '') return null
  const months = parseMonths(text)
  if (months === null) return '숫자만 적어 주세요'
  if (months < 1) return '이용기간은 1개월부터 적어 주세요'
  return null
}

/**
 * 최대 이용기간 칸을 검사한다.
 *
 * `min` 은 최소 칸에서 읽은 개월 수다. 최대가 그보다 짧으면 서버가 400 을 내므로 미리 잡는다.
 */
export function stayMaxError(text: string, min: number | null): string | null {
  const own = stayError(text)
  if (own !== null) return own

  const max = parseMonths(text)
  if (max !== null && min !== null && max < min) return '최대 기간을 최소 기간보다 길게 적어 주세요'

  return null
}
