import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  REJECTION_REASON_MAX,
  adminDecisionErrorMessage,
  adminListingDetailErrorMessage,
  approveAdminListing,
  fetchAdminListing,
  rejectAdminListing,
  type AdminListingEntry,
} from '../api/admin'
import type { ListingDetail, ListingRoomOffer } from '../api/listings'
import type { CodeLabel } from '../api/types'
import { AppHeader } from '../components/AppHeader'
import { STATUS_BADGES, statusBadgeClass } from '../components/admin/statusBadges'
import { Field, FieldError } from '../components/form/Field'
import { formatBusinessNumber, formatPhone } from '../components/form/formatters'
import { BUILDING_TYPES } from '../components/listing-new/buildingTypes'
import {
  ARC_REQUIREMENTS,
  CONTRACT_DIFFICULTIES,
  GENDER_POLICIES,
  PREFERRED_NATIONALITIES,
  ROOM_FILTER_TAGS,
  SUPPORTED_LANGUAGES,
  type CatalogItem,
} from '../components/listing-new/catalogs'
import { FACILITY_GROUPS, FACILITY_NONE } from '../components/listing-new/facilities'
import { SPACE_TYPES } from '../components/listing-new/spaceTypes'
import chevronUrl from '../assets/icon-chevron-down.svg'

/*
 * 관리자 매물 심사 상세.
 *
 * 임대인이 등록 폼에서 적은 내용을 **폼과 같은 순서 · 같은 생김새**로 보여 주되 고칠 수는 없다.
 * 등록 단계 컴포넌트를 그대로 쓰지 않은 이유는 그쪽이 입력 · 검색 · 사진 올리기까지 품고 있어
 * 읽기 전용 스위치를 넣으면 폼 쪽이 복잡해지기 때문이다. 대신 시안의 읽기 전용 모양(연회색 상자,
 * 고른 칩만 진한 테두리)을 여기서 따로 그린다.
 *
 * 칩은 폼처럼 **모든 선택지를 다 보여 주고** 고른 것만 진하게 표시한다 (시안). 관리자가 「무엇을
 * 안 골랐는지」도 봐야 하기 때문이다.
 *
 * 아래 반려 사유 · 버튼 영역은 화면에 고정되고 위 내용만 스크롤된다 (시안). 본문 아래에
 * 그 높이만큼 여백을 두어 마지막 내용이 가려지지 않게 한다.
 */

const TABS = [
  '공간 유형 · 위치',
  '지점 소개',
  '건물 정보',
  '입주 조건',
  '공동 시설',
  '객실 타입',
  '추가질문사항',
  '담당자 정보',
] as const

/** 등록 폼의 글자 수 상한. 읽기 전용에서도 시안대로 `n / 500` 을 라벨 오른쪽에 붙인다. */
const TEXT_MAX = 500

type ReviewNavigationState = {
  entry: AdminListingEntry
}

/** 서버의 `+82) 10-1234-5678` 을 국내 화면 표기로 되돌린다. */
function localPhone(phone: string) {
  const international = phone.match(/^\+82\)\s*(.+)$/)
  if (!international) return formatPhone(phone)

  const nationalNumber = international[1]
  return formatPhone(/^1[5-8]/.test(nationalNumber) ? nationalNumber : `0${nationalNumber}`)
}

/** 시안 표기(「50만 원」). 만 단위로 떨어지지 않으면 「123만 4,567원」처럼 나머지를 붙인다. */
function won(amount: number) {
  if (amount < 10_000) return `${amount.toLocaleString('ko-KR')}원`
  const man = Math.floor(amount / 10_000)
  const rest = amount % 10_000
  return rest === 0 ? `${man}만 원` : `${man}만 ${rest.toLocaleString('ko-KR')}원`
}

/* ---------- 읽기 전용 조각들 ---------- */

/**
 * 시안의 값 상자: neutral/5 배경 · 테두리 없음 · 라운드 16 · 안쪽 16, 글자 Medium 18.
 *
 * 글자색은 값의 성격으로 갈린다 — 임대인이 직접 친 값은 neutral/50, 주소 · 인근 역처럼 검색에서
 * 골라 2차로 채워진 값과 비어 있는 자리(대시)는 neutral/30 이다.
 */
