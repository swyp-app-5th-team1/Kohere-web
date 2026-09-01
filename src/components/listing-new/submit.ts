import type { Photo } from '../form/PhotoPicker'
import { phoneToServer } from '../form/formatters'
import { parseMoney, parseMonths } from './amounts'
import { FACILITY_GROUPS, selectedCodes } from './facilities'
import { parseCount, parseSpan } from './ranges'
import type { ListingDraft } from './draft'

/*
 * 임시 저장 draft 를 `POST /api/v2/listings` 요청 본문으로 옮긴다.
 *
 * 화면은 임대인이 적기 편한 모양으로 들고 있고(「8층」·「350000」·「010-1234-5678」),
 * 서버는 제 모양을 받는다. 그 변환이 전부 여기 모여 있다 — 화면 곳곳에 흩어 두면
 * 어디서 무엇이 바뀌는지 따라가기 어렵다.
 *
 * 하나라도 못 읽으면 null 이다. 각 단계에서 이미 막고 있지만, 임시 저장을 되살렸거나
 * 화면을 건너뛰어 들어온 경우가 있어 여기서 한 번 더 본다.
 */

/** 지하철 말고는 받는 값이 없다. 버스를 받게 되면 화면에 고르는 자리가 생겨야 한다. */
const TRANSIT_TYPE = 'SUBWAY'

export type ListingRequest = {
  title: string
  type: string
  contact: { managerName: string; phone: string }
  businessRegistrationNumber: string
  address: { fullAddress: string; detail: string | null; lat: number; lng: number }
  building: {
    type: string
    totalFloors: number
    usedFloorRange: string
    parkingAvailable: boolean
    elevatorAvailable: boolean
  }
  genderPolicy: string
  languagesSupported: string[]
  ageRange: string
  arcRequired: string
  facilities: Record<string, string[]>
  nearbyFacilities: string[]
  nearestTransit: { type: string; name: string; walkMinutes: number }
  description: string
  extraNotes: string
  refundPolicy: string
  imageKeys: string[]
  roomOffers: {
    name: string
    contract: { minStayMonths: number; maxStayMonths: number }
    pricing: { monthlyRent: number; deposit: number; maintenanceFee: number }
    filterTags: string[]
    roomImageKeys: string[]
  }[]
  preferredNationalities: string[]
  contractDifficulties: string[]
  serviceFeedback: string | null
  consents: { privacyPolicyAgreed: boolean; listingExposureAgreed: boolean }
}

/** 올리기를 마친 사진의 key 만 순서대로. 첫 값이 대표 이미지다. */
const keysOf = (photos: Photo[]) =>
  photos.map((photo) => photo.key).filter((key): key is string => key !== null)

/**
 * 편의 시설을 그룹별 배열로 되돌린다.
 *
 * 화면은 「그룹키:코드」 한 줄로 들고 있어서(`heatingSystem:CENTRAL`) 칩 하나를 켜고 끄기가
 * 쉽다. 서버는 그룹마다 배열을 받는다. 주변 편의 시설만 `facilities` 밖으로 나간다.
 */
function facilitiesOf(amenities: string[]) {
  const facilities: Record<string, string[]> = {}
  let nearbyFacilities: string[] = []

  for (const group of FACILITY_GROUPS) {
    const codes = selectedCodes(amenities, group.key)
    if (group.key === 'nearbyFacilities') nearbyFacilities = codes
    else facilities[group.key] = codes
  }

  return { facilities, nearbyFacilities }
}

/**
 * 방 한 줄을 요청 모양으로. 숫자를 하나라도 못 읽으면 null 이다.
 *
 * 사진은 등록 요청에 담기지 않은 채로 두면 7일 뒤 서버가 지운다. 그래서 key 가 2장 미만이면
 * 보내지 않고 막는다 — 서버 제약이기도 하다.
 */
function roomOfferOf(
  room: ListingDraft['roomTypes'][number],
  roomPhotos: Record<string, Photo[]>,
  minimumPhotos = 2,
) {
  const monthlyRent = parseMoney(room.monthlyRent)
  const deposit = parseMoney(room.deposit)
  const maintenanceFee = parseMoney(room.maintenanceFee)
  const minStayMonths = parseMonths(room.minPeriod)
  const maxStayMonths = parseMonths(room.maxPeriod)
  const roomImageKeys = keysOf(roomPhotos[room.id] ?? [])

  if (monthlyRent === null || deposit === null || maintenanceFee === null) return null
  if (minStayMonths === null || maxStayMonths === null) return null
  if (room.name.trim() === '' || room.options.length === 0) return null
  if (roomImageKeys.length < minimumPhotos) return null

  return {
    name: room.name.trim(),
    contract: { minStayMonths, maxStayMonths },
    pricing: { monthlyRent, deposit, maintenanceFee },
    filterTags: room.options,
    roomImageKeys,
  }
}

export type ListingUpdateRequest = Omit<ListingRequest, 'consents' | 'roomOffers'> & {
  blogUrl?: string
  roomOffers: (ListingRequest['roomOffers'][number] & {
    roomOfferId: string | null
    status: 'ACTIVE' | 'INACTIVE'
  })[]
}

