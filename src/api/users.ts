import { api } from './client'
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
  userType: string
  /** 아직 이름을 정하지 않은 계정은 null 이다. */
  name: string | null
  email: string | null
  status: string
}

/**
 * 내 프로필을 받아 오고, 인사말에 쓰는 이름 캐시도 갱신한다.
 *
 * 로그인 응답의 name 을 캐시해 두지만 그건 로그인한 그 순간의 값이다 — 이름이 바뀌었거나
 * 이 기능이 생기기 전에 로그인해 둔 세션은 캐시가 비거나 낡아 있어서, 화면이 뜰 때 여기로
 * 한 번 맞춘다.
 */
export async function fetchMyProfile(): Promise<MyProfile> {
  const me = await api.get<MyProfile>(ME_PATH)
  saveUserName(me.name)
  return me
}
