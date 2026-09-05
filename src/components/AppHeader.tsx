import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import markUrl from '../assets/kohere-mark.svg'
import menuUrl from '../assets/icon-menu.svg'
import bellUrl from '../assets/icon-bell-fill.svg'
import { SideMenu } from './SideMenu'
import { NotificationPanel, type AppNotification } from './NotificationPanel'

type AppHeaderProps = {
  /** 관리자 모바일 시안은 햄버거 대신 검색·알림·프로필을 노출한다. */
  variant?: 'default' | 'admin'
  onMobileSearch?: () => void
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none">
      <circle cx="10.75" cy="10.75" r="6.75" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 20v-1.5A5.5 5.5 0 0 1 11 13h2a5.5 5.5 0 0 1 5.5 5.5V20h-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 로그인 후 화면 공통 헤더 (햄버거 메뉴 · 로고 · 알림). */
export function AppHeader({ variant = 'default', onMobileSearch }: AppHeaderProps) {
  const [openPanel, setOpenPanel] = useState<'menu' | 'notifications' | null>(null)
  // 알림 수신 API가 준비되기 전까지 실제 화면은 빈 목록을 보여 준다.
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const notificationTriggerRef = useRef<HTMLButtonElement>(null)
  const notificationPanelId = useId()
  const closeNotifications = useCallback(() => setOpenPanel(null), [])
  const menuOpen = openPanel === 'menu'
  const notificationsOpen = openPanel === 'notifications'
  const hasUnread = notifications.some((notification) => !notification.isRead)
  const admin = variant === 'admin'

  return (
    <>
      <header className="relative z-40 flex h-[100px] w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 md:px-20">
        <div className="flex items-center">
          <button
            type="button"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            onClick={() => setOpenPanel((open) => (open === 'menu' ? null : 'menu'))}
            className={(admin ? 'hidden md:flex ' : 'flex ') + 'size-12 items-center justify-center p-2'}
          >
            <img src={menuUrl} alt="" className="size-6" />
          </button>

          <Link
            to={admin ? '/admin' : '/listings'}
            className={
              'flex items-center py-[2.4px] ' +
              (admin ? 'gap-[3px] px-0 md:gap-[4.4px] md:px-[6.4px]' : 'gap-[4.4px] px-[6.4px]')
            }
            aria-label="kohere 홈으로"
          >
            <img
              src={markUrl}
              alt=""
              className={
                admin
                  ? 'h-[20px] w-[9.72px] shrink-0 md:h-[29.35px] md:w-[14.26px]'
                  : 'h-[29.35px] w-[14.26px] shrink-0'
              }
            />
            <p
              className={
                'text-primary-50 font-display whitespace-nowrap ' +
                (admin ? 'text-[25px] leading-7 md:text-[38.4px] md:leading-10' : 'text-[38.4px] leading-10')
              }
              style={{
                letterSpacing: '-0.16px',
                fontVariationSettings: '"SOFT" 0, "WONK" 1',
              }}
            >
              ko<span className="italic">here</span>
            </p>
          </Link>
        </div>

        <div className="text-label-normal flex items-center">
          {admin && (
            <button
              type="button"
              aria-label="매물 검색"
              onClick={onMobileSearch}
              className="flex size-12 items-center justify-center md:hidden"
            >
              <SearchIcon />
            </button>
          )}

          <div className="md:relative">
            <button
              ref={notificationTriggerRef}
              type="button"
              aria-label={hasUnread ? '알림, 읽지 않은 알림 있음' : '알림'}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              aria-controls={notificationsOpen ? notificationPanelId : undefined}
              onClick={() => setOpenPanel((open) => (open === 'notifications' ? null : 'notifications'))}
              className={
                'relative flex size-12 items-center justify-center rounded-full transition-colors hover:bg-cool-neutral-5 focus-visible:outline-2 focus-visible:outline-primary-50 ' +
                (notificationsOpen ? 'bg-cool-neutral-5' : '')
              }
            >
              <img src={bellUrl} alt="" className="size-6" />
              {hasUnread && (
                <span aria-hidden="true" className="bg-primary-50 absolute top-2.5 right-2.5 size-2 rounded-full ring-2 ring-white" />
              )}
            </button>

            {notificationsOpen && (
              <NotificationPanel
                id={notificationPanelId}
                notifications={notifications}
                triggerRef={notificationTriggerRef}
                onClose={closeNotifications}
                onRead={(id) => setNotifications((items) =>
                  items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
                )}
                onReadAll={() => setNotifications((items) =>
                  items.map((item) => ({ ...item, isRead: true })),
                )}
              />
            )}
          </div>

          {admin && (
            <Link to="/profile" aria-label="마이페이지" className="flex size-12 items-center justify-center md:hidden">
              <ProfileIcon />
            </Link>
          )}
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setOpenPanel(null)} />
    </>
  )
}
