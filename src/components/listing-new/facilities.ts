/*
 * 편의 시설 8종의 화면 라벨 ↔ 서버 코드.
 *
 * 서버는 코드표에 있는 값만 받는다 — 없는 코드를 보내면 400 LISTING_UNKNOWN_CATALOG_CODE 다.
 * 그래서 화면에 그리는 항목과 보낼 코드를 한 곳에 붙여 둔다.
 *
 * ── 시안과 다른 곳 ──
 * 시안(224:*)의 생활 · 안전 · 제공 비품 세 그룹에 주방 시설 목록의 꼬리가 붙어 있었다.
 *
 *   주방 시설  … 전기포트 · 전기밥솥 · 토스트기 · 커피머신 · 정수기
 *   제공 비품        전기밥솥 · 토스트기 · 커피머신 · 정수기   (뒤 4개)
 *   안전 시설                  토스트기 · 커피머신 · 정수기   (뒤 3개)
 *   생활 시설                                       정수기   (뒤 1개)
 *
 * 꼬리에서 4 · 3 · 1개씩 잘라 붙은 모양이라 시안의 복제 잔여물로 보고 뺐다. 안전 시설의
 * 토스트기처럼 뜻이 안 맞는 것도 있고, 넣더라도 주방 시설과 중복이라 임대인이 어디서
 * 골라야 할지 알 수 없다.
 *
 * 반대로 서버에만 있던 SLIPPERS 는 넣었다 — 침구류 · 수건과 성격이 같고, 시안이 제공 비품
 * 목록을 주방 목록으로 덮으면서 밀려난 것으로 보인다. 라벨은 「실내화」다. 시안에는
 * 「슬리퍼」로 들어갔지만 구글 폼 · tally 가 쓰는 말이 실내화라 그쪽에 맞췄다.
 *
 * 이렇게 하면 8개 그룹이 전부 1:1 로 맞는다. 디자인팀 확인이 되면 이 주석을 지운다.
 *
 * 라벨은 **시안 표기**를 쓴다. 스키마 정의서 v2.0 의 `label.ko` 와 몇 군데 다른데
 * (중앙난방 · 와이파이 · 공용 에어컨 · 공용 PC), 그건 서버가 조회 응답에 실어 주는 값이라
 * 임대인 입력 화면과 꼭 같을 필요가 없다. 앱이나 웹 조회에서 표기가 어긋나 보이면 그때
 * 어느 쪽을 고칠지 정하면 된다.
 *
 * 실내화만 예외다 — 시안은 「슬리퍼」인데 구글 폼 · tally 가 쓰는 말이라 PM 확인을 받았다.
 */

/** 등록 요청에서의 자리. nearbyFacilities 만 facilities 바깥에 있다. */
export type FacilityGroupKey =
  | 'heatingSystem'
  | 'laundry'
  | 'kitchen'
  | 'livingAmenities'
  | 'securityFeatures'
  | 'commonSpaces'
  | 'providedSupplies'
  | 'nearbyFacilities'

/** 「해당 없음」. 이 코드는 혼자만 보내야 하고 다른 코드와 섞으면 400 이다. */
export const FACILITY_NONE = 'NONE'

export type FacilityGroup = {
  key: FacilityGroupKey
  label: string
  /** NONE 은 여기 넣지 않는다. 화면에서 맨 앞에 따로 그린다. */
  items: { code: string; label: string }[]
}

