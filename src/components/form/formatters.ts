/**
 * 입력하는 동안 하이픈을 넣어 주는 함수들.
 *
 * 규칙 하나: 마지막에 하이픈을 남기지 않는다. "010-" 같은 상태를 만들면 지우기를 눌러도
 * 하이픈이 다시 붙어서 지워지지 않는다.
 */

const digitsOf = (raw: string, max: number) => raw.replace(/\D/g, '').slice(0, max)

/** 숫자를 자릿수대로 끊어 하이픈으로 잇는다. 남은 숫자가 없으면 거기서 멈춘다. */
const join = (digits: string, sizes: number[]) => {
  const parts: string[] = []
  let rest = digits

  for (const size of sizes) {
    if (rest.length === 0) break
    parts.push(rest.slice(0, size))
    rest = rest.slice(size)
  }

  return parts.join('-')
}

/**
 * 전화번호. 휴대폰과 지역번호, 대표번호를 함께 받는다.
 *
 * 02-123-4567 · 02-1234-5678 · 010-1234-5678 · 031-123-4567 · 1588-1234
 */
export function formatPhone(raw: string): string {
  const digits = digitsOf(raw, 11)

  // 서울만 지역번호가 두 자리다.
  if (digits.startsWith('02')) return join(digits, digits.length > 9 ? [2, 4, 4] : [2, 3, 4])
  // 휴대폰은 11자리로 고정이라 길이를 볼 필요가 없다.
  if (digits.startsWith('010')) return join(digits, [3, 4, 4])
  // 0 으로 시작하지 않는 건 15xx · 16xx · 18xx 대표번호뿐이다.
  if (/^1[5-8]/.test(digits)) return join(digits.slice(0, 8), [4, 4])

  return join(digits, digits.length > 10 ? [3, 4, 4] : [3, 3, 4])
}

/** 사업자등록번호는 10자리 3-2-5 로 고정이다. */
export function formatBusinessNumber(raw: string): string {
  return join(digitsOf(raw, 10), [3, 2, 5])
}
