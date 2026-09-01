import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchEditableListing,
  myListingDetailErrorMessage,
  type ListingDetail,
  type MyListingEntry,
} from '../api/listings'
import { AppHeader } from '../components/AppHeader'
import { formatPhone } from '../components/form/formatters'
import { BUILDING_TYPES } from '../components/listing-new/buildingTypes'
import {
  ARC_REQUIREMENTS,
  GENDER_POLICIES,
  ROOM_FILTER_TAGS,
} from '../components/listing-new/catalogs'
import { SPACE_TYPES } from '../components/listing-new/spaceTypes'
import arrowLeftUrl from '../assets/icon-arrow-left.svg'

type SummaryRow = {
  label: string
  value: string
}

type ListingDetailNavigationState = {
  entry: MyListingEntry
}

const labelOf = (
  catalog: readonly { code: string; label: string }[],
  code: string,
  fallback: string,
) => catalog.find((item) => item.code === code)?.label ?? fallback

/** 값이 하나도 없으면 행 높이는 유지하면서 대시를 보여 준다. */
const joined = (parts: (string | false | null | undefined)[], separator = ' · ') => {
  const values = parts.filter((part): part is string => Boolean(part))
  return values.length > 0 ? values.join(separator) : '-'
}

/** 서버의 `+82) 10-1234-5678` 을 국내 화면 표기로 되돌린다. */
function localPhone(phone: string) {
  const international = phone.match(/^\+82\)\s*(.+)$/)
  if (!international) return formatPhone(phone)

  // 15xx·16xx·18xx 대표번호는 국제 표기에서도 앞에 0 이 붙지 않는다.
  const nationalNumber = international[1]
  return formatPhone(/^1[5-8]/.test(nationalNumber) ? nationalNumber : `0${nationalNumber}`)
}

function floorSummary(detail: ListingDetail) {
  const { totalFloors, usedFloorMin, usedFloorMax } = detail.building
  const usedFloors =
    usedFloorMin === usedFloorMax ? `${usedFloorMin}층` : `${usedFloorMin}~${usedFloorMax}층`
  return `${totalFloors}층 중 ${usedFloors}`
}

function facilityCount(detail: ListingDetail) {
  const selected = (item: { code: string }) => item.code !== 'NONE'
  const indoor = Object.values(detail.facilities).reduce(
    (sum, items) => sum + items.filter(selected).length,
    0,
  )
  return indoor + detail.nearbyFacilities.filter(selected).length
}

