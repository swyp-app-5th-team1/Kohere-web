/*
 * 입주 조건 · 방 옵션 · 설문의 화면 라벨 ↔ 서버 코드.
 *
 * 라벨은 **시안 표기**를 쓴다. 스키마 정의서 v2.0 의 `label.ko` 와 다른 곳이 있는데,
 * 그건 서버가 조회 응답에 실어 주는 값이라 임대인 입력 화면과 꼭 같을 필요가 없다.
 * 앱이나 웹 조회에서 표기가 어긋나 보이면 그때 어느 쪽을 고칠지 정하면 된다.
 *
 *   ANY               성별 무관              (정의서: 성별 제한 없음)
 *   GENDER_SEPARATED  남녀 구역 분리         (정의서: 남녀 분리)
 *   REQUIRED          필수                  (정의서: 외국인 등록증 필수)
 *   NOT_REQUIRED      여권으로 대체 가능      (정의서: 외국인 등록증 불필요)
 *   PRIVATE_BATH      개인 화장실/개인 욕실   (정의서: 개인 욕실)
 *   ENGLISH_OK        영어 소통 가능         (정의서: 영어 안내 가능)
 *
 * 설문 두 항목(선호 국적 · 계약 어려움)은 정의서에 라벨 자체가 없다. 세입자에게 안 보이는
 * 값이라 카탈로그에 담기지 않는다.
 */

export type CatalogItem = { code: string; label: string }

export const GENDER_POLICIES: CatalogItem[] = [
  { code: 'ANY', label: '성별 무관' },
  { code: 'MALE_ONLY', label: '남성 전용' },
  { code: 'FEMALE_ONLY', label: '여성 전용' },
  { code: 'GENDER_SEPARATED', label: '남녀 구역 분리' },
]

export const SUPPORTED_LANGUAGES: CatalogItem[] = [
  { code: 'ENGLISH', label: '영어' },
  { code: 'CHINESE', label: '중국어' },
  { code: 'JAPANESE', label: '일본어' },
]

export const ARC_REQUIREMENTS: CatalogItem[] = [
  { code: 'REQUIRED', label: '필수' },
  { code: 'NOT_REQUIRED', label: '여권으로 대체 가능' },
]

/** 방 타입 옵션 (`roomOffers[].filterTags`). 세입자 화면의 필터와 같은 값이다. */
export const ROOM_FILTER_TAGS: CatalogItem[] = [
  { code: 'ADDRESS_REGISTRATION', label: '전입신고 가능' },
  { code: 'PRIVATE_BATH', label: '개인 화장실/개인 욕실' },
  { code: 'DOUBLE_ROOM', label: '2인실' },
  { code: 'MEALS_INCLUDED', label: '식사 제공' },
  { code: 'MOVE_IN_NOW', label: '즉시 입주' },
  { code: 'ENGLISH_OK', label: '영어 소통 가능' },
  { code: 'FEMALE_ONLY', label: '여성 전용' },
  { code: 'NO_MAINT_FEE', label: '관리비 없음' },
]

/** 설문 — 선호하는 입주자 국적. 보내지 않으면 빈 배열로 저장되고 세입자에게 안 보인다. */
export const PREFERRED_NATIONALITIES: CatalogItem[] = [
  { code: 'JAPAN', label: '일본' },
  { code: 'USA', label: '미국' },
  { code: 'CHINA', label: '중국' },
  { code: 'SOUTHEAST_ASIA', label: '동남아' },
  { code: 'EUROPE', label: '유럽' },
]

/** 설문 — 계약 과정에서 겪은 어려움. 괄호 안 낱말이 그대로 코드 이름이다. */
export const CONTRACT_DIFFICULTIES: CatalogItem[] = [
  { code: 'LANGUAGE', label: '의사소통 문제(언어)' },
  { code: 'CULTURE', label: '외국인 생활 관련 문제(문화)' },
  { code: 'IDENTITY', label: '낯선 외국인에 대한 두려움(신원)' },
  { code: 'PAYMENT', label: '대금 지급, 환율(결제)' },
  { code: 'CONTRACT_FULFILLMENT', label: '손해배상, 위약금 관련(계약 이행)' },
  { code: 'COMMUNICATION_CHANNEL', label: '외국인과의 소통 채널 부족(대화나 공지 전달의 어려움)' },
]
