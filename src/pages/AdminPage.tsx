import { useEffect, useMemo, useState } from 'react'
import {
  adminListingsErrorMessage,
  fetchAllAdminListings,
  type AdminListingEntry,
} from '../api/admin'
import type { MyListingStatus } from '../api/listings'
import { AppHeader } from '../components/AppHeader'

type StatusFilter = 'ALL' | MyListingStatus

const STATUS_CARDS: {
  status: MyListingStatus
  title: string
  description: string
}[] = [
  { status: 'PENDING', title: '심사 대기', description: '확인이 필요한 매물' },
  { status: 'UPDATE_PENDING', title: '수정 신청', description: '승인 후 변경된 매물' },
  { status: 'REJECTED', title: '반려', description: '재제출 대기 매물' },
  { status: 'PUBLISHED', title: '승인 완료', description: '현재 노출 중인 매물' },
]

const TABS: { status: StatusFilter; label: string }[] = [
  { status: 'ALL', label: '전체' },
  { status: 'PENDING', label: '심사대기' },
  { status: 'PUBLISHED', label: '승인완료' },
  { status: 'UPDATE_PENDING', label: '수정매물' },
  { status: 'REJECTED', label: '반려매물' },
]

const STATUS_BADGES: Record<MyListingStatus, { label: string; className: string }> = {
  PENDING: { label: '심사대기', className: 'bg-[#e1e2e4] text-[#505050]' },
  PUBLISHED: { label: '승인완료', className: 'bg-[#ccfaed] text-[#008b64]' },
  UPDATE_PENDING: { label: '수정신청', className: 'bg-[#e8f1fd] text-[#165abd]' },
  REJECTED: { label: '반려', className: 'bg-[#feece9] text-[#c60e21]' },
}

function registeredDate(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : '-'
}

function ReviewChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 fill-none">
      <path
        d="m6 3.5 4.5 4.5L6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReviewCard({ entry }: { entry: AdminListingEntry }) {
  const { listing } = entry
  const badge = STATUS_BADGES[listing.status]

  return (
    <article className="border-line-normal flex w-full flex-col rounded-2xl border bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-neutral-70 truncate text-lg leading-6 font-semibold">
            {listing.title}
          </h2>
          <p className="text-cool-neutral-30 mt-1 truncate text-base leading-6 font-medium">
            {listing.type.label} · {registeredDate(listing.createdAt)} 등록
          </p>
        </div>
        <span
          className={`flex h-6 w-16 shrink-0 items-center justify-center rounded-[4px] px-3 py-0.5 text-sm leading-5 font-medium whitespace-nowrap ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="border-cool-neutral-8 mt-2.5 flex items-end justify-between gap-4 border-t pt-2.5">
        {/* 관리자 목록 응답에는 landlordId만 있고 등록자 이름은 아직 없다. */}
        <p className="text-cool-neutral-30 truncate text-base leading-6 font-medium">등록자: -</p>
        <span
          aria-label="심사 상세 화면 준비 중"
          className="text-primary-40 flex shrink-0 items-center text-base leading-6 font-normal"
        >
          검토하기
          <ReviewChevronIcon />
        </span>
      </div>
    </article>
  )
}

export default function AdminPage() {
  const [entries, setEntries] = useState<AdminListingEntry[] | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL')
  const [query, setQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    setEntries(null)

    fetchAllAdminListings(controller.signal)
      .then(setEntries)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(adminListingsErrorMessage(cause))
      })

    return () => controller.abort()
  }, [reloadKey])

  const counts = useMemo(() => {
    const result: Record<MyListingStatus, number> = {
      PENDING: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      UPDATE_PENDING: 0,
    }
    entries?.forEach((entry) => {
      result[entry.listing.status] += 1
    })
    return result
  }, [entries])

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return (entries ?? []).filter((entry) => {
      const statusMatches =
        selectedStatus === 'ALL' || entry.listing.status === selectedStatus
      const queryMatches =
        normalizedQuery.length === 0 ||
        entry.listing.title.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      return statusMatches && queryMatches
    })
  }, [entries, query, selectedStatus])

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader
        variant="admin"
        onMobileSearch={() => setMobileSearchOpen((open) => !open)}
      />

      <main className="flex w-full flex-1 justify-center px-5 pt-4 pb-12 md:px-12 md:pt-12 md:pb-16">
        <div className="flex w-full max-w-[978px] flex-col">
          <h1 className="text-label-normal hidden text-[32px] leading-10 font-bold md:block">
            매물 심사
          </h1>

          {mobileSearchOpen && (
            <label className="border-line-normal mb-4 flex h-12 items-center rounded-2xl border px-4 md:hidden">
              <span className="sr-only">매물명으로 검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="매물명으로 검색"
                className="text-label-normal placeholder:text-cool-neutral-20 w-full bg-transparent text-base outline-none"
              />
            </label>
          )}

          <section
            aria-label="상태별 매물 수"
            className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-[repeat(4,226.5px)] md:justify-between md:gap-0 md:overflow-visible md:px-0 md:pb-0"
          >
            {STATUS_CARDS.map((card) => (
              <button
                key={card.status}
                type="button"
                onClick={() => setSelectedStatus(card.status)}
                aria-pressed={selectedStatus === card.status}
                className="bg-primary-5 flex h-[132px] w-[160px] shrink-0 snap-start flex-col items-start justify-between rounded-2xl px-5 py-4 text-left transition hover:brightness-98 md:h-36 md:w-[226.5px] md:justify-start md:gap-5"
              >
                <span className="text-primary-40 text-lg leading-6 font-semibold">
                  {card.title}
                </span>
                <strong className="text-[#242424] text-[28px] leading-6 font-bold md:text-[32px]">
                  {counts[card.status]}
                </strong>
                <span className="text-neutral-70 whitespace-nowrap text-sm leading-5 font-semibold md:text-lg md:leading-6">
                  {card.description}
                </span>
              </button>
            ))}
          </section>

          <div className="mt-4 flex items-end justify-between gap-6 border-b border-gray-200 md:mt-10 md:border-0">
            <div className="flex min-w-0 flex-1 gap-0 overflow-x-auto md:pl-2">
              {TABS.map((tab) => {
                const selected = selectedStatus === tab.status
                return (
                  <button
                    key={tab.status}
                    type="button"
                    onClick={() => setSelectedStatus(tab.status)}
                    aria-pressed={selected}
                    className={`h-10 w-[92px] shrink-0 border-b-[3px] text-lg leading-6 transition ${
                      selected
                        ? 'border-primary-50 text-[#242424] font-semibold'
                        : 'text-neutral-50 border-transparent font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <label className="border-line-normal hidden h-12 w-[374px] shrink-0 items-center rounded-2xl border px-4 md:flex">
              <span className="sr-only">매물명으로 검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="매물명으로 검색"
                className="text-label-normal placeholder:text-cool-neutral-20 w-full bg-transparent text-base outline-none"
              />
            </label>
          </div>

          {error !== null && (
            <section className="flex min-h-[320px] flex-col items-center justify-center gap-6">
              <p className="text-cool-neutral-30 text-center text-base leading-6">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="bg-label-normal h-12 rounded-2xl px-6 text-base font-semibold text-white"
              >
                다시 시도
              </button>
            </section>
          )}

          {error === null && entries === null && (
            <p className="text-cool-neutral-30 flex min-h-[320px] items-center justify-center text-base">
              심사 목록을 불러오는 중입니다.
            </p>
          )}

          {error === null && entries !== null && (
            <section
              aria-live="polite"
              className="mt-7 flex flex-col gap-4 md:px-5"
            >
              {visibleEntries.map((entry) => (
                <ReviewCard key={entry.listing.listingId} entry={entry} />
              ))}

              {visibleEntries.length === 0 && (
                <p className="text-cool-neutral-30 flex min-h-[240px] items-center justify-center text-base leading-6">
                  조건에 맞는 매물이 없습니다.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
