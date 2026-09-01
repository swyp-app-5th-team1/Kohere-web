import { ApiError, api } from './client'
import { saveUserName } from './tokens'

/**
 * 내 프로필. 앱과 같은 엔드포인트를 쓴다 — iOS 의 UserProfileResponseDTO 와 같은 응답이다.
 *
 * 응답에는 필드가 훨씬 많지만(생년월일 · 국적 · 비자 등 앱 온보딩 값) 웹이 쓰는 것만 적는다.
 * 필요해지면 iOS DTO 를 보고 여기에 추가한다.
 */
const ME_PATH = '/api/v1/users/me'

export type MyProfile = {
  id: number
  userType: 'TENANT' | 'LANDLORD' | 'ADMIN'
  /** 아직 이름을 정하지 않은 계정은 null 이다. */
  name: string | null
  email: string | null
  phoneNumber: string | null
  status: string
}

/** 같은 화면에서 헤더와 본문이 동시에 조회해도 `/users/me`는 한 번만 보낸다. */
let profileInFlight: Promise<MyProfile> | null = null

/**
 * 내 프로필을 받아 오고, 인사말에 쓰는 이름 캐시도 갱신한다.
 *
 * 로그인 응답의 name 을 캐시해 두지만 그건 로그인한 그 순간의 값이다 — 이름이 바뀌었거나
 * 이 기능이 생기기 전에 로그인해 둔 세션은 캐시가 비거나 낡아 있어서, 화면이 뜰 때 여기로
 * 한 번 맞춘다.
 */
export function fetchMyProfile(): Promise<MyProfile> {
  if (!profileInFlight) {
    profileInFlight = api
      .get<MyProfile>(ME_PATH)
      .then((me) => {
        saveUserName(me.name)
        return me
      })
      .finally(() => {
        profileInFlight = null
      })
  }

  return profileInFlight
}

/** SMS 인증을 마친 새 연락처만 반영된다. 서버에는 숫자만 보낸다. */
export async function updateMyPhoneNumber(phone: string): Promise<MyProfile> {
  const me = await api.patch<MyProfile>(ME_PATH, {
    phoneNumber: phone.replace(/\D/g, ''),
  })
  saveUserName(me.name)
  return me
}

export function updateMyPhoneErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '휴대폰 번호를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '휴대폰 번호를 정확히 입력해 주세요.'
    case 'AUTH_PHONE_NOT_VERIFIED':
      return '휴대폰 인증이 만료되었습니다. 인증번호를 다시 받아 주세요.'
    default:
      return '휴대폰 번호를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
