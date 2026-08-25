import { clearTokens, loadTokens, saveTokens } from './tokens'
import type { ApiFieldError, AuthTokens, BaseResponse } from './types'

/**
 * 두 환경 모두 빈 문자열이라 `/api/...` 상대주소로 나간다. 개발 중에는 Vite 프록시가
 * dev 서버로 중계하고, 배포본은 백엔드와 같은 오리진에서 서빙돼 Caddy 가 백엔드로 넘긴다.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** 토큰을 붙이지 않는 경로. 로그인·재발급은 아직 인증 전이거나 토큰이 만료된 상태로 호출된다. */
const NO_AUTH_PATHS = [
  '/api/v1/auth/social-login',
  '/api/v1/auth/reissue',
  // TODO(스펙 확정 후 수정): 이메일 로그인 · 계정 찾기 경로.
  // api/auth.ts 의 LOGIN_PATH · FIND_EMAIL_PATH · RESET_PASSWORD_PATH 와 같아야 한다.
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/phone/signup/verification-code',
  '/api/v1/auth/phone/signup/verify',
  '/api/v1/auth/find-email',
  '/api/v1/auth/password/reset-request',
]

const REISSUE_PATH = '/api/v1/auth/reissue'

/** 서버가 내려준 에러를 그대로 담는다. 화면에서 code 로 분기하고 message 를 보여준다. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  /** 폼 검증 실패 시 필드별 사유. 등록 폼에서 각 입력칸 아래 표시하는 데 쓴다. */
  readonly fieldErrors: ApiFieldError[]

  constructor(
    code: string,
    message: string,
    status: number,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let onSessionExpired: (() => void) | null = null

/** 세션이 끊겼을 때 로그인 화면으로 보내는 처리를 앱 루트에서 등록한다. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler
}

/**
 * 진행 중인 재발급 요청. 여러 요청이 동시에 401 을 받아도 재발급은 한 번만 돌고
 * 나머지는 이 Promise 를 같이 기다린다. (앱의 RefreshTokenManager 와 같은 역할)
 *
 * 성능이 아니라 **정확성** 때문에 필요하다. refresh 는 재발급마다 회전되고 이전 토큰은 즉시
 * 무효해지는데, 다시 쓰면 서버가 탈취로 간주해 그 사용자의 모든 세션을 끊는다. 재발급이 겹쳐
 * 돌면 두 번째가 이미 회전된 토큰을 재사용하게 되므로 반드시 한 번만 돌아야 한다.
 */
let refreshInFlight: Promise<AuthTokens> | null = null

function refreshTokens(): Promise<AuthTokens> {
  if (!refreshInFlight) {
    refreshInFlight = requestReissue().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * access 토큰 재발급. 웹과 앱이 같은 엔드포인트를 쓴다.
 *
 * 서버는 refresh 를 **쿠키 우선, 없으면 요청 본문** 순으로 읽는다. 브라우저는 HttpOnly 쿠키가
 * 자동으로 실리므로 본문 없이 부르면 되고, 본문을 아예 보내지 않는 것은 오류가 아니다.
 * (쿠키·본문 어느 쪽에도 값이 없을 때만 400 INVALID_INPUT)
 *
 * 응답 채널은 요청 채널을 따른다 — 쿠키로 보냈으니 회전된 refresh 도 Set-Cookie 로만 오고
 * 본문의 refreshToken 은 null 이다. 그래서 여기서 refresh 를 다룰 일이 없다.
 *
 * 인증은 불필요하다. 만료된 access 토큰이 붙어 있어도 서버가 401 로 막지 않는다.
 */
async function requestReissue(): Promise<AuthTokens> {
  const response = await fetch(BASE_URL + REISSUE_PATH, {
    method: 'POST',
    // refresh 쿠키를 보내고 회전된 새 쿠키를 받는 유일한 수단이다. 이게 빠지면 새 쿠키가
    // 저장되지 않아 다음 재발급 때 이미 무효해진 토큰을 다시 쓰게 된다. (아래 주석 참고)
    credentials: 'include',
  })

  const payload = (await response.json()) as BaseResponse<AuthTokens>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.code ?? '재발급 실패')
  }

  saveTokens(payload.data)
  return payload.data
}

function expireSession(): void {
  clearTokens()
  onSessionExpired?.()
}

export type RequestOptions = {
  method?: string
  /** 객체를 넘기면 JSON 으로, FormData 를 넘기면 multipart 로 전송한다. */
  body?: unknown
  signal?: AbortSignal
}

function buildHeaders(path: string, body: unknown): Headers {
  const headers = new Headers()

  // FormData 는 Content-Type 을 직접 설정하면 안 된다. 브라우저가 multipart 경계
  // 문자열(boundary)까지 포함해 자동으로 채워야 서버가 파싱할 수 있다.
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (!NO_AUTH_PATHS.includes(path)) {
    const tokens = loadTokens()
    if (tokens) {
      headers.set('Authorization', `${tokens.tokenType} ${tokens.accessToken}`)
    }
  }

  return headers
}

function sendOnce(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, signal } = options

  return fetch(BASE_URL + path, {
    method,
    // 로그인은 refresh 쿠키를 **받고**, 재발급은 그 쿠키를 **보낸다**. 둘 다 이 옵션이 없으면
    // 쿠키가 저장도 전송도 되지 않는다. 나머지 요청에는 영향이 없어 전역으로 켠다.
    // 배포 환경에서 프론트·API 도메인이 다르면 서버가 Access-Control-Allow-Credentials: true 와
    // 와일드카드가 아닌 정확한 Origin 을 내려줘야 한다.
    credentials: 'include',
    headers: buildHeaders(path, body),
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
  })
}

async function unwrap<T>(response: Response): Promise<T> {
  // 204 No Content 처럼 본문이 없는 응답
  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: BaseResponse<T> | null = null

  if (text) {
    try {
      payload = JSON.parse(text) as BaseResponse<T>
    } catch {
      throw new ApiError(
        'RESPONSE_PARSE_FAILED',
        '서버 응답을 해석하지 못했습니다.',
        response.status,
      )
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.error?.code ?? 'UNKNOWN',
      payload?.error?.message ?? `요청에 실패했습니다. (HTTP ${response.status})`,
      response.status,
      payload?.error?.errors ?? [],
    )
  }

  return payload?.data as T
}

/**
 * 모든 API 호출의 진입점. 응답 봉투를 벗겨 data 만 돌려주고, 실패하면 ApiError 를 던진다.
 *
 * 401 을 받으면 액세스 토큰이 만료된 것으로 보고 재발급 후 **한 번만** 재시도한다.
 * 재발급까지 실패하면 세션을 정리하고 등록된 핸들러를 호출한다.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await sendOnce(path, options)

  const canRetry =
    response.status === 401 && !NO_AUTH_PATHS.includes(path) && loadTokens() !== null

  if (canRetry) {
    try {
      await refreshTokens()
    } catch {
      expireSession()
      throw new ApiError(
        'AUTH_SESSION_EXPIRED',
        '세션이 만료되었습니다. 다시 로그인해 주세요.',
        401,
      )
    }
    response = await sendOnce(path, options)
  }

  return unwrap<T>(response)
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