const boxClass =
  'bg-neutral-5 w-full rounded-2xl px-4 text-lg leading-6 font-medium wrap-break-word'

type ValueTone = 'typed' | 'derived'

function ReadonlyBox({
  value,
  multiline = false,
  tone = 'typed',
}: {
  value: string | null | undefined
  multiline?: boolean
  tone?: ValueTone
}) {
  const filled = Boolean(value?.trim())
  return (
    <div
      className={
        boxClass +
        (filled && tone === 'typed' ? ' text-neutral-50' : ' text-neutral-30') +
        (multiline ? ' min-h-[100px] py-4 whitespace-pre-wrap' : ' flex min-h-14 items-center py-4')
      }
    >
      {filled ? value : '-'}
    </div>
  )
}

function ReadonlyText({
  label,
  value,
  tone,
}: {
  label: string
  value: string | null | undefined
  tone?: ValueTone
}) {
  return (
    <Field label={label}>
      <ReadonlyBox value={value} tone={tone} />
    </Field>
  )
}

/** 폼의 textarea 자리. 시안대로 라벨 오른쪽에 글자 수를 붙인다. */
function ReadonlyTextarea({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Field
      label={label}
      labelEnd={
        <span className="text-label-neutral text-sm leading-5 font-medium">
          {value?.length ?? 0} / {TEXT_MAX}
        </span>
      }
    >
      <ReadonlyBox value={value} multiline />
    </Field>
  )
}

/**
 * 읽기 전용 칩. 폼의 칩과 크기(44 · 라운드 12)는 같고 색만 다르다. 둘 다 neutral/5 배경에
 * 1px 테두리이고, 고른 것은 neutral/50 테두리 · neutral/50 글자, 안 고른 것은 line/alternative
 * 테두리 · neutral/30 글자다. 글자는 Medium 14.
 */
function ReadonlyChip({
  selected,
  children,
  className = '',
}: {
  selected: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={
        'bg-neutral-5 flex h-11 shrink-0 items-center justify-center rounded-xl border px-[15px] text-center text-sm leading-5 font-medium ' +
        (selected ? 'border-neutral-50 text-neutral-50' : 'border-line-alternative text-neutral-30') +
        (className ? ' ' + className : '')
      }
    >
      {children}
    </span>
  )
}

function ReadonlyChipGroup({
  label,
  options,
  selected,
  vertical = false,
  chipClassName = '',
  gap = 'gap-2',
}: {
  label: string
  options: readonly CatalogItem[]
  selected: readonly string[]
  vertical?: boolean
  chipClassName?: string
  gap?: string
}) {
  return (
    <Field label={label}>
      <div className={'flex w-full ' + gap + (vertical ? ' flex-col items-start' : ' flex-wrap')}>
        {options.map((option) => (
          <ReadonlyChip
            key={option.code}
            selected={selected.includes(option.code)}
            className={chipClassName}
          >
            {option.label}
          </ReadonlyChip>
        ))}
      </div>
    </Field>
  )
}

const YES_NO: CatalogItem[] = [
  { code: 'true', label: '있음' },
  { code: 'false', label: '없음' },
]

/** 시안의 「png 파일 4장」. 주소에서 확장자를 읽고, 못 읽으면 「사진 N장」이다. */
function photoCountLabel(urls: string[]) {
  const extension = urls[0]?.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i)?.[1]?.toLowerCase()
  return extension ? `${extension} 파일 ${urls.length}장` : `사진 ${urls.length}장`
}

