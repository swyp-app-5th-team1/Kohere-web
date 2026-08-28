import type { SpaceType } from './spaceTypes'

/**
 * 매물 등록 임시 저장.
 *
 * 원래는 서버가 임시 저장본을 들고 있는 그림이었지만, 서버 작업이 늘어나서 일단 브라우저에
 * 둔다. 저장 시점은 각 단계에서 "다음" 을 누르는 순간이다 (입력할 때마다 쓰지 않는다).
 *
 * 사진은 고르는 즉시 서버로 올리고 그때 받은 key · url 만 담는다. 둘 다 문자열이라
 * JSON 으로 저장되고, 그래서 새로고침해도 사진이 살아남는다. 올리는 중이거나 실패한
 * 사진은 File 이 있어야 다시 시도할 수 있는데 File 은 담기지 않아 제외한다.
 */

const DRAFT_KEY = 'kohere.listingDraft'

/**
 * 임대인이 고른 인근 역.
 *
 * 등록 요청의 `nearestTransit` 에 그대로 실린다 — 이름은 서버가 준 표준 표기라
 * 화면에서 순서를 바꾸거나 다듬으면 안 된다(`신촌역 2호선`).
 */
export type NearestTransitDraft = {
  name: string
  walkMinutes: number
}

export type BranchDraft = {
  name: string
  /** 우편번호 5자리. 다음 우편번호가 함께 주는 값이라 버리지 않고 담아 둔다. */
  postalCode: string
  /**
   * 표준 도로명 주소. 다음 우편번호가 준 문자열이 아니라 **주소 검색 API 가 준 값**이다.
   * 아래 좌표와 짝이 맞아야 해서 그렇다.
   */
  address: string
  addressDetail: string
  /**
   * 주소의 좌표. 사용자가 입력하는 값이 아니라 주소를 고르면 따라온다.
   *
   * 메모리에만 두면 새로고침 때 주소는 남고 좌표만 사라져서, 다 채워진 것처럼 보이는데
   * 제출이 실패한다. 그래서 임시 저장에 함께 담는다.
   */
  lat: number | null
  lng: number | null
  nearestTransit: NearestTransitDraft | null
  description: string
}

export type BuildingDraft = {
  /** 서버 코드(`VILLA` 등)를 담는다. 화면 라벨은 buildingTypes.ts 가 짝지어 준다. */
  buildingType: string
  totalFloors: string
  operatingFloors: string
  hasParking: boolean | null
  hasElevator: boolean | null
}

export type ConditionsDraft = {
  genderRule: string
  languages: string[]
  arcRule: string
  ageRange: string
  houseRule: string
  refundPolicy: string
}

export type RoomTypeDraft = {
  /** 사진처럼 임시 저장 밖에 두는 값을 방 타입에 이어 붙이기 위한 열쇠. */
  id: string
  name: string
  deposit: string
  maintenanceFee: string
  monthlyRent: string
  minPeriod: string
  maxPeriod: string
  options: string[]
}

export type SurveyDraft = {
  nationalities: string[]
  difficulties: string[]
  message: string
}

export type ContactDraft = {
  managerName: string
  phone: string
  businessNumber: string
}

export type ListingDraft = {
  /** 마지막으로 넘어간 단계. 다시 들어오면 여기서 이어서 쓴다. */
  step: number
  spaceType: SpaceType | null
  branch: BranchDraft
  building: BuildingDraft
  conditions: ConditionsDraft
  /** 편의 시설은 "그룹키:코드" 형태로 담는다. */
  amenities: string[]
  roomTypes: RoomTypeDraft[]
  survey: SurveyDraft
  contact: ContactDraft
  /** 지점 대표사진. 첫 장이 대표라 순서가 그대로 등록 요청에 실린다. */
  branchPhotos: StoredPhoto[]
  /** 방 타입 id 별 객실 사진. */
  roomPhotos: Record<string, StoredPhoto[]>
}

/**
 * 임시 저장에 담는 사진.
 *
 * 업로드를 마친 것만 담는다 — 올리는 중이거나 실패한 사진은 `File` 이 있어야 다시 시도할
 * 수 있는데 File 은 JSON 으로 담기지 않는다. 서버에 올라간 사진은 7일간 살아 있어서,
 * 새로고침해도 key 만 들고 있으면 그대로 쓸 수 있다.
 */
export type StoredPhoto = {
  id: string
  /** 서버가 준 미리보기 주소. 등록이 끝나면 무효가 되지만 폼을 쓰는 동안은 유효하다. */
  url: string
  key: string
}

export function createRoomType(): RoomTypeDraft {
  return {
    // 순번을 쓰면 새로고침 때 0 부터 다시 세는 바람에 저장돼 있던 방 타입과 id 가 겹친다.
    id: crypto.randomUUID(),
    name: '',
    deposit: '',
    maintenanceFee: '',
    monthlyRent: '',
    minPeriod: '',
    maxPeriod: '',
    options: [],
  }
}

/** 매번 새 객체를 만든다. 상수로 두면 방 타입 배열 같은 참조를 여러 곳이 함께 쓰게 된다. */
export function emptyDraft(): ListingDraft {
  return {
    step: 0,
    spaceType: null,
    branch: {
      name: '',
      postalCode: '',
      address: '',
      addressDetail: '',
      lat: null,
      lng: null,
      nearestTransit: null,
      description: '',
    },
    building: {
      buildingType: '',
      totalFloors: '',
      operatingFloors: '',
      hasParking: null,
      hasElevator: null,
    },
    conditions: {
      genderRule: '',
      languages: [],
      arcRule: '',
      ageRange: '',
      houseRule: '',
      refundPolicy: '',
    },
    amenities: [],
    roomTypes: [createRoomType()],
    survey: { nationalities: [], difficulties: [], message: '' },
    contact: {
      managerName: '',
      phone: '',
      businessNumber: '',
    },
    branchPhotos: [],
    roomPhotos: {},
  }
}

export function loadDraft(): ListingDraft {
  const empty = emptyDraft()

  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return empty

    // 저장해 둔 모양이 바뀌었어도 화면이 깨지지 않도록 빈 값 위에 덮어쓴다.
    const saved = JSON.parse(raw) as Partial<ListingDraft>
    const roomTypes = saved.roomTypes?.length ? saved.roomTypes : empty.roomTypes

    return {
      step: saved.step ?? 0,
      spaceType: saved.spaceType ?? null,
      branch: { ...empty.branch, ...saved.branch },
      building: { ...empty.building, ...saved.building },
      conditions: { ...empty.conditions, ...saved.conditions },
      amenities: saved.amenities ?? [],
      roomTypes,
      survey: { ...empty.survey, ...saved.survey },
      contact: { ...empty.contact, ...saved.contact },
      branchPhotos: saved.branchPhotos ?? [],
      roomPhotos: saved.roomPhotos ?? {},
    }
  } catch {
    // 값이 깨졌거나 localStorage 를 못 쓰는 환경이면 빈 상태로 시작한다.
    return empty
  }
}

export function saveDraft(draft: ListingDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // 용량 초과나 시크릿 모드처럼 못 쓰는 경우가 있어도 입력을 막지는 않는다.
  }
}

/** 등록을 마쳤거나 처음부터 다시 쓸 때 부른다. */
export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}
