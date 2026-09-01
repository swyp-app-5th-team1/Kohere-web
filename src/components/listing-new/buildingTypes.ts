/*
 * 건물 형태의 화면 라벨 ↔ 서버 코드.
 *
 * 서버는 코드표에 있는 값만 받는다 — 없는 코드를 보내면 400 LISTING_UNKNOWN_CATALOG_CODE 다.
 * 한글 라벨을 그대로 담아 보내면 전부 거절되므로 여기서 짝을 지어 둔다.
 *
 * 시안(224:*)에는 여섯 가지만 있었는데 서버 enum 에는 APARTMENT 가 하나 더 있었다.
 * 기획 확인 결과 아파트도 들어가는 게 맞아서 마지막에 붙였다 — 앞 여섯의 순서는 시안 그대로다.
 */

/** 등록 요청의 `building.type` 에 그대로 실린다. */
export type BuildingTypeCode =
  | 'COMMERCIAL_BUILDING'
  | 'STANDALONE_BUILDING'
  | 'VILLA'
  | 'MIXED_USE'
  | 'DETACHED_HOUSE'
  | 'OFFICETEL'
  | 'APARTMENT'

export const BUILDING_TYPES: { code: BuildingTypeCode; label: string }[] = [
  { code: 'COMMERCIAL_BUILDING', label: '상가건물' },
  { code: 'STANDALONE_BUILDING', label: '단독건물' },
  { code: 'VILLA', label: '빌라/연립' },
  { code: 'MIXED_USE', label: '주상복합' },
  { code: 'DETACHED_HOUSE', label: '단독주택' },
  { code: 'OFFICETEL', label: '오피스텔' },
  { code: 'APARTMENT', label: '아파트' },
]
