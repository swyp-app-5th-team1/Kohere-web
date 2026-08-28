import { ApiError, api } from './client'

/*
 * 매물 등록 폼을 채우는 조회 API 둘.
 *
 * 둘 다 성격이 같다 — 검색해서 후보를 받고, 사용자가 고른 **한 건을 가공 없이 그대로**
 * 등록 요청에 싣는다. 서버는 이 검색을 호출했는지 확인하지 않으므로, 우리가 값을 다듬거나
 * 지어내면 그대로 매물 데이터가 된다.
 *
 * 공개 조회인 다른 /listings/* 와 달리 인증이 필요하다 (임대인 · 온보딩 완료).
 */
const ADDRESS_SEARCH_PATH = '/api/v1/listings/addresses'
const STATION_SEARCH_PATH = '/api/v1/listings/stations'
const STATION_NEARBY_PATH = '/api/v1/listings/stations/nearby'

export type AddressCandidate = {
  /**
   * 표준 도로명 주소. 등록 요청의 `address.fullAddress` 에 그대로 실린다.
   *
   * 건물명이 붙어 올 수 있는데 서버가 다듬지 않는다 — 보이는 그대로 보내면 된다.
   * 다음 우편번호가 준 문자열이 아니라 **이 값**을 보내야 아래 좌표와 짝이 맞는다.
   */
  roadAddress: string
  jibunAddress: string
  /** 외국인 대상 서비스라 나중에 쓸 값. 등록 요청에는 자리가 없다. */
  englishAddress: string
  lat: number
  lng: number
}

export type StationCandidate = {
  /** 노선까지 붙은 표준 이름(`신촌역 2호선`). 환승역은 노선별로 따로 온다. */
  name: string
  roadAddress: string
  jibunAddress: string
  lat: number
  lng: number
  /** 좌표를 함께 보냈을 때만 채워진다. */
  distanceMeters: number | null
  /** 직선거리 기준 하한이라 실제 보행 시간은 더 걸린다. 좌표 없이 부르면 null. */
  suggestedWalkMinutes: number | null
}

type Items<T> = { items: T[] }

/**
 * 도로명 주소를 검색해 표준 주소와 좌표를 받는다.
 *
 * **도로명 + 건물번호까지 넣어야 결과가 나온다.** `신촌` 처럼 일부만 보내면 후보가 비고
 * `신촌로 12` 면 나온다. 그래서 0건은 대개 「없는 주소」가 아니라 「덜 적은 검색어」다.
 *
 * 외부 호출 조건(건수 · 페이지 · 언어)은 서버가 고정하므로 keyword 만 보낸다.
 * 도로명이 없는 결과는 서버가 제외하고 준다.
 */
export function searchAddresses(keyword: string): Promise<Items<AddressCandidate>> {
  const query = new URLSearchParams({ keyword })
  return api.get<Items<AddressCandidate>>(`${ADDRESS_SEARCH_PATH}?${query}`)
}

/**
 * 역 이름으로 검색한다. 좌표를 함께 보내면 거리순으로 정렬되고 거리 · 도보시간이 채워진다.
 *
 * 좌표는 선택이지만 우리는 항상 보낸다. 주소를 먼저 고르므로 좌표가 이미 손에 있고,
 * 전국에 같은 이름이 있는 역(`시청역`)을 거리로 가려낼 수 있기 때문이다.
 * lat · lng 는 **둘 다 있거나 둘 다 없어야** 한다. 하나만 보내면 400 이다.
 */
export function searchStations(
  keyword: string,
  lat: number,
  lng: number,
): Promise<Items<StationCandidate>> {
  const query = new URLSearchParams({ keyword, lat: String(lat), lng: String(lng) })
  return api.get<Items<StationCandidate>>(`${STATION_SEARCH_PATH}?${query}`)
}

/**
 * 좌표 주변의 역을 거리순으로 받는다. 검색어가 필요 없다.
 *
 * 결과가 비면 「역이 없다」기보다 조회 반경 밖일 가능성이 크다. 그때는 이름 검색
 * (searchStations)으로 넘겨서 임대인이 직접 찾게 한다.
 */
export function searchNearbyStations(
  lat: number,
  lng: number,
): Promise<Items<StationCandidate>> {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng) })
  return api.get<Items<StationCandidate>>(`${STATION_NEARBY_PATH}?${query}`)
}

/*
 * 내 매물 목록. `/api/v2/listings/mine` 이 아닌 이유는 공개 검색 매처
 * (`GET /api/v2/listings/*` permitAll)에 먼저 잡혀 비로그인에 열리기 때문이다.
 */