export const FACILITY_GROUPS: FacilityGroup[] = [
  {
    key: 'heatingSystem',
    label: '난방 시설',
    items: [
      { code: 'CENTRAL', label: '중앙 난방' },
      { code: 'INDIVIDUAL', label: '개별 난방' },
    ],
  },
  {
    key: 'laundry',
    label: '세탁 시설',
    items: [
      { code: 'WASHER', label: '세탁기' },
      { code: 'DRYER', label: '건조기' },
      { code: 'DRYING_RACK', label: '건조대' },
      { code: 'IRON', label: '다리미' },
    ],
  },
  {
    key: 'kitchen',
    label: '주방 시설',
    items: [
      { code: 'SHARED_REFRIGERATOR', label: '공용 냉장고' },
      { code: 'INDUCTION', label: '인덕션' },
      { code: 'GAS_STOVE', label: '가스레인지' },
      { code: 'MICROWAVE', label: '전자레인지' },
      { code: 'ELECTRIC_KETTLE', label: '전기포트' },
      { code: 'RICE_COOKER', label: '전기밥솥' },
      { code: 'TOASTER', label: '토스트기' },
      { code: 'COFFEE_MACHINE', label: '커피머신' },
      { code: 'WATER_PURIFIER', label: '정수기' },
    ],
  },
  {
    key: 'livingAmenities',
    label: '생활 시설',
    items: [
      { code: 'WIFI', label: 'WIFI' },
      { code: 'TV', label: 'TV' },
      { code: 'SOFA', label: '소파' },
      { code: 'AIR_CONDITIONER', label: '공용에어컨' },
      { code: 'GYM_EQUIPMENT', label: '운동기구' },
      { code: 'PROJECTOR', label: '프로젝터' },
      { code: 'AIR_PURIFIER', label: '공기청정기' },
      { code: 'SHARED_PC', label: '공용PC' },
    ],
  },
  {
    key: 'securityFeatures',
    label: '안전 시설',
    items: [
      { code: 'CCTV', label: 'CCTV' },
      { code: 'ENTRANCE_DOOR_LOCK', label: '공동현관 도어락' },
      { code: 'DOOR_LOCK', label: '방별 도어락' },
      { code: 'FIRE_EXTINGUISHER', label: '소화기' },
      { code: 'FIRE_ALARM', label: '화재경보기' },
      { code: 'SECURITY_GUARD', label: '경비원' },
    ],
  },
  {
    key: 'commonSpaces',
    label: '공용 공간',
    items: [
      { code: 'SHARED_KITCHEN', label: '공용 주방' },
      { code: 'SHARED_TOILET', label: '공용 화장실' },
      { code: 'SHARED_BATH', label: '공용 샤워실' },
      { code: 'LOUNGE', label: '라운지' },
      { code: 'STUDY_ROOM', label: '스터디룸' },
      { code: 'MEETING_ROOM', label: '회의실' },
      { code: 'ROOFTOP', label: '옥상' },
    ],
  },
  {
    key: 'providedSupplies',
    label: '제공 비품',
    items: [
      { code: 'BEDDING', label: '침구류' },
      { code: 'LAUNDRY_DETERGENT', label: '세탁세제' },
      { code: 'SEASONING', label: '조미료' },
      { code: 'TISSUE', label: '휴지' },
      { code: 'TOWEL', label: '수건' },
      // 시안은 맨 뒤에 둔다. 서버 enum 순서(조미료 다음)와 다르지만 화면 순서일 뿐이다.
      { code: 'SLIPPERS', label: '실내화' },
    ],
  },
  {
    key: 'nearbyFacilities',
    label: '주변 편의 시설',
    items: [
      { code: 'CONVENIENCE_STORE', label: '편의점' },
      { code: 'PARK', label: '공원' },
      { code: 'MART', label: '마트/슈퍼마켓' },
      { code: 'LAUNDROMAT', label: '세탁소' },
      { code: 'HOSPITAL_PHARMACY', label: '병원/약국' },
    ],
  },
]

/**
 * 임시 저장에 담는 열쇠.
 *
 * 같은 코드가 여러 그룹에 나오지는 않지만, 그룹까지 붙여 두면 제출할 때 그룹별로 갈라
 * 담기가 쉽다.
 */
export const facilityKey = (group: FacilityGroupKey, code: string) => `${group}:${code}`

/** 한 그룹에서 고른 코드만 뽑는다. 아무것도 없으면 빈 배열이다. */
export function selectedCodes(selected: string[], group: FacilityGroupKey): string[] {
  const prefix = `${group}:`
  return selected.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length))
}
