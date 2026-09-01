/*
 * 우편번호 창에서 고른 주소와 주소 검색 API 후보를 맞춰 보는 규칙.
 *
 * 두 곳의 표기가 달라서 문자열을 그대로 비교할 수 없다. 실제로 확인된 차이는 둘이다.
 *
 *   시·도 축약   다음: "서울 서대문구 …"        API: "서울특별시 서대문구 …"
 *   건물명 접미   다음: "… 신촌로 12"           API: "… 신촌로 12 OO빌딩"
 *
 * 지번 쪽에도 건물명이 붙어 오므로 같은 방식으로 다룬다.
 */

/**
 * 시·도 표기를 하나로 접는다.
 *
 * 옛 이름(강원도 · 전라북도 · 제주도)까지 넣어 둔 이유는, 특별자치도 개명이 두 서비스에
 * 반영된 시점이 다를 수 있어서다. 어느 쪽 표기가 오든 같은 값으로 접힌다.
 */
const SIDO_ALIASES: Record<string, string> = {
  서울: '서울',
  서울특별시: '서울',
  부산: '부산',
  부산광역시: '부산',
  대구: '대구',
  대구광역시: '대구',
  인천: '인천',
  인천광역시: '인천',
  광주: '광주',
  광주광역시: '광주',
  대전: '대전',
  대전광역시: '대전',
  울산: '울산',
  울산광역시: '울산',
  세종: '세종',
  세종특별자치시: '세종',
  경기: '경기',
  경기도: '경기',
  강원: '강원',
  강원도: '강원',
  강원특별자치도: '강원',
  충북: '충북',
  충청북도: '충북',
  충남: '충남',
  충청남도: '충남',
  전북: '전북',
  전라북도: '전북',
  전북특별자치도: '전북',
  전남: '전남',
  전라남도: '전남',
  경북: '경북',
  경상북도: '경북',
  경남: '경남',
  경상남도: '경남',
  제주: '제주',
  제주도: '제주',
  제주특별자치도: '제주',
}

function addressTokens(address: string): string[] {
  const tokens = address.trim().split(/\s+/)
  if (tokens[0] && SIDO_ALIASES[tokens[0]]) tokens[0] = SIDO_ALIASES[tokens[0]]
  return tokens
}

/**
 * 고른 주소의 토큰이 후보의 앞부분과 **모두** 일치하면 참. 뒤에 건물명이 더 붙는 건 허용한다.
 *
 * 글자 단위 접두 비교(`startsWith`)를 쓰면 안 된다. `신촌로 12` 가 `신촌로 120` 과
 * `신촌로 12-1` 에도 걸려서, 옆 건물 좌표가 조용히 들어간다. 토큰으로 끊으면 건물번호가
 * 통째로 달라야 통과하지 못한다.
 *
 * `지하` 같은 토큰(`서초대로 지하 219`)은 지상과 다른 주소라 절대 지우면 안 된다.
 * 그래서 여기서는 토큰을 빼는 정규화를 일절 하지 않는다.
 */
export function matchesPicked(picked: string, candidate: string): boolean {
  if (picked.trim() === '' || candidate.trim() === '') return false

  const wanted = addressTokens(picked)
  const found = addressTokens(candidate)

  return wanted.length > 0 && wanted.length <= found.length && wanted.every((t, i) => t === found[i])
}

/** 소수 4자리(약 11m)까지 같으면 같은 지점으로 본다. */
const sameSpot = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4

type Candidate = { roadAddress: string; jibunAddress: string; lat: number; lng: number }

/**
 * 후보 중 사용자가 고른 주소에 해당하는 것만 남긴다.
 *
 * 도로명으로 먼저 좁히고, 그래도 여럿이면 지번으로 한 번 더 가른다. 지번을 OR 조건으로
 * 쓰면 오히려 과하게 걸려서, **도로명으로 좁힌 집합 안에서만** 쓴다.
 *
 * 한 건으로 안 좁혀지면 빈 배열이 아니라 좁혀진 만큼 돌려준다. 호출부가 그 개수를 보고
 * 자동으로 쓸지 물어볼지 정한다.
 */
export function narrowCandidates<T extends Candidate>(
  picked: { roadAddress: string; jibunAddress: string },
  items: T[],
): T[] {
  // 도로명이 없는 주소를 골랐다면(드물다) 지번으로 맞춰 보는 수밖에 없다.
  const base = picked.roadAddress
    ? items.filter((item) => matchesPicked(picked.roadAddress, item.roadAddress))
    : items.filter((item) => matchesPicked(picked.jibunAddress, item.jibunAddress))

  if (base.length <= 1) return base

  if (picked.jibunAddress) {
    const byJibun = base.filter((item) => matchesPicked(picked.jibunAddress, item.jibunAddress))
    if (byJibun.length > 0 && byJibun.length < base.length) return byJibun
  }

  // 좌표가 사실상 같으면 중복 데이터다. 어느 쪽을 집어도 결과가 같으니 묻지 않는다.
  if (base.every((item) => sameSpot(item, base[0]))) return [base[0]]

  return base
}
