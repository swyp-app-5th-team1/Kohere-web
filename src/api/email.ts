import { ApiError, api } from './client'

/**
 * 가입용 이메일 인증. 회원가입(`/auth/signup`)의 선행 단계라 계정이 없는 상태에서 부른다.
 * 연락처(휴대폰) 인증과는 서로 순서가 무관하다.
 *
 * 정식 사용자용 이메일 인증(`/auth/email/verification-code`)과는 **다른 엔드포인트**다.
 * 인증번호 정책(6자리 · 5분 만료 · 확인 5회 · 재발송 60초)은 같지만 섞어 쓰면 안 된다.
 */
const SEND_CODE_PATH = '/api/v1/auth/email/signup/verification-code'
const VERIFY_PATH = '/api/v1/auth/email/signup/verify'

/** 인증번호 정책. 휴대폰 인증과 같은 값이지만 스펙이 따로라 상수도 따로 둔다. */
export const EMAIL_CODE_LENGTH = 6
/** 재발송 간격. 이보다 빨리 다시 부르면 429 다. */
export const EMAIL_RESEND_COOLDOWN_SECONDS = 60

export type SendEmailCodeResult = {
  /** 마스킹된 주소(`do***@work.example`). */
  email: string
  /** 인증번호 만료까지 초(300 = 5분). */
  expiresIn: number
}

export type VerifyEmailResult = {
  /** 마스킹된 주소(`do***@work.example`). */
  email: string
  verified: boolean
}

/**
 * 서버는 대소문자 · 앞뒤 공백을 무시하고 같은 주소로 본다. 발송 · 확인 · 가입 세 곳에
 * 표기가 달라도 되지만, 화면에서 미리 맞춰 보내 헷갈릴 여지를 없앤다.
 */
const normalize = (email: string) => email.trim().toLowerCase()

/**
 * 이메일 인증번호를 발송한다.
 *
 * 휴대폰 인증과 달리 **계정 존재가 드러난다** — 이미 웹 로그인 ID 로 쓰이는 주소면
 * 발송하지 않고 409 를 준다. 로그인 ID 중복 확인을 겸하도록 서버가 정한 동작이다.
 *
 * 최상위 도메인이 없는 주소(`kim@work`)는 400 이다. 인증 메일이 도착할 수 없는 값은
 * 화면에서 먼저 거른다(auth.ts 의 emailFormatError 가 서버와 같은 규칙이다).
 */
export function sendSignupEmailCode(email: string): Promise<SendEmailCodeResult> {
  return api.post<SendEmailCodeResult>(SEND_CODE_PATH, { email: normalize(email) })
}

/**
 * 인증번호를 확인해 가입용 이메일 인증을 마친다.
 *
 * 성공하면 인증 마커가 생기는데 **30분만 유효하고, 가입 제출 때 1회 소비된다.**
 * 그 안에 가입을 마치지 않으면 가입 단계에서 422 AUTH_EMAIL_NOT_VERIFIED 가 나고
 * 발송부터 다시 해야 한다. 인증번호도 1회용이라 성공한 번호를 다시 내면 422 다.
 */
export function verifySignupEmailCode(email: string, code: string): Promise<VerifyEmailResult> {
  return api.post<VerifyEmailResult>(VERIFY_PATH, { email: normalize(email), code })
}

/** 발송 실패 문구. */
export function sendEmailCodeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return '이메일 주소를 정확히 입력해 주세요. (예: name@example.com)'

    // 이미 웹 로그인 ID 다. 인증을 진행해 봐야 가입이 막히므로 여기서 로그인으로 안내한다.
    case 'AUTH_EMAIL_ALREADY_REGISTERED':
      return '이미 가입된 이메일입니다. 로그인해 주세요.'

    // 재발송 60초 미달 · 같은 이메일 5회/시간 · 같은 IP 20회/시간이 한 코드로 온다.
    // 어느 쪽에 걸렸는지 서버가 알려주지 않으므로 문구도 원인을 짚지 않는다.
    case 'TOO_MANY_REQUESTS':
      return '인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.'

    // 발송이 실패하면 인증번호가 새로 발급되지 않는다. 기다리지 말고 다시 눌러야 한다.
    case 'UPSTREAM_ERROR':
      return '인증 메일 발송에 실패했습니다. 인증번호를 다시 받아 주세요.'

    default:
      return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

/** 인증번호 확인 실패 문구. */
export function verifyEmailErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '인증 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return `인증번호 ${EMAIL_CODE_LENGTH}자리를 입력해 주세요.`

    /*
     * 번호 불일치 · 만료 · 시도 5회 초과 · 발송받은 적 없음 · 이미 사용이 모두 이 코드
     * 하나로 온다. 비로그인 경로라 시도 초과도 429 가 아니라 여기로 묶여서, 어느 쪽인지
     * 알 수 없다. 그래서 문구도 원인을 단정하지 않고 재발송까지 안내한다.
     */
    case 'AUTH_EMAIL_VERIFICATION_FAILED':
      return '인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 받아 주세요.'

    default:
      return '인증 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
