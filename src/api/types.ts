/**
 * 서버 공통 응답 봉투. 모든 API 응답이 이 형태로 감싸져 온다.
 * 성공이면 data, 실패면 error 가 채워진다. (앱의 BaseResponseDTO 와 동일)
 */
export type BaseResponse<T> = {
  success: boolean
  data: T | null
  error: ApiErrorBody | null
}

export type ApiErrorBody = {
  code: string
  message: string
  errors: ApiFieldError[]
}

/** 폼 검증 실패 시 어떤 필드가 왜 틀렸는지. 등록 폼에서 필드별 에러 표시에 쓴다. */
export type ApiFieldError = {
  field: string
  reason: string
}

/** 목록 응답에 함께 오는 페이지 정보. */
export type PageInfo = {
  number: number | null
  size: number | null
  totalElements: number | null
  totalPages: number | null
  hasNext: boolean | null
}

/**
 * 서버가 코드와 표시용 라벨을 함께 내려주는 값(ADR-0037).
 * 화면에는 label 을 보여주고, 서버로 보낼 때는 code 를 보낸다.
 */
export type CodeLabel = {
  code: string
  label: string
}

/**
 * 로그인·재발급 응답의 토큰 묶음.
 *
 * refresh 토큰은 여기 없다. 서버가 `Set-Cookie: refreshToken` 으로만 내려주고
 * JS 에서는 읽을 수 없다(HttpOnly). 읽을 필요도 없다 — 재발급 요청에 쿠키가 자동으로 실린다.
 */
export type AuthTokens = {
  tokenType: string
  accessToken: string
}