/**
 * draft 를 요청 본문으로. 보낼 수 없는 상태면 null 이다.
 *
 * `blogUrl` 은 담지 않는다 — 요청에는 있지만(nullable) 화면에 적을 자리가 없다.
 */
export function buildListingRequest(
  draft: ListingDraft,
  branchPhotos: Photo[],
  roomPhotos: Record<string, Photo[]>,
): ListingRequest | null {
  const { branch, building, conditions, survey, contact } = draft

  const totalFloors = parseCount(building.totalFloors)
  const usedFloors = parseSpan(building.operatingFloors)
  const phone = phoneToServer(contact.phone)
  const businessRegistrationNumber = contact.businessNumber.replace(/\D/g, '')
  const imageKeys = keysOf(branchPhotos)

  if (draft.spaceType === null || building.buildingType === '') return null
  if (totalFloors === null || usedFloors === null) return null
  if (building.hasParking === null || building.hasElevator === null) return null
  if (branch.lat === null || branch.lng === null || branch.nearestTransit === null) return null
  if (phone === null || businessRegistrationNumber.length !== 10) return null
  if (imageKeys.length === 0) return null

  const roomOffers = draft.roomTypes.map((room) => roomOfferOf(room, roomPhotos))
  if (roomOffers.length === 0 || roomOffers.some((offer) => offer === null)) return null

  const { facilities, nearbyFacilities } = facilitiesOf(draft.amenities)

  return {
    title: branch.name.trim(),
    type: draft.spaceType,
    contact: { managerName: contact.managerName.trim(), phone },
    businessRegistrationNumber,
    address: {
      fullAddress: branch.address,
      detail: branch.addressDetail.trim(),
      lat: branch.lat,
      lng: branch.lng,
    },
    building: {
      type: building.buildingType,
      totalFloors,
      usedFloorRange: `${usedFloors.min}~${usedFloors.max}`,
      parkingAvailable: building.hasParking,
      elevatorAvailable: building.hasElevator,
    },
    genderPolicy: conditions.genderRule,
    languagesSupported: conditions.languages,
    ageRange: conditions.ageRange,
    arcRequired: conditions.arcRule,
    facilities,
    nearbyFacilities,
    nearestTransit: { type: TRANSIT_TYPE, ...branch.nearestTransit },
    description: branch.description.trim(),
    extraNotes: conditions.houseRule.trim(),
    refundPolicy: conditions.refundPolicy.trim(),
    imageKeys,
    roomOffers: roomOffers as NonNullable<(typeof roomOffers)[number]>[],
    // 설문은 선택이다. 안 고르면 빈 배열로 저장되고 세입자에게 안 보인다.
    preferredNationalities: survey.nationalities,
    contractDifficulties: survey.difficulties,
    serviceFeedback: survey.message.trim() === '' ? null : survey.message.trim(),
    /*
     * 동의 체크박스는 화면에서 뺐다(2026-08-28, 팀 확정 — 받을 필요가 없다).
     * 요청 스키마에는 필수 필드로 남아 있어서, 백엔드가 필드를 지울 때까지 true 로 채운다.
     * 지우면 이 블록과 ListingRequest 타입에서 같이 걷어낸다.
     */
    consents: {
      privacyPolicyAgreed: true,
      listingExposureAgreed: true,
    },
  }
}

/**
 * 수정은 부분 저장이 아니라 전체 교체다. 화면에 보이는 ACTIVE 방 뒤에 기존 INACTIVE 방을
 * 함께 보내며, 기존 사진은 listings/… key, 새 사진은 uploads/… key인 채 한 배열에 섞인다.
 */
export function buildListingUpdateRequest(
  draft: ListingDraft,
  branchPhotos: Photo[],
  roomPhotos: Record<string, Photo[]>,
  inactiveRooms: ListingDraft['roomTypes'],
): ListingUpdateRequest | null {
  const createdShape = buildListingRequest(draft, branchPhotos, roomPhotos)
  if (createdShape === null) return null

  const activeRooms = createdShape.roomOffers.map((offer, index) => ({
    ...offer,
    roomOfferId: draft.roomTypes[index]?.roomOfferId ?? null,
    status: 'ACTIVE' as const,
  }))

  const inactiveOffers = inactiveRooms.map((room) => {
    const offer = roomOfferOf(room, roomPhotos, 0)
    if (offer === null || room.roomOfferId === null) return null
    return {
      ...offer,
      roomOfferId: room.roomOfferId,
      status: 'INACTIVE' as const,
    }
  })
  if (inactiveOffers.some((offer) => offer === null)) return null

  // PUT 스키마에는 신규 등록 때의 동의 필드가 없다. 기존 블로그 주소는 보이지 않는 값이라 보존한다.
  const { consents: _consents, roomOffers: _roomOffers, ...base } = createdShape
  const blogUrl = draft.blogUrl?.trim()

  return {
    ...base,
    ...(blogUrl ? { blogUrl } : {}),
    address: {
      ...base.address,
      detail: base.address.detail?.trim() || null,
    },
    roomOffers: [
      ...activeRooms,
      ...(inactiveOffers as NonNullable<(typeof inactiveOffers)[number]>[]),
    ],
  }
}
