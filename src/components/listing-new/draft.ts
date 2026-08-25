import type { SpaceType } from './spaceTypes'

/**
 * 매물 등록 임시 저장.
 *
 * 원래는 서버가 임시 저장본을 들고 있는 그림이었지만, 서버 작업이 늘어나서 일단 브라우저에
 * 둔다. 저장 시점은 각 단계에서 "다음" 을 누르는 순간이다 (입력할 때마다 쓰지 않는다).
 *
 * 사진은 File 객체라 JSON 으로 담을 수 없어 여기 넣지 않는다. 새로고침하면 사진만 사라진다.
 * 사진까지 살리려면 업로드 API 가 생긴 뒤 서버 URL 을 받아서 담아야 한다.
 */

const DRAFT_KEY = 'kohere.listingDraft'

export type BranchDraft = {
  name: string
  /** 우편번호 5자리. 주소 검색이 함께 주는 값이라 버리지 않고 담아 둔다. */
  postalCode: string
  address: string
  addressDetail: string
  nearbyStation: string
  description: string
}

export type BuildingDraft = {
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
  agreedPrivacy: boolean
  agreedExposure: boolean
}

export type ListingDraft = {
  /** 마지막으로 넘어간 단계. 다시 들어오면 여기서 이어서 쓴다. */
  step: number
  spaceType: SpaceType | null
  branch: BranchDraft
  building: BuildingDraft
  conditions: ConditionsDraft
  /** 편의 시설은 "그룹명/순번/항목" 형태의 키로 담는다. */
  amenities: string[]
  roomTypes: RoomTypeDraft[]
  survey: SurveyDraft
  contact: ContactDraft
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
      nearbyStation: '',
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
      agreedPrivacy: false,
      agreedExposure: false,
    },
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
