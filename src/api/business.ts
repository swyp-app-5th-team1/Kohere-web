import { ApiError, api } from './client'

/**
 * 사업자등록번호 검증. 외부 registry 를 거치므로 다른 호출보다 느리고 실패할 수 있다.
 *
 * 인증이 필요하다 — 온보딩까지 마친(ACTIVE) 임대인 토큰으로만 부를 수 있어서
 * client.ts 의 NO_AUTH_PATHS 에 넣지 않는다. 401 TOKEN_EXPIRED 는 공통 재발급 로직이
 * 알아서 재시도하므로 화면에서 따로 다룰 필요가 없다.
 *
 * 임대인 온보딩(`/api/v1/auth/landlord/onboarding`)에는 포함되지 않는다.
 * 온보딩을 마친 임대인이 매물 등록 시점에 따로 부르는 별개 호출이다.
 */
const VERIFY_PATH = '/api/v1/auth/business/verify'

export type BusinessVerifyResult = {
  /** 앞자리를 가린 번호(`****567890`). 화면에는 보낸 값 대신 이 값을 보여준다. */
  businessRegistrationNumber: string
  verified: boolean
}

/**
 * 사업자등록번호가 실제로 등록된 것인지 확인한다.
 *
 * **결과를 서버가 보관하지 않는다.** 응답 본문으로만 돌아오므로 확인이 필요한 시점마다
 * 다시 불러야 한다. 화면에서 "아까 통과했으니 됐다" 로 기억해 두면 서버와 어긋난다.
 *
 * 화면 표기는 123-45-67890 이지만 서버는 숫자만 받으므로 여기서 하이픈을 벗긴다.
 */
export function verifyBusinessNumber(value: string): Promise<BusinessVerifyResult> {
  return api.post<BusinessVerifyResult>(VERIFY_PATH, {
    businessRegistrationNumber: value.replace(/\D/g, ''),
  })
}

/** 10자리를 다 채웠는지. 버튼을 언제 열어 줄지 정하는 데 쓴다. */
export function isBusinessNumberComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 10
}

/** 검증 실패를 화면 문구로 바꾼다. 분기는 error.code 로 한다. */
export function businessVerifyErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '사업자등록번호 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '사업자등록번호 10자리를 정확히 입력해 주세요.'

    // 외부 조회 결과 미등록 · 휴폐업 · 진위 실패. 번호 자체가 잘못된 경우다.
    case 'AUTH_BUSINESS_NUMBER_VERIFICATION_FAILED':
      return '등록되지 않았거나 휴·폐업 상태인 번호입니다.'

    // 우리 잘못도 사용자 잘못도 아니다. 번호를 고치라고 하면 안 되고 다시 시도하게 안내한다.
    case 'UPSTREAM_ERROR':
      return '확인 기관 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'

    case 'AUTH_ONBOARDING_REQUIRED':
      return '임대인 등록을 먼저 완료해 주세요.'

    case 'FORBIDDEN':
      return '임대인 계정에서만 사용할 수 있습니다.'

    default:
      return '사업자등록번호 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
