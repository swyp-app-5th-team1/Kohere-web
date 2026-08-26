import { ApiError, api } from './client'
import { clearTokens, saveTokens } from './tokens'
import type { AuthTokens } from './types'

/** 임대인 웹 로그인. client.ts 의 NO_AUTH_PATHS 에도 같은 경로가 들어 있다. */
const LOGIN_PATH = '/api/v1/auth/login'

/**
 * 로그인 응답.
 *
 * refresh 토큰은 본문에 없다 — `Set-Cookie: refreshToken` 으로만 내려온다.
 */
export type LoginResponse = AuthTokens & {
  /** 웹 로그인은 온보딩 재개 분기가 없어 서버가 항상 false 를 준다. */
  onboardingRequired: boolean
  /** 웹 계정은 부분 완료가 없어 항상 'ACTIVE'. */
  status: string
  /** access 토큰 만료까지 초 (3600) */
  expiresIn: number
  /** 회원 프로필 이메일. 로그인 ID 로 쓴 이메일과 다를 수 있다. */
  email: string
  /** 아직 이름을 정하지 않은 계정은 null 이다. */
  name: string | null
}

/**
 * 로그인 ID 는 회원 프로필 이메일이 아니라 가입할 때 정한 웹 이메일이다.
 *
 * 실패는 모두 ApiError 로 던져진다. 화면 문구는 loginErrorMessage 로 만든다.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const result = await api.post<LoginResponse>(LOGIN_PATH, { email, password })
  saveTokens(result)
  return result
}

/**
 * 로그인 실패에 실려 오는 시도 횟수 (401 AUTH_INVALID_CREDENTIALS 전용).
 *
 * 비밀번호가 틀린 경우에만 실린다. 미등록 이메일이나 시도 한도 초과처럼 다른 이유로
 * 401 이 나면 details 자체가 없어서 여기서 undefined 가 나온다 — 그래서 이 값의 유무가
 * 곧 「이 계정은 실재한다」는 신호이기도 하다. 화면 문구를 이걸로 갈라서는 안 된다.
 */
export type LoginAttempts = {
  /** 지금까지 누적된 연속 실패 횟수. */
  failed: number
  /** 잠기는 기준. */
  max: number
}

/**
 * 잠금 기준 횟수 (시안 224:30719 · 224:30728).
 *
 * 계정마다 다른 값이 아니라 정책 상수라 화면에 박아 둔다. 401 에 실려 오면 그 값을 쓰고,
 * 잠긴 뒤(423)처럼 안 실려 오는 응답에서는 이 값으로 문구를 채운다.
 * 정책이 바뀌면 여기 하나만 고치면 된다.
 */
export const MAX_LOGIN_ATTEMPTS = 10

export function loginAttempts(error: unknown): LoginAttempts | null {
  if (!(error instanceof ApiError)) return null
  const failed = error.detailNumber('failedAttempts')
  const max = error.detailNumber('maxFailedAttempts')
  return failed === undefined || max === undefined ? null : { failed, max }
}

/**
 * 이번 실패로 계정이 잠겼는지.
 *
 * 스펙 주의사항에 적힌 대로, failedAttempts 가 maxFailedAttempts 에 닿은 응답이 곧
 * 잠금 시점이다. 그 응답의 상태 코드는 아직 401 이고 423 은 그 다음 시도부터 나온다.
 * 그래서 401 인데도 잠금 팝업을 띄워야 하는 순간이 존재한다.
 */
export function isLockedByThisAttempt(error: unknown): boolean {
  const attempts = loginAttempts(error)
  return attempts !== null && attempts.failed >= attempts.max
}

/**
 * 로그인 실패를 화면에 보여줄 한글 문구로 바꾼다.
 *
 * 서버 message 는 영문이라 그대로 뿌릴 수 없고, 분기는 반드시 error.code 로 한다.
 */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return '이메일과 비밀번호를 모두 입력해 주세요.'

    // 미등록 이메일과 비밀번호 불일치를 서버가 구분하지 않는다. 계정이 있는지 알려주지
    // 않으려는 것이므로 화면 문구도 구분하면 안 된다.
    case 'AUTH_INVALID_CREDENTIALS':
      return '이메일 또는 비밀번호가 올바르지 않습니다.'

    // 시간이 지나도 자동으로 풀리지 않는다. 본인이 재설정을 완주하는 것만이 해제다.
    case 'AUTH_ACCOUNT_LOCKED':
      return '비밀번호를 여러 번 잘못 입력해 계정이 잠겼습니다. 비밀번호를 재설정해 주세요.'

    // 이메일이 있든 없든 자격증명 조회 전에 걸리므로, 어느 축에 걸렸는지 알려주지 않는다.
    case 'TOO_MANY_REQUESTS':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'

    default:
      return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