/** 등록 폼의 사진 칸과 같은 160×90 썸네일. 첫 장이 대표다. 아래 줄에 장수를 적는다. */
function PhotoRow({ label, urls }: { label: string; urls: string[] }) {
  return (
    <Field label={label} gap="gap-2">
      <div className="flex w-full flex-col gap-2">
        {urls.length === 0 ? (
          <span className="text-cool-neutral-30 px-1 text-lg leading-6 font-medium">-</span>
        ) : (
          <div className="flex w-full flex-wrap gap-3">
            {urls.map((url, index) => (
              <a
                key={`${index}-${url}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${index + 1}번째 사진 크게 보기`}
                className="relative h-[90px] w-[160px] shrink-0"
              >
                <img src={url} alt="" className="size-full rounded-2xl object-cover" />
                {index === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-white/50 px-2.5 py-0.5 text-xs leading-4 font-medium text-white backdrop-blur-sm">
                    대표
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
        <span className="text-cool-neutral-85 text-xs leading-4 font-medium">
          {photoCountLabel(urls)}
        </span>
      </div>
    </Field>
  )
}

function TwoColumns({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-8 md:flex-row md:gap-[50px]">{children}</div>
}

function Column({ children }: { children: ReactNode }) {
  return <div className="min-w-0 flex-1">{children}</div>
}

/* ---------- 탭별 내용 ---------- */

function SpaceAndLocationTab({ listing }: { listing: ListingDetail }) {
  const spaceType = SPACE_TYPES.find((item) => item.value === listing.type.code)
  const transit = listing.nearestTransit
    ? `${listing.nearestTransit.name} 도보 ${listing.nearestTransit.walkMinutes}분`
    : ''

  /*
   * 시안 수치: 카드는 neutral/5 배경 · neutral/40 2px · 라운드 12, 안쪽 여백 좌 18 · 상하 28,
   * 아이콘(68) 과 라벨 묶음 사이 16, 라벨 둘은 세로 가운데에 6 간격. 카드와 주소 사이 40,
   * 주소 · 상세 주소 · 인근 역 사이 20, 마지막 필드와 카드 바닥 사이 56(카드 pb-14).
   */
  return (
    <div className="flex w-full flex-col gap-10">
      <div className="border-neutral-40 bg-neutral-5 flex w-full items-center gap-4 rounded-xl border-2 py-7 pr-[18px] pl-[18px] md:w-fit">
        {spaceType && (
          <spaceType.Icon aria-hidden className="text-neutral-40 size-[68px] shrink-0" />
        )}
        <div className="flex flex-col items-start gap-1.5 text-lg leading-6 whitespace-nowrap">
          <span className="text-neutral-70 font-semibold">
            {spaceType?.label ?? listing.type.label}
          </span>
          {spaceType && (
            <span className="text-neutral-30 font-medium">{spaceType.description}</span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-5">
        {/* 주소 · 인근 역은 검색에서 고른 2차 값이라 neutral/30, 상세 주소는 직접 친 값이라 neutral/50. */}
        <ReadonlyText label="주소" value={listing.address.fullAddress} tone="derived" />
        <ReadonlyText label="상세 주소" value={listing.address.detail} />
        <Field label="인근 역">
          <div className="bg-neutral-5 text-neutral-30 flex min-h-14 w-full items-center gap-3 rounded-2xl p-4">
            <LocationPinIcon />
            <span className="min-w-0 flex-1 text-lg leading-6 font-medium">{transit || '-'}</span>
          </div>
        </Field>
      </div>
    </div>
  )
}

function BranchTab({ listing }: { listing: ListingDetail }) {
  return (
    <>
      <ReadonlyText label="지점명" value={listing.title} />
      <ReadonlyTextarea label="지점 소개글" value={listing.description} />
    </>
  )
}

function BuildingTab({ listing }: { listing: ListingDetail }) {
  const { building } = listing
  const operatingFloors =
    building.usedFloorMin === building.usedFloorMax
      ? `${building.usedFloorMin}층`
      : `${building.usedFloorMin}~${building.usedFloorMax}층`

  return (
    <>
      <ReadonlyChipGroup
        label="건물 형태"
        options={BUILDING_TYPES}
        selected={[building.type.code]}
      />
      <TwoColumns>
        <Column>
          <ReadonlyText label="총 층수" value={`${building.totalFloors}층`} />
        </Column>
        <Column>
          <ReadonlyText label="지점 운영층" value={operatingFloors} />
        </Column>
      </TwoColumns>
      <ReadonlyChipGroup
        label="주차공간"
        options={YES_NO}
        selected={[String(building.parkingAvailable)]}
        chipClassName="w-[200px]"
        gap="gap-5"
      />
      <ReadonlyChipGroup
        label="엘리베이터"
        options={YES_NO}
        selected={[String(building.elevatorAvailable)]}
        chipClassName="w-[200px]"
        gap="gap-5"
      />
      <PhotoRow label="지점 대표사진 (1장 이상)" urls={listing.imageUrls} />
    </>
  )
}

function ConditionsTab({ listing }: { listing: ListingDetail }) {
  /* 이 탭만 섹션 사이가 24 다 (다른 탭은 32). */
  return (
    <div className="flex w-full flex-col gap-6">
      <ReadonlyChipGroup
        label="성별 구분"
        options={GENDER_POLICIES}
        selected={[listing.genderPolicy.code]}
      />
      <ReadonlyChipGroup
        label="외국어 응대 (중복가능)"
        options={SUPPORTED_LANGUAGES}
        selected={listing.languagesSupported.map((item) => item.code)}
      />
      <ReadonlyChipGroup
        label="외국인 등록증(ARC) 필요 여부"
        options={ARC_REQUIREMENTS}
        selected={[listing.arcRequired.code]}
      />
      <ReadonlyText label="이용 연령대" value={`${listing.ageMin}~${listing.ageMax}세`} />
      <ReadonlyTextarea label="이용조건" value={listing.extraNotes} />
      <ReadonlyTextarea label="환불정책" value={listing.refundPolicy} />
    </div>
  )
}

function FacilitiesTab({ listing }: { listing: ListingDetail }) {
  /* 서버는 NONE 도 다른 코드처럼 {code, label} 로 준다. 폼과 같이 「없음」이 맨 앞이다. */
  const none: CatalogItem = { code: FACILITY_NONE, label: '없음' }
  const codes = (items: CodeLabel[]) => items.map((item) => item.code)

  /* 시설 그룹 사이는 24, 칩 사이는 8 이다. */
  return (
    <div className="flex w-full flex-col gap-6">
      {FACILITY_GROUPS.map((group) => {
        const picked =
          group.key === 'nearbyFacilities'
            ? listing.nearbyFacilities
            : listing.facilities[group.key]
        return (
          <ReadonlyChipGroup
            key={group.key}
            label={group.label}
            options={[none, ...group.items]}
            selected={codes(picked)}
          />
        )
      })}
    </div>
  )
}

/**
 * 폼과 같은 접이식 방 카드. 열린 카드는 방 이름 줄 오른쪽에 접기 버튼이 붙는다.
 * 시안 수치: 카드 안쪽 좌우 24 · 위아래 32, 섹션 사이 24, 한 줄의 두 필드 사이 32, 사진 사이 12.
 */
function RoomCard({
  room,
  index,
  expanded,
  onToggle,
}: {
  room: ListingRoomOffer
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const name = room.name.trim() || `${String.fromCharCode(65 + index)} 타입`
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${name} ${expanded ? '접기' : '펼치기'}`}
      className="shrink-0 cursor-pointer"
    >
      <img
        src={chevronUrl}
        alt=""
        className={'size-6 transition-transform ' + (expanded ? 'rotate-180' : '')}
      />
    </button>
  )

  if (!expanded) {
    return (
      <div className="flex w-full items-center justify-between rounded-2xl border-[1.5px] border-gray-300 px-6 py-5">
        <span className="text-neutral-70 px-1 text-lg leading-6 font-semibold">{name}</span>
        {toggle}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl border-[1.5px] border-gray-300 px-6 py-8">
      <div className="flex w-full items-start gap-8">
        <div className="min-w-0 flex-1">
          <ReadonlyText label="방 이름" value={name} />
        </div>
        {toggle}
      </div>
      <ReadonlyText label="보증금" value={won(room.pricing.deposit)} />
      <div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
        <Column>
          <ReadonlyText label="관리비" value={won(room.pricing.maintenanceFee)} />
        </Column>
        <Column>
          <ReadonlyText label="월세" value={won(room.pricing.monthlyRent)} />
        </Column>
      </div>
      <Field label="이용기간">
        <div className="flex w-full items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <ReadonlyBox value={`${room.contract.minStayMonths}개월`} />
          </div>
          <span className="text-neutral-70 shrink-0 text-lg leading-6 font-semibold">~</span>
          <div className="min-w-0 flex-1">
            <ReadonlyBox value={`${room.contract.maxStayMonths}개월`} />
          </div>
        </div>
      </Field>
      <ReadonlyChipGroup
        label="각 방 타입별 옵션"
        options={ROOM_FILTER_TAGS}
        selected={room.filterTags.map((tag) => tag.code)}
      />
      <PhotoRow label="객실 사진 (2장 이상)" urls={room.roomImageUrls} />
    </div>
  )
}

function RoomsTab({ listing }: { listing: ListingDetail }) {
  /* 폼처럼 한 번에 하나만 펼친다. 처음에는 첫 방이 열려 있다. */
  const [expandedId, setExpandedId] = useState<string | null>(
    listing.roomOffers[0]?.roomOfferId ?? null,
  )

  if (listing.roomOffers.length === 0) {
    return (
      <p className="text-cool-neutral-30 text-lg leading-6 font-medium">
        등록된 객실 타입이 없습니다.
      </p>
    )
  }
  return (
    <>
      {listing.roomOffers.map((room, index) => (
        <RoomCard
          key={room.roomOfferId}
          room={room}
          index={index}
          expanded={expandedId === room.roomOfferId}
          onToggle={() =>
            setExpandedId((current) => (current === room.roomOfferId ? null : room.roomOfferId))
          }
        />
      ))}
    </>
  )
}

function SurveyTab({ entry }: { entry: AdminListingEntry }) {
  /* 섹션 사이 24. 칩은 가로 · 세로 모두 8 간격이다. */
  return (
    <div className="flex w-full flex-col gap-6">
      <ReadonlyChipGroup
        label="선호하는 국적"
        options={PREFERRED_NATIONALITIES}
        selected={entry.preferredNationalities}
      />
      <ReadonlyChipGroup
        label="외국인 임차인과 계약하는 과정에서 겪은 힘든 점, 어려운 점이 있다면 말씀해주세요."
        options={CONTRACT_DIFFICULTIES}
        selected={entry.contractDifficulties}
        vertical
      />
      <ReadonlyTextarea
        label="기타 필요한 서비스 혹은 Kohere에 전하고 싶은 말"
        value={entry.serviceFeedback}
      />
    </div>
  )
}

function ContactTab({ entry }: { entry: AdminListingEntry }) {
  const { contact } = entry.listing
  /* 섹션 사이 24. */
  return (
    <div className="flex w-full flex-col gap-6">
      <ReadonlyText label="지점 운영자명" value={contact.managerName} />
      <ReadonlyText label="지점 운영 휴대폰" value={localPhone(contact.phone)} />
      <ReadonlyText
        label="사업자 등록 번호"
        value={formatBusinessNumber(entry.businessRegistrationNumber)}
      />
    </div>
  )
}

function TabContent({ tab, entry }: { tab: number; entry: AdminListingEntry }) {
  const { listing } = entry
  switch (tab) {
    case 0:
      return <SpaceAndLocationTab listing={listing} />
    case 1:
      return <BranchTab listing={listing} />
    case 2:
      return <BuildingTab listing={listing} />
    case 3:
      return <ConditionsTab listing={listing} />
    case 4:
      return <FacilitiesTab listing={listing} />
    case 5:
      return <RoomsTab listing={listing} />
    case 6:
      return <SurveyTab entry={entry} />
    default:
      return <ContactTab entry={entry} />
  }
}

/** assets/icon-location.svg 와 같은 모양. 시안 색(neutral/30)을 입히려고 currentColor 로 인라인했다. */
function LocationPinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none">
      <path
        d="M20 10C20 16 12 22 12 22C12 22 4 16 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

/** 뒤로가기 화살표. 시안은 16×16 · neutral/20 이다. */
function BackChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none">
      <path
        d="m15 5-7 7 7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------- 페이지 ---------- */

export default function AdminListingReviewPage() {
  const { listingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as ReviewNavigationState | null
  const navigationEntry = navigationState?.entry
  const matchingNavigationEntry =
    navigationEntry && listingId && navigationEntry.listing.listingId === listingId
      ? navigationEntry
      : null

  const [entry, setEntry] = useState<AdminListingEntry | null>(matchingNavigationEntry)
  const [loading, setLoading] = useState(matchingNavigationEntry === null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [tab, setTab] = useState(0)

  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  /*
   * 목록에서 넘어오면 카드에 실린 항목을 그대로 쓰고, 새로고침 · 직접 진입이면 상세 API 로 채운다.
   * 목록 응답과 상세 응답이 같은 구조라 어느 쪽이든 화면은 같다.
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

    fetchAdminListing(listingId, controller.signal)
      .then(setEntry)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoadError(adminListingDetailErrorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [listingId, matchingNavigationEntry, reloadKey])

  /*
   * 이미 반려된 매물은 저장된 사유를 칸에 채워 둔다 — 반려 API 가 사유 정정에도 쓰이므로
   * 고쳐서 다시 보내면 된다. 고쳐서 재심사 올라온 PENDING 은 이전 사유를 칸 아래 참고로만 보인다.
   */
  useEffect(() => {
    if (entry?.listing.status === 'REJECTED') setReason(entry.rejectionReason ?? '')
  }, [entry])

  const detail = entry?.listing ?? null
  const previousReason =
    entry && entry.listing.status !== 'REJECTED' && entry.rejectionReason?.trim()
      ? entry.rejectionReason
      : null

  const approve = async () => {
    if (!detail || submitting) return
    setSubmitting('approve')
    setActionError(null)
    try {
      await approveAdminListing(detail.listingId)
      navigate('/admin', { replace: true })
    } catch (cause) {
      setActionError(`승인하지 못했습니다. ${adminDecisionErrorMessage(cause)}`)
      setSubmitting(null)
    }
  }

  const reject = async () => {
    if (!detail || submitting) return
    const trimmed = reason.trim()
    if (trimmed === '') {
      setReasonError('반려 사유를 적어 주세요. 임대인에게 그대로 전달됩니다.')
      return
    }
    setReasonError(null)
    setSubmitting('reject')
    setActionError(null)
    try {
      await rejectAdminListing(detail.listingId, trimmed)
      navigate('/admin', { replace: true })
    } catch (cause) {
      setActionError(`수정 요청을 보내지 못했습니다. ${adminDecisionErrorMessage(cause)}`)
      setSubmitting(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader variant="admin" />

      {loading && (
        <main className="text-cool-neutral-30 flex w-full flex-1 items-center justify-center px-6 text-base leading-6">
          매물 정보를 불러오는 중입니다.
        </main>
      )}

      {!loading && loadError !== null && (
        <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-cool-neutral-30 text-base leading-6">{loadError}</p>
          <div className="flex gap-3">
            <Link
              to="/admin"
              className="border-line-normal text-label-normal flex h-12 items-center rounded-2xl border px-6 text-base leading-6 font-semibold"
            >
              목록으로
            </Link>
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

      {!loading && loadError === null && entry !== null && detail !== null && (
        <>
          {/* 아래 고정 영역(약 300px)에 마지막 내용이 가려지지 않게 그만큼 비워 둔다. */}
          <main className="flex w-full flex-1 flex-col px-5 pt-8 pb-[340px] md:px-[100px] md:pt-14">
            {/* 헤더 아래 56, 왼쪽 20 안쪽에 16 화살표 · 16 간격 · SemiBold 18 매물명. 모두 neutral/20. 카드와 32. */}
            <Link
              to="/admin"
              className="text-neutral-20 flex h-6 w-fit items-center gap-4 pl-5 text-lg leading-6 font-semibold transition hover:text-neutral-50"
            >
              <BackChevronIcon />
              {detail.title}
            </Link>

            {/* 카드 안쪽 여백은 시안대로 좌우 55 · 위 48 이다. */}
            <section className="border-line-normal mt-8 flex w-full flex-col rounded-3xl border bg-white px-5 py-6 md:px-[55px] md:pt-12 md:pb-14">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[32px] leading-10 font-bold text-[#242424]">{detail.title}</h1>
                {/* 공간 유형 캡슐: secondary/5 배경 · neutral/60 1px. 제목과 8 떨어진다. */}
                <span className="bg-secondary-5 border-neutral-60 text-neutral-70 flex h-7 items-center rounded-full border px-2.5 text-xs leading-4 font-medium">
                  {detail.type.label}
                </span>
              </div>
              <span
                className={`${statusBadgeClass} mt-4 w-fit ${STATUS_BADGES[detail.status].className}`}
              >
                {STATUS_BADGES[detail.status].label}
              </span>

              {/*
                탭 하나는 114×44 이고, 왼쪽 24 여백부터 24 간격으로 놓인다. 고른 탭만
                common/100 3px 밑줄(안쪽)이고 줄 전체에는 연한 밑선이 깔린다.
              */}
              <div
                role="tablist"
                aria-label="심사 항목"
                className="-mx-5 mt-6 flex gap-2 overflow-x-auto border-b border-gray-200 px-5 md:mx-0 md:gap-6 md:px-6"
              >
                {TABS.map((label, index) => {
                  const selected = tab === index
                  return (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setTab(index)}
                      className={
                        // 고른 탭은 Label2 Semibold(14/20), 나머지는 Body2 Regular(14/20).
                        'flex h-11 w-[114px] shrink-0 items-center justify-center border-b-[3px] py-3 text-sm leading-5 whitespace-nowrap transition ' +
                        (selected
                          ? 'text-neutral-70 border-black font-semibold'
                          : 'text-neutral-50 hover:text-neutral-70 border-transparent font-normal')
                      }
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div key={tab} role="tabpanel" className="mt-8 flex w-full flex-col gap-8 md:mt-10">
                <TabContent tab={tab} entry={entry} />
              </div>
            </section>
          </main>

          {/*
            시안대로 화면 아래에 붙어 있고, 위 내용만 뒤에서 스크롤된다.
            높이 302 = 위 20 + 제목 24 + 8 + 입력칸 120 + 40 + 버튼 48 + 아래 40. 테두리는 gray/300 1px.
          */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-300 bg-white">
            <div className="flex w-full flex-col px-5 pt-5 pb-6 md:px-[100px] md:pb-10">
              <Field label="반려사유" gap="gap-2">
                <div className="flex w-full flex-col gap-1">
                  <textarea
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value)
                      if (reasonError) setReasonError(null)
                    }}
                    maxLength={REJECTION_REASON_MAX}
                    disabled={submitting !== null}
                    placeholder="반려된 이유를 상세히 적어주세요"
                    aria-invalid={reasonError !== null || undefined}
                    className={
                      'placeholder:text-cool-neutral-10 text-cool-neutral-70 focus:border-cool-neutral-50 disabled:bg-cool-neutral-7 h-[96px] w-full resize-none overflow-y-auto rounded-2xl border bg-white p-4 text-lg leading-6 font-medium outline-none transition-colors md:h-[120px] ' +
                      (reasonError ? 'border-status-red-50 bg-status-red-5' : 'border-gray-300')
                    }
                  />
                  {reasonError && <FieldError>{reasonError}</FieldError>}
                  {previousReason && !reasonError && (
                    <span className="text-cool-neutral-40 px-2 text-xs leading-4">
                      이전 반려 사유: {previousReason}
                    </span>
                  )}
                </div>
              </Field>

              {actionError && (
                <p role="alert" className="text-status-red-50 mt-3 px-1 text-sm leading-5">
                  {actionError}
                </p>
              )}

              <div className="mt-6 flex w-full items-center justify-between md:mt-10 md:px-20">
                <button
                  type="button"
                  onClick={approve}
                  disabled={submitting !== null}
                  className="bg-cool-neutral-20 border-line-normal flex h-12 w-[140px] items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:hover:brightness-100 md:w-[158px]"
                >
                  {submitting === 'approve' ? '승인 중…' : '확인 완료'}
                </button>
                <button
                  type="button"
                  onClick={reject}
                  disabled={submitting !== null}
                  className="bg-primary-40 border-line-normal disabled:bg-cool-neutral-20 flex h-12 w-[140px] items-center justify-center rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:hover:brightness-100 md:w-[158px]"
                >
                  {submitting === 'reject' ? '보내는 중…' : '수정 요청'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
