import { useEffect, useId, useRef, useState, type RefObject } from 'react'

/** 알림 API 연결 전까지 화면에서 사용하는 데이터 형태. */
export type AppNotification = {
  id: string
  category: 'notice' | 'listing'
  title: string
  description: string
  createdAt: string
  isRead: boolean
}

type NotificationPanelProps = {
  id: string
  notifications: readonly AppNotification[]
  triggerRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onRead: (id: string) => void
  onReadAll: () => void
}

const filters = [
  { value: 'all', label: '전체' },
  { value: 'notice', label: '공지' },
  { value: 'listing', label: '매물' },
] as const

type NotificationFilter = (typeof filters)[number]['value']

const emptyMessages: Record<NotificationFilter, { title: string; description: string }> = {
  all: {
    title: '아직 받은 알림이 없어요',
    description: '새로운 공지와 매물 심사 소식을\n이곳에서 확인하실 수 있어요.',
  },
  notice: {
    title: '새로운 공지 알림이 없어요',
    description: 'Kohere의 새로운 소식이 도착하면\n이곳에서 알려드릴게요.',
  },
  listing: {
    title: '아직 매물 알림이 없어요',
    description: '등록하신 매물의 심사 소식이 도착하면\n이곳에서 확인하실 수 있어요.',
  },
}

function BellOutlineIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 fill-none">
      <path
        d="M24 12a8 8 0 0 0-16 0c0 8-3 8-3 10h22c0-2-3-2-3-10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 26a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function timeLabel(createdAt: string, now: Date) {
  const date = new Date(createdAt)
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}일 전`
  return date.toLocaleDateString('ko-KR')
}

function NotificationItem({
  notification,
  now,
  onRead,
}: {
  notification: AppNotification
  now: Date
  onRead: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (!notification.isRead) onRead(notification.id)
        }}
        className={
          'grid w-full grid-cols-[40px_minmax(0,1fr)_12px] items-center gap-x-4 gap-y-1 p-4 text-left transition-colors ' +
          'hover:bg-secondary-10 focus-visible:bg-secondary-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-50 ' +
          (notification.isRead ? 'bg-white' : 'bg-secondary-5')
        }
      >
        <span aria-hidden="true" className="col-start-1 row-span-3 row-start-1 size-10 self-center rounded-full bg-[#ffcec6]" />
        <span className="text-neutral-80 col-start-2 row-start-1 min-w-0 text-base leading-6 font-normal [overflow-wrap:anywhere]">
          {notification.title}
        </span>
        <span className="text-cool-neutral-30 col-start-2 row-start-2 min-w-0 whitespace-pre-line text-sm leading-6 font-normal [overflow-wrap:anywhere]">
          {notification.description}
        </span>
        {/* 본문 두 줄 기준: 24 + 4 + 48 + 4 + 24 + 상하 여백 32 = 136px. */}
        <time dateTime={notification.createdAt} className="text-cool-neutral-30 col-start-2 row-start-3 text-xs leading-6 font-medium">
          {timeLabel(notification.createdAt, now)}
        </time>
        {/* 12px 열의 오른쪽 끝에 배치: 우측 여백 16px, 본문과 점 사이는 20px. 읽어도 열은 유지한다. */}
        <span className="col-start-3 row-start-1 flex w-3 justify-end self-end">
          {!notification.isRead && (
            <>
              <span aria-hidden="true" className="bg-primary-50 size-2 shrink-0 rounded-full" />
              <span className="sr-only">읽지 않음</span>
            </>
          )}
        </span>
      </button>
    </li>
  )
}

/** 헤더의 알림 버튼 아래에 뜨는 패널. 바깥 클릭·ESC·탭 이동으로 닫힌다. */
export function NotificationPanel({
  id,
  notifications,
  triggerRef,
  onClose,
  onRead,
  onReadAll,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })

    const closeOnOutsideInteraction = (event: PointerEvent | FocusEvent) => {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        onClose()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      triggerRef.current?.focus({ preventScroll: true })
    }

    document.addEventListener('pointerdown', closeOnOutsideInteraction)
    document.addEventListener('focusin', closeOnOutsideInteraction)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction)
      document.removeEventListener('focusin', closeOnOutsideInteraction)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, triggerRef])

  const now = new Date()
  const today = now.toDateString()
  const visible = notifications
    .filter((notification) => filter === 'all' || notification.category === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const groups = [
    { label: '오늘', items: visible.filter((item) => new Date(item.createdAt).toDateString() === today) },
    { label: '이전', items: visible.filter((item) => new Date(item.createdAt).toDateString() !== today) },
  ]
  const hasUnread = notifications.some((notification) => !notification.isRead)
  const emptyMessage = emptyMessages[filter]

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      className="absolute top-[calc(100%-8px)] right-4 z-50 flex max-h-[min(640px,calc(100dvh-108px))] w-[calc(100vw-32px)] max-w-[375px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3),0_1px_3px_1px_rgba(0,0,0,0.15)] md:top-[calc(100%+12px)] md:right-0 md:w-[375px]"
    >
      {/* 40px 클릭 영역 안의 24px 닫기 아이콘: 왼쪽 16px, 상하 18px. */}
      <div className="relative flex h-[60px] shrink-0 items-center justify-between px-2">
        <button
          ref={closeRef}
          type="button"
          aria-label="알림 닫기"
          onClick={() => {
            onClose()
            triggerRef.current?.focus({ preventScroll: true })
          }}
          className="text-cool-neutral-80 hover:bg-cool-neutral-5 flex size-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id={titleId} className="text-cool-neutral-80 text-base leading-6 font-semibold">알림</h2>
        <span aria-hidden="true" className="size-10" />
        <span aria-hidden="true" className="bg-gray-200 pointer-events-none absolute inset-x-0 bottom-0 h-px" />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <div role="group" aria-label="알림 종류" className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={
                'h-8 rounded-full px-4 text-xs leading-4 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-50 ' +
                (filter === item.value
                  ? 'bg-primary-50 text-white'
                  : 'bg-cool-neutral-7 text-cool-neutral-50 hover:bg-cool-neutral-8')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!hasUnread}
          onClick={onReadAll}
          className="text-cool-neutral-50 enabled:hover:text-cool-neutral-80 shrink-0 rounded py-1 text-center text-xs leading-4 font-medium focus-visible:outline-2 focus-visible:outline-primary-50 disabled:cursor-default"
        >
          모두 읽음
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        {visible.length === 0 ? (
          <div role="status" className="flex min-h-[292px] flex-col items-center justify-center py-10 text-center">
            <span className="text-cool-neutral-20 mb-6">
              <BellOutlineIcon />
            </span>
            <p className="text-cool-neutral-80 text-base leading-6 font-semibold">{emptyMessage.title}</p>
            <p className="text-cool-neutral-30 mt-3 whitespace-pre-line text-sm leading-6">{emptyMessage.description}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.filter((group) => group.items.length > 0).map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="text-cool-neutral-85 mb-1 text-sm leading-6 font-normal">{group.label}</h3>
                <ul className="relative flex flex-col gap-0 overflow-hidden rounded-[10px] after:pointer-events-none after:absolute after:inset-0 after:rounded-[10px] after:border after:border-cool-neutral-10">
                  {group.items.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} now={now} onRead={onRead} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
