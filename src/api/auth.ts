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
 * 로그인 실패를 화면에 보여줄 한글 문구로 바꾼다.
 *
 * 서버 message 는 영문이라 그대로 뿌릴 수 없고, 분기는 반드시 error.code 로 한다.
 *
 * TODO(백엔드 확인 후 수정): 시안에는 "로그인 N회 실패" 모달이 있는데 401 응답에 남은 시도
 * 횟수가 없어서 지금은 N 을 표시할 수 없다. 또 API 는 5회 연속 실패로 잠기는 반면 시안 문구는
 * 10회 기준이라(rate limit 의 '이메일 10회/시간' 과 혼동된 것으로 보인다) 서버가 10회로
 * 맞추기로 했다. 두 가지가 정리되면 아래 문구와 호출부만 고치면 된다 —
 * 그래서 잠금 문구에는 횟수를 넣지 않았다.
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

    // 시간이 지나도 자동으로 풀리지 않는다. 해제는 운영자만 할 수 있다.
    case 'AUTH_ACCOUNT_LOCKED':
      return '비밀번호를 여러 번 잘못 입력해 계정이 잠겼습니다. 고객센터로 문의해 주세요.'

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

/**
 * TODO(스펙 확정 후 수정): 계정 찾기 엔드포인트. 둘 다 서버에 아직 없다.
 * client.ts 의 NO_AUTH_PATHS 에도 같은 경로가 들어 있으니 함께 수정한다.
 */
const FIND_EMAIL_PATH = '/api/v1/auth/find-email'
const RESET_PASSWORD_PATH = '/api/v1/auth/password/reset-request'

/** 서버 형식이 정해지기 전까지는 하이픈을 빼고 숫자만 보낸다. */
const digitsOnly = (phone: string) => phone.replace(/\D/g, '')

export type FindEmailResponse = {
  /**
   * 가려진 이메일 (`ko****@gmail.com`).
   *
   * 마스킹은 반드시 **서버에서** 한다. 이름과 전화번호만 알면 로그인 없이 부를 수 있는
   * 경로라, 원본 이메일을 내려주고 화면에서 가리면 가리는 의미가 사라진다.
   * (시안 메모 「5. 아이디 찾기 결과 마스킹 규칙」— 가리는 정도는 디자이너 · 서버 확정 필요)
   */
  maskedEmail: string
}

/** 이름 · 전화번호로 가입한 이메일을 가려진 형태로 돌려받는다. */
export function findEmail(name: string, phone: string): Promise<FindEmailResponse> {
  return api.post<FindEmailResponse>(FIND_EMAIL_PATH, {
    name,
    phoneNumber: digitsOnly(phone),
  })
}

/** 비밀번호 재설정 메일 발송을 요청한다. 본인 확인용으로 이름 · 전화번호를 함께 보낸다. */
export function requestPasswordReset(
  name: string,
  email: string,
  phone: string,
): Promise<void> {
  return api.post(RESET_PASSWORD_PATH, {
    name,
    email,
    phoneNumber: digitsOnly(phone),
  })
}
