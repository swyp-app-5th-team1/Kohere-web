import type { EditableListingDetail, EditableListingRoom } from '../../api/listings'
import { formatBusinessNumber, formatPhone } from '../form/formatters'
import type { ListingDraft, RoomTypeDraft, StoredPhoto } from './draft'
import { FACILITY_GROUPS, facilityKey } from './facilities'
import { SPACE_TYPES, type SpaceType } from './spaceTypes'

export type EditableFormState = {
  draft: ListingDraft
  branchPhotos: StoredPhoto[]
  roomPhotos: Record<string, StoredPhoto[]>
  /** 이미 내려둔 방과 이번 화면에서 삭제한 기존 방. PUT에는 INACTIVE로 계속 남긴다. */
  inactiveRooms: RoomTypeDraft[]
}

const isSpaceType = (value: string): value is SpaceType =>
  SPACE_TYPES.some((item) => item.value === value)

/** 서버의 국내 국제표기를 등록 폼의 하이픈 표기로 되돌린다. */
function phoneFromServer(phone: string) {
  const international = phone.match(/^\+82\)\s*(.+)$/)
  if (!international) return formatPhone(phone)

  const nationalNumber = international[1]
  return formatPhone(/^1[5-8]/.test(nationalNumber) ? nationalNumber : `0${nationalNumber}`)
}

/** URL은 표시용, key는 PUT용이다. 명세가 보장하는 같은 순서를 그대로 짝짓는다. */
function storedPhotos(keys: string[], urls: string[]): StoredPhoto[] {
  return keys.map((key, index) => ({
    id: crypto.randomUUID(),
    key,
    url: urls[index] ?? '',
  }))
}

function roomDraft(room: EditableListingRoom): RoomTypeDraft {
  return {
    id: room.roomOfferId,
    roomOfferId: room.roomOfferId,
    status: room.status,
    name: room.name,
    deposit: String(room.pricing.deposit),
    maintenanceFee: String(room.pricing.maintenanceFee),
    monthlyRent: String(room.pricing.monthlyRent),
    minPeriod: String(room.contract.minStayMonths),
    maxPeriod: String(room.contract.maxStayMonths),
    options: room.filterTags,
  }
}

/**
 * 임대인 전용 상세를 기존 7단계 폼 상태로 옮긴다.
 *
 * 공개 상세의 라벨은 화면 표시용이고, 수정 요청에는 항상 code 또는 수정 전용 응답의 원본
 * 문자열을 되돌려 보낸다. 사진도 URL에서 key를 추측하지 않고 함께 내려온 key를 쓴다.
 */
export function editableListingToForm(detail: EditableListingDetail): EditableFormState {
  const { listing } = detail
  const spaceType = isSpaceType(listing.type.code) ? listing.type.code : null

  const amenities = FACILITY_GROUPS.flatMap((group) => {
    const values =
      group.key === 'nearbyFacilities'
        ? listing.nearbyFacilities
        : listing.facilities[group.key]
    return values.map((item) => facilityKey(group.key, item.code))
  })

  const rooms = detail.rooms.map(roomDraft)
  const activeRooms = rooms.filter((room) => room.status === 'ACTIVE')
  const inactiveRooms = rooms.filter((room) => room.status === 'INACTIVE')
  const branchPhotos = storedPhotos(detail.imageKeys, listing.imageUrls)
  const roomPhotos = Object.fromEntries(
    detail.rooms.map((room) => [
      room.roomOfferId,
      storedPhotos(room.roomImageKeys, room.roomImageUrls),
    ]),
  )

  return {
    draft: {
      step: 0,
      spaceType,
      branch: {
        name: listing.title,
        // 우편번호는 주소 검색 창에서만 쓰며 등록·수정 요청에는 실리지 않는다.
        postalCode: '',
        address: listing.address.fullAddress,
        addressDetail: listing.address.detail ?? '',
        lat: listing.location.lat,
        lng: listing.location.lng,
        nearestTransit: {
          name: listing.nearestTransit.name,
          walkMinutes: listing.nearestTransit.walkMinutes,
        },
        description: listing.description,
      },
      building: {
        buildingType: listing.building.type.code,
        totalFloors: String(listing.building.totalFloors),
        operatingFloors:
          listing.building.usedFloorMin === listing.building.usedFloorMax
            ? String(listing.building.usedFloorMin)
            : `${listing.building.usedFloorMin}~${listing.building.usedFloorMax}`,
        hasParking: listing.building.parkingAvailable,
        hasElevator: listing.building.elevatorAvailable,
      },
      conditions: {
        genderRule: listing.genderPolicy.code,
        languages: listing.languagesSupported.map((item) => item.code),
        arcRule: listing.arcRequired.code,
        ageRange: `${listing.ageMin}~${listing.ageMax}`,
        houseRule: listing.extraNotes,
        refundPolicy: listing.refundPolicy,
      },
      amenities,
      roomTypes: activeRooms,
      survey: {
        nationalities: detail.preferredNationalities,
        difficulties: detail.contractDifficulties,
        message: detail.serviceFeedback ?? '',
      },
      contact: {
        managerName: listing.contact.managerName,
        phone: phoneFromServer(listing.contact.phone),
        businessNumber: formatBusinessNumber(detail.businessRegistrationNumber),
      },
      blogUrl: listing.blogUrl ?? null,
      branchPhotos,
      roomPhotos,
    },
    branchPhotos,
    roomPhotos,
    inactiveRooms,
  }
}
