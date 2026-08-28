import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchMyListings,
  myListingsErrorMessage,
  type MyListingEntry,
  type MyListingStatus,
} from '../api/listings'
import { loadUserName } from '../api/tokens'
import { fetchMyProfile } from '../api/users'
import { AppHeader } from '../components/AppHeader'
import { savedDraftSummary } from '../components/listing-new/draft'
import chevronUrl from '../assets/icon-chevron-down.svg'
import plusUrl from '../assets/icon-plus.svg'

/**
 * 상태 배지. 서버가 코드 문자열 그대로 주므로 한글과 색은 여기서 붙인다.
 * 색은 디자이너가 준 원본 값(2026-08-28)이라 토큰 없이 hex 로 둔다.
 */
const STATUS_BADGES: Record<MyListingStatus, { label: string; className: string }> = {
  PUBLISHED: { label: '승인완료', className: 'bg-[#ccfaed] text-[#008b64]' },
  PENDING: { label: '심사대기', className: 'bg-[#e1e2e4] text-[#505050]' },
  REJECTED: { label: '반려', className: 'bg-[#feece9] text-[#c60e21]' },
  UPDATE_PENDING: { label: '수정신청', className: 'bg-[#e8f1fd] text-[#165abd]' },
}

/** 작성 중 카드의 배지. 심사대기와 같은 회색 계열을 쓴다. */
const DRAFT_BADGE = { label: '작성 중', className: 'bg-[#e1e2e4] text-[#505050]' }

/** 작성 중 카드의 부제. draft.step 은 「다음에 이어서 쓸 단계」라 하나 앞이 마친 단계다. */
const STEP_NAMES = [
  '공간 유형',
  '지점 정보',
  '건물 정보',
  '입주 조건',
  '편의 시설',
  '방 타입',
  '추가 질문',
  '연락처',
  '검토',
]

function draftSubtitle(step: number): string {
  const done = Math.min(step, STEP_NAMES.length) - 1
  return done >= 0 ? `${STEP_NAMES[done]}까지 입력됨` : '작성 중'
}

/*
 * 카드 치수는 디자이너 확인값(2026-08-28)이다.
 * 안쪽 여백 좌우 16 · 상하 12(썸네일이 경계에서 12), 요소 사이 16.
 * hover 는 시안 둘째 카드처럼 배경만 남고 테두리가 사라진다.
 */
const cardClass =
  'border-line-normal flex w-full items-center gap-4 rounded-2xl border bg-white px-4 py-3 ' +
  'transition-colors hover:border-transparent hover:bg-cool-neutral-5'

function CardThumbnail({ url }: { url: string | null }) {
  return (
    <span className="bg-cool-neutral-7 block h-[72px] w-[100px] shrink-0 overflow-hidden rounded-xl">
      {/* 만료됐거나 없는 사진은 회색 바탕만 남긴다. */}
      {url && (
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      )}
    </span>
  )
}

function CardBody({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle: string
  badge: { label: string; className: string }
}) {
  return (
    <>
      {/* 부제는 제목에서 8, 카드 하단에서 24 — 상하 12 여백과 합치면 시안 높이(96)가 나온다. */}
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-cool-neutral-80 truncate text-[20px] leading-6 font-semibold">
          {title}
        </span>
        <span className="text-cool-neutral-30 truncate text-base leading-6">{subtitle}</span>
      </span>
      {/* 배지는 64×24 고정. */}
      <span
        className={
          'flex h-6 w-16 shrink-0 items-center justify-center rounded-md text-sm leading-5 font-medium ' +
          badge.className
        }
      >
        {badge.label}
      </span>
      {/* TODO(에셋 대기): 시안 전용 화살표 svg 를 받으면 교체한다. 지금은 chevron 회전. */}
      <img src={chevronUrl} alt="" className="size-4 shrink-0 -rotate-90" />
    </>
  )
}