const SIGNUP_PATH = '/api/v1/auth/signup'

export type SignupRequest = {
  name: string
  /** YYYY-MM-DD. 미래 날짜는 400 이다. */
  birthDate: string
  /** 하이픈 없이 숫자만. 이 값 하나로 앱 임대인 계정과 연동 여부를 판정한다. */
  phoneNumber: string
  /** 웹 로그인 ID. 앱 소셜 계정과 같은 주소여도 정상이다. */
  email: string
  /** 영문 · 숫자 · ASCII 특수문자 각 1자 이상, 8~20자, 공백 불가. */
  password: string
  termsOfServiceAgreed: boolean
  privacyPolicyAgreed: boolean
  marketingAgreed: boolean
}

export type SignupResponse = LoginResponse & {
  /** true 면 새 계정을 만든 게 아니라 같은 번호의 앱 임대인 계정에 웹 자격증명만 붙인 것이다. */
  linked: boolean
}

/**
 * 임대인 웹 회원가입. 성공하면 곧바로 로그인 상태가 된다(토큰이 함께 내려온다).
 *
 * 선행 조건이 있다 — 제출하는 번호로 휴대폰 인증을 먼저 마쳐야 하고, 인증 마커가 없으면
 * 422 AUTH_PHONE_NOT_VERIFIED 가 나면서 계정 생성도 연동도 일어나지 않는다.
 *
 * 이메일과 이름은 회원 프로필의 값이라, 연동된 계정이면 폼에 적은 웹 이메일이 아니라
 * 소셜 진본 이메일이 돌아올 수 있다.
 */
export async function signup(body: SignupRequest): Promise<SignupResponse> {
  const result = await api.post<SignupResponse>(SIGNUP_PATH, body)

  /*
   * 응답에 토큰이 함께 오지만 저장하지 않는다. 시안(182:6031)이 가입 직후
   * "로그인 후 서비스를 이용해주세요" 로 로그인 화면에 보내는 흐름이라, 저장해 두면
   * 팝업을 닫고 주소를 직접 치는 것만으로 로그인 없이 들어가진다.
   *
   * 이전 세션이 남아 있을 수 있으니 지우기까지 한다. refresh 쿠키는 서버가 내려준 것이라
   * 지울 수 없지만, accessToken 이 없으면 로그인 상태로 보지 않는다.
   */
  clearTokens()
  return result
}

/**
 * 이메일 형식을 화면에서 미리 걸러 준다.
 *
 * 아이디 칸에 한글을 치는 경우가 많은데, 그대로 보내면 서버가 400 INVALID_INPUT 으로
 * 막고 영문 사유만 돌아온다. 어느 칸이 문제인지 바로 알려주려고 여기서 본다.
 */
export function emailFormatError(email: string): string | null {
  // 길이를 먼저 본다. 형식 문구로 뭉뚱그리면 왜 막혔는지 알 수 없다.
  if (email.length > 255) return '이메일 주소는 255자 이내로 입력해 주세요.'
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return '이메일 주소를 영문·숫자로 정확히 입력해 주세요.'
  }
  return null
}

/**
 * @ 앞부분. 화면이 아이디와 도메인을 따로 받으므로 검사도 따로 한다.
 * 한 칸으로 합쳐서 보면 도메인을 목록에서 골랐는데도 아이디 칸에 오류가 붙는다.
 */
export function emailLocalError(local: string): string | null {
  if (local.trim() === '') return '이메일 주소를 입력해 주세요.'
  if (!/^[A-Za-z0-9._%+-]+$/.test(local)) {
    return '영문·숫자와 . _ % + - 만 쓸 수 있습니다.'
  }
  return null
}

