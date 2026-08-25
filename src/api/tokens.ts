import type { AuthTokens } from './types'

/**
 * 토큰 저장소.
 *
 * localStorage 를 쓰는 이유: 매물 등록이 여러 스텝에 걸쳐 진행되는데 중간에 새로고침하거나
 * 탭을 닫았다 다시 열어도 로그인이 유지되어야 한다. sessionStorage 는 탭을 닫으면 사라진다.
 *
 * refresh 토큰은 저장하지 않는다. 서버가 HttpOnly 쿠키로만 내려주므로 JS 가 읽을 수 없고,
 * 재발급 요청에 브라우저가 알아서 실어 보낸다.
 */
const ACCESS_KEY = 'kohere.accessToken'
const TYPE_KEY = 'kohere.tokenType'

/** refresh 를 본문으로 받던 시절에 쓰던 키. 남아 있으면 지우기만 한다. */
const LEGACY_REFRESH_KEY = 'kohere.refreshToken'

export function loadTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(ACCESS_KEY)
  if (!accessToken) return null

  return {
    accessToken,
    // 서버가 tokenType 을 비워 보내는 경우가 있어 앱과 동일하게 Bearer 로 폴백한다.
    tokenType: localStorage.getItem(TYPE_KEY) || 'Bearer',
  }
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken)
  localStorage.setItem(TYPE_KEY, tokens.tokenType || 'Bearer')
  localStorage.removeItem(LEGACY_REFRESH_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(TYPE_KEY)
  localStorage.removeItem(LEGACY_REFRESH_KEY)
}