const MY_LISTINGS_PATH = '/api/v2/users/me/listings'

/** 카드 상태 배지. 서버가 번역 없이 코드 문자열 그대로 주므로 한글은 화면이 붙인다. */
export type MyListingStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'UPDATE_PENDING'

export type MyListingEntry = {
  /** 세입자 목록 카드와 같은 구조. 카드에 쓰는 값만 추려 담았다. */
  listing: {
    listingId: string
    title: string
    type: { code: string; label: string }
    status: MyListingStatus
    /** 첫 값이 대표 이미지다. */
    imageUrls: string[]
  }
  /** 반려된 매물에만 있고, 그 외에는 null 이 아니라 필드 자체가 생략된다. */
  rejectionReason?: string
}

export type MyListingsResult = {
  content: MyListingEntry[]
  page: {
    number: number
    size: number
    totalPages: number
    /** 상태 필터와 무관한 내 매물 총 개수. 「N건을 관리 중입니다」에 그대로 쓴다. */
    totalElements: number
    hasNext: boolean
  }
}

/**
 * 내 매물을 전부 받는다. 정렬은 최근 수정순(updatedAt 내림차순) 고정이다.
 *
 * 페이지 UI 가 시안에 없어서 최대 크기(100)로 한 번에 받는다. 임대인이 100건을 넘는 일은
 * 사실상 없고, 넘으면 hasNext 로 알 수 있으니 그때 안내 문구만 붙인다.
 */
export function fetchMyListings(): Promise<MyListingsResult> {
  return api.get<MyListingsResult>(`${MY_LISTINGS_PATH}?size=100`)
}

/** 목록 조회 실패 문구. */
export function myListingsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '매물 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'FORBIDDEN':
    case 'AUTH_ONBOARDING_REQUIRED':
      return '임대인 계정으로 로그인해야 매물을 볼 수 있습니다.'

    default:
      return '매물 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

const CREATE_PATH = '/api/v2/listings'

/**
 * 등록 응답에서 화면이 쓰는 값만 추린다.
 *
 * 접수 번호라는 필드는 없다 — `listingId` 가 그 자리를 대신한다. `status` 는 등록 직후
 * 늘 `PENDING` 이고, 승인 심사를 거쳐야 세입자에게 보인다.
 */
export type CreatedListing = {
  listingId: string
  status: string
}

/** 매물을 등록한다. 사진은 미리 올려 둔 key 로 실려 간다. */
export function createListing(payload: unknown): Promise<CreatedListing> {
  return api.post<CreatedListing>(CREATE_PATH, payload)
}

/** 등록 실패 문구. 분기는 error.code 로 한다. */
export function createErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    /*
     * 화면에서 이미 거른 것들이라 여기까지 오면 우리 매핑이 서버와 어긋났다는 뜻이다.
     * 어느 필드인지 서버가 알려주므로 그대로 보여 준다 — 임대인이 고칠 수 있는 값일 수 있다.
     */
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '입력한 내용을 다시 확인해 주세요.'

    // 사진 key 가 7일을 넘겨 사라졌다. 사진부터 다시 올려야 한다.
    case 'LISTING_IMAGE_NOT_FOUND':
      return '올린 사진이 만료되었습니다. 사진을 다시 올려 주세요.'

    case 'LISTING_UNKNOWN_CATALOG_CODE':
      return '선택한 항목 중 서버가 모르는 값이 있습니다. 잠시 후 다시 시도해 주세요.'

    case 'FORBIDDEN':
    case 'AUTH_ONBOARDING_REQUIRED':
      return '임대인 계정으로 온보딩을 마쳐야 매물을 등록할 수 있습니다.'

    case 'UPSTREAM_ERROR':
      return '등록 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.'

    default:
      return '등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

/** 두 검색이 공유하는 실패 문구. 어느 쪽이 비었는지는 호출부가 판단한다. */
export function searchErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '검색어를 다시 확인해 주세요.'

    // 임대인이 아니거나 온보딩을 마치지 않은 계정이다. 매물 등록 자체를 할 수 없다.
    case 'FORBIDDEN':
    case 'AUTH_ONBOARDING_REQUIRED':
      return '임대인 계정으로 온보딩을 마쳐야 매물을 등록할 수 있습니다.'

    // 서버가 대신 부르는 외부 지오코딩 · 지도 서비스 쪽 문제다. 잠시 뒤면 풀린다.
    case 'UPSTREAM_ERROR':
      return '검색 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.'

    default:
      return '검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
