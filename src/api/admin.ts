import { ApiError, api } from './client'
import type { ListingDetail } from './listings'

const ADMIN_LISTINGS_PATH = '/api/v1/admin/listings'
const PAGE_SIZE = 100

/** 관리자 목록의 한 항목. 등록자 이름은 현재 응답에 없어서 의도적으로 모델에 넣지 않는다. */
export type AdminListingEntry = {
  listing: ListingDetail
  landlordId: number
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
