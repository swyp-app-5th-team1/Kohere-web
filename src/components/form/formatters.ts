/**
 * 입력하는 동안 하이픈을 넣어 주는 함수들.
 *
 * 규칙 하나: 마지막에 하이픈을 남기지 않는다. "010-" 같은 상태를 만들면 지우기를 눌러도
 * 하이픈이 다시 붙어서 지워지지 않는다.
 */

const digitsOf = (raw: string, max: number) => raw.replace(/\D/g, '').slice(0, max)

/** 숫자를 자릿수대로 끊어 구분자로 잇는다. 남은 숫자가 없으면 거기서 멈춘다. */
const join = (digits: string, sizes: number[], separator = '-') => {
  const parts: string[] = []
  let rest = digits

  for (const size of sizes) {
    if (rest.length === 0) break
    parts.push(rest.slice(0, size))
    rest = rest.slice(size)
  }

  return parts.join(separator)
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

/**
 * 자릿수가 다 찼는지. formatPhone 이 받아 주는 모양마다 길이가 다르다.
 *
 * 하이픈을 넣어 주다 보니 `010-1` 도 번듯해 보인다. 그래서 비었는지만 봐서는 덜 친 번호가
 * 그대로 넘어간다.
 */
export function isPhoneComplete(value: string): boolean {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('010')) return digits.length === 11
  if (digits.startsWith('02')) return digits.length === 9 || digits.length === 10
  if (/^1[5-8]/.test(digits)) return digits.length === 8
  if (digits.startsWith('0')) return digits.length === 10 || digits.length === 11

  return false
}

/**
 * 화면의 `010-1234-5678` 을 서버가 받는 `+82) 10-1234-5678` 로 바꾼다.
 *
 * 나라를 묻는 칸이 어디에도 없어서 한국 번호로 본다. 국제 표기는 앞의 `0` 을 떼는 게
 * 규칙이라 서울 번호도 `+82) 2-1234-5678` 이 된다. 15xx 대표번호는 `0` 이 없어 그대로 둔다.
 *
 * 자릿수가 덜 찼으면 null 이라 호출부에서 제출을 막는다.
 *
 * TODO(백엔드 확인): 스펙 예시가 `+82) 10-1234-5678` 하나뿐이라 서울 · 대표번호도 받는지
 * 모른다. 괄호 뒤 공백이 필수인지도 예시로만 짐작한 것이다.
 */
export function phoneToServer(value: string): string | null {
  if (!isPhoneComplete(value)) return null
  return `+82) ${formatPhone(value).replace(/^0/, '')}`
}

/** 사업자등록번호는 10자리 3-2-5 로 고정이다. */
export function formatBusinessNumber(raw: string): string {
  return join(digitsOf(raw, 10), [3, 2, 5])
}

/** 사업자등록번호의 형식만 확인한다. 실제 등록 여부는 매물 심사에서 판단한다. */
export function isBusinessNumberComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 10
}

/** 생년월일은 8자리 4-2-2 로 고정이다. 시안 표기가 0000.00.00 이라 점으로 잇는다. */
export function formatBirthDate(raw: string): string {
  return join(digitsOf(raw, 8), [4, 2, 2], '.')
}

/**
 * 화면의 0000.00.00 을 서버가 받는 0000-00-00 으로 바꾼다.
 *
 * 8자리가 안 찼거나 실제로 없는 날짜(2026.02.31 같은)면 null 이라 호출부에서 제출을 막는다.
 * Date 는 없는 날짜를 다음 달로 넘겨 버리기 때문에, 되돌린 값이 같은지로 확인한다.
 */
export function birthDateToIso(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return null

  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  const parsed = new Date(`${iso}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10) === iso ? iso : null
}