/** 임대인 「내 매물」 목록. 정렬은 서버가 최근 수정순으로 고정한다. */
export default function ListingsPage() {
  const [entries, setEntries] = useState<MyListingEntry[] | null>(null)
  const [total, setTotal] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 등록 화면이 남긴 임시 저장. 서버 목록과 별개로 맨 위에 「작성 중」 카드로 얹는다.
  const [draft] = useState(savedDraftSummary)

  /*
   * 인사말 이름. 캐시(로그인 때 저장한 값)를 먼저 보여 주고 프로필 API 로 맞춘다 —
   * 이름이 바뀌었거나 캐시가 생기기 전에 로그인해 둔 세션을 위해서다.
   * 인사말일 뿐이라 프로필 조회가 실패해도 아무것도 안 한다.
   */
  const [name, setName] = useState(loadUserName)
  useEffect(() => {
    fetchMyProfile()
      .then((me) => setName(me.name))
      .catch(() => {})
  }, [])

  const load = () => {
    setError(null)
    fetchMyListings()
      .then((result) => {
        setEntries(result.content)
        setTotal(result.page.totalElements)
        setTruncated(result.page.hasNext)
      })
      .catch((cause: unknown) => setError(myListingsErrorMessage(cause)))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const empty = entries !== null && entries.length === 0 && draft === null

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader />

      {error !== null && (
        <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-6">
          <p className="text-cool-neutral-30 text-base leading-6">{error}</p>
          <button
            type="button"
            onClick={load}
            className="bg-label-normal h-12 cursor-pointer rounded-xl px-6 text-base leading-6 font-semibold text-white transition hover:opacity-90"
          >
            다시 시도
          </button>
        </main>
      )}

      {/* 시안의 빈 상태 — 등록한 매물도 작성 중인 것도 없을 때만. */}
      {error === null && empty && (
        <main className="flex w-full flex-1 flex-col items-center justify-center gap-10 px-6">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[32px] leading-10 font-bold text-[#242424]">
              첫 매물을 등록해 보세요
            </h1>
            <p className="text-cool-neutral-30 text-base leading-6">
              등록하신 매물은 검토 후 Kohere 앱에 노출됩니다.
            </p>
          </div>
          <Link
            to="/listings/new"
            className="bg-primary-40 flex h-12 w-[380px] max-w-full items-center justify-center rounded-xl text-base leading-6 font-semibold text-white transition hover:brightness-95"
          >
            매물 등록 시작하기
          </Link>
        </main>
      )}

      {error === null && entries !== null && !empty && (
        /* 본문 폭 884, 바깥 여백 양옆 48 · 아래 56 (디자이너 확인값 2026-08-28). */
        <main className="flex w-full flex-1 flex-col items-center px-12 py-14">
          <div className="flex w-full max-w-[884px] flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-[32px] leading-10 font-bold text-[#242424]">
                {name ? `${name}님, 안녕하세요` : '안녕하세요'}
              </h1>
              <p className="text-neutral-70 text-lg leading-6">
                등록하신 매물 {total}건을 관리 중입니다.
              </p>
            </div>

            <div className="flex w-full flex-col gap-[25px]">
              {/* 작성 중인 매물. 누르면 등록 화면이 임시 저장을 이어서 연다. */}
              {draft !== null && (
                <Link to="/listings/new" className={cardClass}>
                  <CardThumbnail url={draft.photoUrl} />
                  <CardBody
                    title={draft.title}
                    subtitle={draftSubtitle(draft.step)}
                    badge={DRAFT_BADGE}
                  />
                </Link>
              )}

              {entries.map(({ listing }) => (
                <Link
                  key={listing.listingId}
                  to={`/listings/${listing.listingId}`}
                  className={cardClass}
                >
                  <CardThumbnail url={listing.imageUrls[0] ?? null} />
                  <CardBody
                    title={listing.title}
                    subtitle={listing.type.label}
                    badge={STATUS_BADGES[listing.status]}
                  />
                </Link>
              ))}

              <Link
                to="/listings/new"
                className="bg-secondary-5 border-cool-neutral-8 flex w-full items-center justify-center gap-3 rounded-3xl border-[1.5px] px-6 py-5 transition-colors hover:brightness-98"
              >
                <img src={plusUrl} alt="" className="size-6" />
                <span className="text-neutral-70 text-[20px] leading-6 font-semibold">
                  신규 매물 등록하기
                </span>
              </Link>

              {/* 100건을 넘긴 계정만 본다. 페이지 UI 는 시안에 없어 안내만 한다. */}
              {truncated && (
                <p className="text-cool-neutral-30 text-center text-sm leading-5">
                  최근 수정한 100건까지 보여드리고 있습니다.
                </p>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
