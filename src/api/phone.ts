import { ApiError, api } from './client'

/**
 * 가입용 휴대폰 인증. 회원가입(`/auth/signup`)의 선행 단계라 계정이 없는 상태에서 부른다.
 *
 * 온보딩용 발송(`/auth/phone/verification-code`)과 정책은 같지만 챌린지 키가 별도라
 * 로그인이 필요 없다. 두 경로를 같은 것으로 보면 안 된다.
 */
const SEND_CODE_PATH = '/api/v1/auth/phone/signup/verification-code'
const VERIFY_PATH = '/api/v1/auth/phone/signup/verify'

/** 로그인한 회원의 온보딩·프로필 연락처 변경에 쓰는 인증 경로. */
const PROFILE_SEND_CODE_PATH = '/api/v1/auth/phone/verification-code'
const PROFILE_VERIFY_PATH = '/api/v1/auth/phone/verify'

/*
 * 이메일 찾기용 휴대폰 인증. 정책(6자리 · 5분 만료 · 확인 5회 · 재발송 60초)은 가입용과
 * 똑같지만 **챌린지와 마커의 키스페이스가 다르다.** 가입용 마커로 이메일 찾기를 부르면
 * 422 고 그 반대도 마찬가지라, 아래 두 경로를 위 두 개와 섞어 쓰면 안 된다.
 *
 * 레이트리밋 예산도 가입용과 합산하지 않는다 — 가입 문자를 다 태워 막힌 사람이 복구
 * 경로까지 막히지 않게 한 것이다.
 */
const FIND_EMAIL_SEND_CODE_PATH = '/api/v1/auth/phone/find-email/verification-code'
const FIND_EMAIL_VERIFY_PATH = '/api/v1/auth/phone/find-email/verify'

/** 인증번호 정책. 서버가 정한 값이라 화면 표시도 여기에 맞춘다. */
export const PHONE_CODE_LENGTH = 6
/** 재발송 간격. 이보다 빨리 다시 부르면 429 다. */
export const RESEND_COOLDOWN_SECONDS = 60

export type SendCodeResult = {
  /** 가운데를 가린 번호(`010-****-0001`). */
  phoneNumber: string
  /** 인증번호 만료까지 초(300 = 5분). */
  expiresIn: number
}

export type VerifyPhoneResult = {
  /** 가운데를 가린 번호(`010-****-0001`). */
  phoneNumber: string
  verified: boolean
}

/** 하이픈은 서버가 받아 주지만(선택) 예시를 따라 숫자만 보낸다. */
const digitsOnly = (phone: string) => phone.replace(/\D/g, '')

/**
 * SMS 인증번호를 발송한다.
 *
 * 가입 이력이 있는 번호든 없는 번호든 **응답이 같다.** 이 응답으로 계정 존재 여부를
 * 알 수 없게 한 것이므로, 화면에서도 그걸 드러내는 문구를 쓰면 안 된다.
 */
export function sendSignupPhoneCode(phone: string): Promise<SendCodeResult> {
  return api.post<SendCodeResult>(SEND_CODE_PATH, { phoneNumber: digitsOnly(phone) })
}

/**
 * 인증번호를 확인해 가입용 연락처 인증을 마친다.
 *
 * 성공하면 인증 마커가 생기는데 **30분만 유효하고, 가입 제출 때 1회 소비된다.**
 * 그 안에 가입을 마치지 않으면 가입 단계에서 422 AUTH_PHONE_NOT_VERIFIED 가 나고
 * 발송부터 다시 해야 한다.
 */
export function verifySignupPhoneCode(phone: string, code: string): Promise<VerifyPhoneResult> {
  return api.post<VerifyPhoneResult>(VERIFY_PATH, {
    phoneNumber: digitsOnly(phone),
    code,
  })
}

/** 프로필에서 바꿀 새 연락처로 인증번호를 보낸다. 로그인 토큰이 반드시 붙어야 한다. */
export function sendProfilePhoneCode(phone: string): Promise<SendCodeResult> {
  return api.post<SendCodeResult>(PROFILE_SEND_CODE_PATH, { phoneNumber: digitsOnly(phone) })
}

/** 새 연락처를 확인해 `PATCH /users/me`가 사용할 30분짜리 인증 상태를 만든다. */
export function verifyProfilePhoneCode(phone: string, code: string): Promise<VerifyPhoneResult> {
  return api.post<VerifyPhoneResult>(PROFILE_VERIFY_PATH, {
    phoneNumber: digitsOnly(phone),
    code,
  })
}

/**
 * 이메일 찾기용 SMS 인증번호를 발송한다.
 *
 * 가입용과 마찬가지로 **가입 이력이 있는 번호든 없는 번호든 응답이 같다.** 계정이 있는지
 * 여기서 알려 주면 발송 한 번으로 번호를 열거할 수 있게 된다. 계정 판정은 이름까지 받는
 * `/auth/email/find` 에서만 일어난다.
 */
export function sendFindEmailPhoneCode(phone: string): Promise<SendCodeResult> {
  return api.post<SendCodeResult>(FIND_EMAIL_SEND_CODE_PATH, { phoneNumber: digitsOnly(phone) })
}

/**
 * 인증번호를 확인해 이메일 찾기 전용 마커를 만든다.
 *
 * 마커는 30분 유효하고 소비처는 `/auth/email/find` 하나뿐이다. 넘기면 그쪽에서 422 가
 * 나고 발송부터 다시 해야 한다.
 *
 * 성공 응답도 **계정의 유무는 말하지 않는다** — 「번호를 검증했다」는 사실만 담긴다.
 * 여기서 미리 알려 주면 발송 · 확인 두 번만으로 번호 열거가 성립한다.
 */
export function verifyFindEmailPhoneCode(
  phone: string,
  code: string,
): Promise<VerifyPhoneResult> {
  return api.post<VerifyPhoneResult>(FIND_EMAIL_VERIFY_PATH, {
    phoneNumber: digitsOnly(phone),
    code,
  })
}

/** 인증번호 발송 실패 문구. */
export function sendCodeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '휴대폰 번호를 정확히 입력해 주세요.'

    // 재발송 60초 미달 · 같은 번호 5회/시간 · 같은 IP 20회/시간이 한 코드로 온다.
    // 어느 쪽에 걸렸는지 서버가 알려주지 않으므로 문구도 원인을 짚지 않는다.
    case 'TOO_MANY_REQUESTS':
      return '인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.'

    // 발송이 실패하면 인증번호가 새로 발급되지 않는다. 기다리지 말고 다시 눌러야 한다.
    case 'UPSTREAM_ERROR':
      return '문자 발송에 실패했습니다. 인증번호를 다시 받아 주세요.'

    default:
      return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

/** 인증번호 확인 실패 문구. */
export function verifyPhoneErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '인증 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '인증번호 6자리를 입력해 주세요.'

    /*
     * 코드 불일치 · 만료 · 시도 5회 초과 · 발송받은 적 없음이 모두 이 코드 하나로 온다.
     * 비로그인 경로라 시도 초과도 429 가 아니라 여기로 묶여서, 어느 쪽인지 알 수 없다.
     * 그래서 문구도 원인을 단정하지 않고 재발송까지 안내한다.
     */
    case 'AUTH_PHONE_VERIFICATION_FAILED':
      return '인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 받아 주세요.'

    case 'TOO_MANY_REQUESTS':
      return '인증번호 입력 횟수를 초과했습니다. 인증번호를 다시 받아 주세요.'

    default:
      return '인증 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