/** @ 뒷부분. 목록에서 고르면 늘 유효하니, 직접 입력했을 때만 형식을 볼 값이다. */
export function emailDomainError(domain: string): string | null {
  if (domain.trim() === '') return '도메인을 고르거나 입력해 주세요.'
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(domain)) {
    return '도메인 형식을 확인해 주세요. (예: gmail.com)'
  }
  return null
}

/**
 * 「보내볼 만한 주소인가」만 보는 최소 관문.
 *
 * 형식을 정밀하게 따지지 않는 이유는, 이 값의 진짜 판정을 메일 발송이 하기 때문이다.
 * 정규식은 「그럴듯하다」까지만 증명하고 메일 도착은 「실재하고 본인이 연다」를 증명하니,
 * 앞엣것을 조일수록 멀쩡한 주소만 막힌다. 그래서 버튼을 켤지 말지에만 쓴다.
 */
export function isEmailShaped(email: string): boolean {
  const at = email.indexOf('@')
  if (at <= 0 || at !== email.lastIndexOf('@')) return false
  const domain = email.slice(at + 1)
  return (
    domain.length > 2 &&
    domain.includes('.') &&
    !domain.startsWith('.') &&
    !domain.endsWith('.')
  )
}

/** 이름은 성과 이름을 합쳐 한 칸에 받는다. 서버 제한이 200자다. */
export function nameFormatError(name: string): string | null {
  if (name.trim() === '') return '이름을 입력해 주세요.'
  if (name.length > 200) return '이름은 200자 이내로 입력해 주세요.'
  return null
}

/**
 * 비밀번호 정책을 화면에서 미리 걸러 준다. 서버 규칙과 같은 조건이라
 * 여기서 통과하면 400 INVALID_INPUT(field=password)은 나지 않는다.
 */
export function passwordPolicyError(password: string): string | null {
  if (/\s/.test(password)) return '비밀번호에 공백은 넣을 수 없습니다.'
  if (password.length < 8 || password.length > 20) return '비밀번호는 8~20자로 입력해 주세요.'
  if (!/[A-Za-z]/.test(password)) return '영문자를 1자 이상 포함해 주세요.'
  if (!/[0-9]/.test(password)) return '숫자를 1자 이상 포함해 주세요.'
  if (!/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password)) {
    return '특수문자를 1자 이상 포함해 주세요.'
  }
  return null
}

/** 회원가입 실패를 화면 문구로 바꾼다. 로그인과 마찬가지로 분기는 error.code 로 한다. */
export function signupErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    // 어떤 칸이 틀렸는지는 errors[] 에 담겨 온다. 대표 사유 하나를 그대로 보여준다.
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '입력한 내용을 다시 확인해 주세요.'

    case 'AUTH_EMAIL_ALREADY_REGISTERED':
      return '이미 가입된 이메일입니다. 로그인해 주세요.'

    // 번호로 찾은 계정에 이미 웹 자격증명이 있다. 어떤 이메일인지는 알려주지 않는다.
    case 'AUTH_WEB_ACCOUNT_ALREADY_EXISTS':
      return '이미 가입된 계정이 있습니다. 로그인해 주세요.'

    // 앱 온보딩과 거의 동시에 계정이 확정된 경우다. 그대로 다시 내면 연동되어 성공한다.
    case 'RESOURCE_CONFLICT':
      return '처리가 겹쳤습니다. 다시 한 번 눌러 주세요.'

    /*
     * 인증을 안 했거나, 했더라도 마커가 만료(30분)됐거나, 이미 다른 가입에 쓴 경우다.
     * 서버가 마커 남은 시간을 내려주지 않아 화면이 미리 알 수 없고, 셋을 구분해 주지도
     * 않는다. 그래서 원인을 단정하지 않고 다시 인증하도록만 안내한다.
     */
    case 'AUTH_PHONE_NOT_VERIFIED':
      return '휴대폰 인증이 만료되었습니다. 인증번호를 다시 받아 주세요.'

    case 'AUTH_REQUIRED_AGREEMENT_MISSING':
      return '필수 약관에 동의해 주세요.'

    default:
      return '가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

const LOGOUT_PATH = '/api/v1/auth/logout'