/** ISO 날짜를 시안의 `yyyy.MM.dd 등록` 표기로 바꾼다. */
function registeredDateLabel(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]} 등록` : '- 등록'
}

/** 서버 코드 라벨을 시안의 한국어 요약 문구로 바꾼다. */
function summaryRows(detail: ListingDetail): SummaryRow[] {
  const spaceType = SPACE_TYPES.find((item) => item.value === detail.type.code)?.label
  const address = [detail.address.fullAddress, detail.address.detail].filter(Boolean).join(' ')
  const buildingType = labelOf(BUILDING_TYPES, detail.building.type.code, detail.building.type.label)
  const gender = labelOf(GENDER_POLICIES, detail.genderPolicy.code, detail.genderPolicy.label)
  const arc = labelOf(ARC_REQUIREMENTS, detail.arcRequired.code, detail.arcRequired.label)
  const addressRegistration = detail.conditions.find(
    (condition) => condition.code === 'ADDRESS_REGISTRATION',
  )
  const addressRegistrationLabel = addressRegistration
    ? labelOf(ROOM_FILTER_TAGS, addressRegistration.code, addressRegistration.label)
    : null
  const selectedFacilities = facilityCount(detail)

  return [
    {
      label: '공간 유형 · 위치',
      value: joined([spaceType ?? detail.type.label, address]),
    },
    {
      label: '지점 소개',
      value: joined(
        [
          detail.title,
          detail.description.trim(),
          detail.imageUrls.length > 0 && `사진 ${detail.imageUrls.length}장`,
        ],
        ', ',
      ),
    },
    {
      label: '건물 정보',
      value: joined([buildingType, floorSummary(detail)]),
    },
    {
      label: '입주 조건',
      value: joined([gender, arc && `ARC ${arc}`, addressRegistrationLabel]),
    },
    {
      label: '공동 시설',
      value: selectedFacilities > 0 ? `${selectedFacilities}개 항목 선택` : '-',
    },
    {
      label: '객실 타입',
      value: joined(detail.roomOffers.map((room) => room.name)),
    },
    {
      label: '담당자 정보',
      value: joined([detail.contact.managerName, localPhone(detail.contact.phone)]),
    },
  ]
}

export default function ListingDetailPage() {
  const { listingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as ListingDetailNavigationState | null
  const navigationEntry = navigationState?.entry
  const matchingNavigationEntry =
    navigationEntry && listingId && navigationEntry.listing.listingId === listingId
      ? navigationEntry
      : null
  const [entry, setEntry] = useState<MyListingEntry | null>(matchingNavigationEntry)
  const [loading, setLoading] = useState(matchingNavigationEntry === null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const detail = entry && entry.listing.listingId === listingId ? entry.listing : null
  const close = () => navigate('/listings')
  const editable = detail?.status === 'PUBLISHED' || detail?.status === 'REJECTED'
  const rejected = detail?.status === 'REJECTED'
  const rejectionReason = entry?.rejectionReason ?? '-'

  /*
   * 목록에서 이동하면 navigation state를 즉시 사용하고, 새로고침·직접 URL 진입이면
   * 수정 전용 상세 API로 다시 채운다. 라우터 state만 믿으면 새로고침 순간 화면이 사라진다.
   */
  useEffect(() => {
    if (matchingNavigationEntry !== null) {
      setEntry(matchingNavigationEntry)
      setLoading(false)
      setLoadError(null)
      return
    }

    if (!listingId) {
      setEntry(null)
      setLoading(false)
      setLoadError('매물을 찾을 수 없습니다.')
      return
    }

    const controller = new AbortController()
    setEntry(null)
    setLoading(true)
    setLoadError(null)

    fetchEditableListing(listingId, controller.signal)
      .then((result) => {
        setEntry({
          listing: result.listing,
          rejectionReason: result.rejectionReason,
        })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoadError(myListingDetailErrorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [listingId, matchingNavigationEntry, reloadKey])

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader />

      {loading && (
        <main className="text-cool-neutral-30 flex w-full flex-1 items-center justify-center px-6 text-base leading-6">
          매물 정보를 불러오는 중입니다.
        </main>
      )}

      {!loading && loadError !== null && (
        <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-cool-neutral-30 text-base leading-6">{loadError}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              className="border-line-normal text-label-normal h-12 rounded-2xl border px-6 text-base leading-6 font-semibold"
            >
              목록으로
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="bg-label-normal border-line-normal h-12 rounded-2xl border px-6 text-base leading-6 font-semibold text-white transition hover:opacity-90"
            >
              다시 시도
            </button>
          </div>
        </main>
      )}

      {!loading && loadError === null && detail !== null && (
        <main className="flex w-full flex-1 flex-col items-center px-6 pt-[52px] pb-[51px] md:px-12">
          <div className="flex w-full max-w-[980px] flex-col">
            <h1 className="text-[32px] leading-10 font-bold text-[#242424]">{detail.title}</h1>

            <div className="mt-8 flex w-full flex-col gap-8">
              {rejected && (
                <section className="border-line-normal overflow-hidden rounded-2xl border">
                  <div className="bg-status-red-5 border-line-normal flex flex-col gap-2.5 border-b p-4">
                    <h2 className="text-status-red-99 text-lg leading-6 font-semibold">반려 사유</h2>
                    <p className="text-neutral-50 text-base leading-6 font-medium">
                      {registeredDateLabel(detail.createdAt)}
                    </p>
                  </div>
                  <p className="text-[#242424] p-4 text-base leading-6 font-medium">
                    {rejectionReason}
                  </p>
                </section>
              )}

              <div className="border-line-normal divide-line-normal flex w-full flex-col divide-y overflow-hidden rounded-2xl border bg-white">
                {summaryRows(detail).map((row) => (
                  <div
                    key={row.label}
                    className="flex min-h-[90px] flex-col justify-center gap-2.5 px-4 py-4"
                  >
                    <span className="text-neutral-70 text-lg leading-6 font-semibold">
                      {row.label}
                    </span>
                    <span className="text-cool-neutral-30 w-full truncate text-base leading-6 font-medium">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {editable ? (
              <div className="mt-[66.5px] flex w-full items-center justify-between">
                <button
                  type="button"
                  onClick={close}
                  className="bg-cool-neutral-20 border-line-normal flex h-12 w-[158px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition hover:brightness-105"
                >
                  <img src={arrowLeftUrl} alt="" className="size-6" />
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/listings/${detail.listingId}/edit`)}
                  className="bg-status-red-5 border-line-alternative text-primary-50 flex h-12 w-[158px] items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold transition hover:brightness-95"
                >
                  수정하기
                </button>
              </div>
            ) : (
              <div className="mt-[66.5px] flex w-full justify-center">
                <button
                  type="button"
                  onClick={close}
                  className="bg-label-normal border-line-normal h-12 rounded-2xl border px-6 text-base leading-6 font-semibold text-white transition hover:opacity-90"
                >
                  확인 후 닫기
                </button>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
