import { api } from './client'
import { clearTokens, saveTokens } from './tokens'
import type { AuthTokens } from './types'

/**
 * TODO(스펙 확정 후 수정): 이메일 · 비밀번호 로그인 엔드포인트.
 *
 * 현재 서버에는 소셜 로그인(`/api/v1/auth/social-login`)만 있고 이 경로는 아직 없다.
 * 경로와 요청 · 응답 형태가 정해지면 이 파일만 고치면 화면은 그대로 동작한다.
 * client.ts 의 NO_AUTH_PATHS 에도 같은 경로가 들어 있으니 함께 수정한다.
 */
const LOGIN_PATH = '/api/v1/auth/login'

/**
 * 로그인 응답. 앱의 `SocialLoginResponse` 와 같은 형태로 맞춰달라고 요청해둔 상태다.
 * 같은 형태면 `/auth/reissue` · `/auth/logout` 을 그대로 재사용할 수 있다.
 */
export type LoginResponse = AuthTokens & {
  /** true 면 아직 온보딩(사업자번호 · 휴대폰 인증)을 마치지 않은 계정이다. */
  onboardingRequired: boolean
  status: string
  expiresIn: number
  email: string
  name: string
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const result = await api.post<LoginResponse>(LOGIN_PATH, { email, password })
  saveTokens(result)
  return result
}

export function logout(): void {
  // TODO: 서버 `/api/v1/auth/logout` 호출도 함께 붙인다(refresh 토큰 무효화).
  clearTokens()
}