/**
 * 로그아웃. 서버의 refresh 토큰을 무효화하고 로컬 토큰을 지운다.
 *
 * refresh 를 읽는 규칙은 재발급과 같다 — 쿠키 우선 · 본문 fallback 이라 본문 없이 부른다.
 * 쿠키로 보낸 요청에는 서버가 Max-Age=0 삭제 쿠키를 함께 내려 브라우저에 남은 refresh 도 지운다.
 * 이미 무효한 토큰이어도 204 라 여러 번 불러도 안전하다.
 *
 * 재발급과 다른 점 두 가지에 주의한다.
 * 1. **인증이 필요하다.** Authorization 헤더가 붙어야 하므로 NO_AUTH_PATHS 에 넣으면 안 된다.
 * 2. **access 토큰은 무효화되지 않는다.** 남은 만료 시간까지 그대로 API 가 호출되므로
 *    로컬에서 반드시 지워야 한다 — 그래서 호출이 실패해도 clearTokens 는 건너뛰지 않는다.
 */
export async function logout(): Promise<void> {
  try {
    await api.post<void>(LOGOUT_PATH)
  } catch {
    // 네트워크 오류든 401·403 이든 사용자가 할 수 있는 일이 없다. 여기서 막으면 오히려
    // 로그아웃을 눌렀는데 로그인 상태로 남는다. 서버 정리는 포기하고 로컬만 확실히 지운다.
  } finally {
    clearTokens()
  }
}

/** 가입 이메일 찾기. client.ts 의 NO_AUTH_PATHS 에도 같은 경로가 들어 있다. */
const FIND_EMAIL_PATH = '/api/v1/auth/email/find'

/*
 * 비밀번호 재설정 두 단계. 경로는 로그인 스펙의 잠금 해제 안내에 적힌 것을 그대로 쓴다
 * ("해제는 본인이 reset-link → reset 을 완주하는 것").
 *
 * TODO(스펙 확정 후 수정): 두 경로의 요청 본문 스펙은 아직 못 봤다. 아래 필드 이름은
 * 로그인 · 회원가입 스펙의 작명(email, password)을 따라 짐작한 것이라 확인이 필요하다.
 */
const RESET_LINK_PATH = '/api/v1/auth/password/reset-link'
const RESET_PASSWORD_PATH = '/api/v1/auth/password/reset'

/** 하이픈은 서버가 알아서 정규화하지만, 보낼 때 숫자만 남겨 두면 헷갈릴 일이 없다. */
const digitsOnly = (phone: string) => phone.replace(/\D/g, '')

export type FindEmailResponse = {
  /**
   * 웹 로그인 ID(`local_accounts.email`)를 서버가 가린 값 (`ki***@work.com`).
   *
   * 회원 프로필 이메일이 아니다 — 앱 소셜 계정과 연동된 임대인은 두 값이 다를 수 있고,
   * 이 화면이 알려 줘야 하는 건 로그인 칸에 칠 ID 쪽이다.
   *
   * 마스킹은 서버가 한다. 원본을 내려주고 화면에서 가리면 가리는 의미가 없다.
   */
  email: string
}

/**
 * 전화번호 · 이름으로 가입한 웹 로그인 ID 를 가려진 형태로 돌려받는다.
 *
 * 부르기 전에 **이메일 찾기 전용** 문자 인증을 마쳐야 한다. 회원가입용 마커로는 통과하지
 * 못하고 422 가 난다.
 *
 * 성공하면 서버가 그 마커를 소비(삭제)한다. 마커 하나로 번호를 바꿔 가며 무한히 조회하는
 * 걸 막기 위해서다 — 그래서 한 번 찾고 나면 다시 찾으려면 인증부터 새로 해야 한다.
 * 반대로 404(못 찾음)는 마커를 태우지 않아 이름만 고쳐 곧바로 다시 시도할 수 있다.
 *
 * 이름은 가입 폼에 적은 값과 대조한다. 서버가 공백을 모두 지우고 대소문자를 무시해
 * 비교하므로 「홍 길동」과 「홍길동」은 같은 이름이다.
 */
export function findEmail(name: string, phone: string): Promise<FindEmailResponse> {
  return api.post<FindEmailResponse>(FIND_EMAIL_PATH, {
    phoneNumber: digitsOnly(phone),
    name,
  })
}

