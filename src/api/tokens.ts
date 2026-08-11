import type { AuthTokens } from './types'

/**
 * 토큰 저장소.
 *
 * localStorage 를 쓰는 이유: 매물 등록이 여러 스텝에 걸쳐 진행되는데 중간에 새로고침하거나
 * 탭을 닫았다 다시 열어도 로그인이 유지되어야 한다. sessionStorage 는 탭을 닫으면 사라진다.
 */
const ACCESS_KEY = 'kohere.accessToken'
const REFRESH_KEY = 'kohere.refreshToken'
const TYPE_KEY = 'kohere.tokenType'

export function loadTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(ACCESS_KEY)
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    refreshToken,
    // 서버가 tokenType 을 비워 보내는 경우가 있어 앱과 동일하게 Bearer 로 폴백한다.
    tokenType: localStorage.getItem(TYPE_KEY) || 'Bearer',
  }
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  localStorage.setItem(TYPE_KEY, tokens.tokenType || 'Bearer')
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(TYPE_KEY)
}
