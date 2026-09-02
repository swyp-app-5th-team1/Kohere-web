import { ApiError, api } from './client'
import type { ListingDetail } from './listings'

const ADMIN_LISTINGS_PATH = '/api/v1/admin/listings'
const PAGE_SIZE = 100

/** 관리자 목록의 한 항목. */
export type AdminListingEntry = {
  listing: ListingDetail
  landlordId: number
  /**
   * 매물 소유 임대인의 계정 이름. 등록 폼의 지점 담당자(listing.contact.managerName)와는 다른 값이다.
   * 서버가 이름을 알 수 없으면 null 이 아니라 필드 자체가 빠진다.
   */
  landlordName?: string | null
  businessRegistrationNumber: string
  preferredNationalities: string[]
  contractDifficulties: string[]
  serviceFeedback?: string | null
  rejectionReason?: string | null
}

export type AdminListingsPage = {
  content: AdminListingEntry[]
  page: {
    number: number
    size: number
    totalElements: number
    totalPages: number
    hasNext: boolean
  }
}

/**
 * 심사 상세 한 건. 목록 항목과 같은 구조라 목록에서 넘어올 때는 부르지 않고,
 * 새로고침·직접 URL 진입처럼 손에 든 항목이 없을 때만 부른다.
 */
export function fetchAdminListing(
  listingId: string,
  signal?: AbortSignal,
): Promise<AdminListingEntry> {
  return api.get<AdminListingEntry>(
    `${ADMIN_LISTINGS_PATH}/${encodeURIComponent(listingId)}`,
    { signal },
  )
}

/**
 * 승인 → PUBLISHED. 본문이 없고 상태를 가리지 않는다 — 잘못 반려한 매물의 재승인도 같은 경로다.
 * 이미 공개 중이면 서버가 아무 일도 하지 않고 그대로 돌려준다.
 */
export function approveAdminListing(listingId: string): Promise<AdminListingEntry> {
  return api.post<AdminListingEntry>(
    `${ADMIN_LISTINGS_PATH}/${encodeURIComponent(listingId)}/approval`,
  )
}

/** 반려 사유 최대 길이. 서버 검증(@Size(max = 500))과 같은 값이다. */
export const REJECTION_REASON_MAX = 500

/**
 * 반려 → REJECTED + 사유 저장. 상태를 가리지 않아 공개 매물의 사후 반려, 이미 반려한 매물의
 * 사유 정정도 이 경로다. 사유는 공백 불가 · 1~500자.
 */
export function rejectAdminListing(
  listingId: string,
  reason: string,
): Promise<AdminListingEntry> {
  return api.post<AdminListingEntry>(
    `${ADMIN_LISTINGS_PATH}/${encodeURIComponent(listingId)}/rejection`,
    { reason },
  )
}

function fetchAdminListingsPage(
  page: number,
  signal?: AbortSignal,
): Promise<AdminListingsPage> {
  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  return api.get<AdminListingsPage>(`${ADMIN_LISTINGS_PATH}?${query}`, { signal })
}

/**
 * 상태 카드 숫자와 로컬 검색이 현재 목록 전체를 기준으로 동작하도록 모든 페이지를 모은다.
 * 첫 응답이 100건을 넘을 때만 나머지를 추가 호출한다.
 */
export async function fetchAllAdminListings(signal?: AbortSignal): Promise<AdminListingEntry[]> {
  const first = await fetchAdminListingsPage(0, signal)
  if (first.page.totalPages <= 1) return first.content

  const remainingPages = await Promise.all(
    Array.from({ length: first.page.totalPages - 1 }, (_, index) =>
      fetchAdminListingsPage(index + 1, signal),
    ),
  )

  return [first, ...remainingPages].flatMap((result) => result.content)
}

export function adminListingsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '심사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'FORBIDDEN':
      return '관리자 계정만 심사 목록을 확인할 수 있습니다.'
    case 'AUTH_ONBOARDING_REQUIRED':
      return '온보딩을 완료한 관리자 계정으로 로그인해 주세요.'
    default:
      return '심사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

export function adminListingDetailErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '매물 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'LISTING_NOT_FOUND':
      return '매물을 찾을 수 없습니다.'
    case 'FORBIDDEN':
      return '관리자 계정만 심사 내용을 확인할 수 있습니다.'
    case 'AUTH_ONBOARDING_REQUIRED':
      return '온보딩을 완료한 관리자 계정으로 로그인해 주세요.'
    default:
      return '매물 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

/** 승인 · 반려 실패 문구. 어느 쪽인지는 호출부가 앞에 붙인다. */
export function adminDecisionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'INVALID_INPUT':
      return error.fieldErrors[0]?.reason ?? '반려 사유를 다시 확인해 주세요.'
    case 'LISTING_NOT_FOUND':
      return '매물을 찾을 수 없습니다. 목록에서 다시 확인해 주세요.'
    case 'FORBIDDEN':
      return '관리자 계정만 심사할 수 있습니다.'
    case 'AUTH_ONBOARDING_REQUIRED':
      return '온보딩을 완료한 관리자 계정으로 로그인해 주세요.'
    default:
      return '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