/** 이메일 찾기 실패를 화면 문구로 바꾼다. 404 는 팝업이 따로 있어 여기서 다루지 않는다. */
export function findEmailErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    /*
     * 인증을 안 했거나, 만료됐거나, 이미 한 번 찾는 데 써 버린 마커다. 서버가 셋을
     * 구분해 주지 않으므로 원인을 단정하지 않고 다시 받으라고만 안내한다.
     */
    case 'AUTH_PHONE_NOT_VERIFIED':
      return '휴대폰 인증이 만료되었습니다. 인증번호를 다시 받아 주세요.'

    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '입력한 내용을 다시 확인해 주세요.'

    default:
      return '요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

export type ResetLinkResult = {
  /** 링크가 살아 있는 초 (1800 = 30분). 가입되지 않은 주소에도 같은 값이 온다. */
  expiresIn: number
}

/**
 * 비밀번호 재설정 링크 발송을 요청한다.
 *
 * 「비밀번호를 잊었다」와 「계정이 잠겼다(423)」의 진입점이 같다 — 화면은 둘이지만 API 는
 * 하나이고, 잠금만 푸는 엔드포인트는 따로 없다.
 *
 * 이름 · 연락처 같은 확인 값을 받지 않는다. 소유 증명은 **메일 수신 자체**가 한다.
 * 조회 대상은 웹 로그인 ID(`local_accounts.email`) 하나뿐이고 회원 프로필 이메일은 보지
 * 않는다 — 앱 소셜 계정과 연동된 임대인도 웹에 적은 주소로 링크를 받는다.
 *
 * 가입되지 않은 주소에도 **`expiresIn` 까지 똑같은 200** 이 온다(메일만 안 간다).
 * 선행 게이트가 없어 아무 주소로나 부를 수 있어서, 응답을 가르는 순간 완전한 가입 여부
 * 조회기가 되기 때문이다. 그러니 화면 문구도 절대 갈라서는 안 된다.
 */
export function requestPasswordResetLink(email: string): Promise<ResetLinkResult> {
  return api.post<ResetLinkResult>(RESET_LINK_PATH, { email })
}

/** 재설정 링크 발송 실패 문구. */
export function resetLinkErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '이메일 주소를 다시 확인해 주세요.'

    // 같은 이메일 5회/시간 · 같은 IP 20회/시간이 한 코드로 온다. 로그인 시도 한도와는
    // 버킷을 공유하지 않는다. 어느 축인지 서버가 알려주지 않으므로 문구도 짚지 않는다.
    case 'TOO_MANY_REQUESTS':
      return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.'

    case 'UPSTREAM_ERROR':
      return '메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'

    default:
      return '메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

/**
 * 메일로 받은 링크를 타고 들어와 새 비밀번호를 확정한다 (시안 224:30754).
 *
 * **이 호출 하나가 계정 잠금 해제까지 겸한다** — 토큰 소비 · 비밀번호 교체 · 잠금 해제 ·
 * 실패 카운터 초기화 · 기존 세션 전량 무효화가 한 번에 일어난다.
 *
 * 204 다. 본문도 `Set-Cookie` 도 없다 — 재설정은 세션을 만드는 자리가 아니다. 방금 전량
 * 무효화한 자리에 새 세션을 껴 넣으면 유출된 링크를 주운 쪽이 그대로 로그인 상태가 된다.
 * 그래서 성공하면 로그인 화면으로 보낸다.
 *
 * 성공하면 토큰은 그 자리에서 죽는다. 같은 링크를 두 번 제출하면 두 번째는 422 다.
 * 반대로 비밀번호 정책 위반(400)에서는 토큰이 소비되지 않아 다시 시도할 수 있다.
 */
export function resetPassword(token: string, newPassword: string): Promise<void> {
  return api.post(RESET_PASSWORD_PATH, { token, newPassword })
}

/** 재설정 확정 실패 문구. 비밀번호 칸에 붙일 사유는 따로 꺼내 쓴다. */
export function resetPasswordErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    /*
     * 토큰이 없거나 만료됐거나 이미 쓴 링크다. 이 판정이 첫 단계라 비밀번호 · 잠금 ·
     * 세션 어느 것도 건드리지 않은 상태이므로, 링크를 새로 받으라고만 안내하면 된다.
     */
    case 'AUTH_PASSWORD_RESET_TOKEN_INVALID':
      return '링크가 만료되었거나 이미 사용되었습니다. 재설정 링크를 다시 받아 주세요.'

    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '입력한 내용을 다시 확인해 주세요.'

    default:
      return '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
