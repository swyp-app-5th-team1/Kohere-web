import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchMyProfile } from '../api/users'

type SideMenuProps = {
  open: boolean
  onClose: () => void
}

function AddListingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8.5v7M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.5v-1.25c0-3.04 2.46-5.5 5.5-5.5h2c3.04 0 5.5 2.46 5.5 5.5v1.25h-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AdminIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none">
      <path
        d="M9.55 3.4 10 2h4l.45 1.4c.13.4.5.67.92.67.18 0 .36-.05.52-.15l1.3-.72 2.82 2.82-.72 1.3a.97.97 0 0 0 .52 1.4l1.4.45v4l-1.4.45a.97.97 0 0 0-.52 1.4l.72 1.3-2.82 2.82-1.3-.72a.97.97 0 0 0-1.44.52L14 20.4h-4l-.45-1.4a.97.97 0 0 0-1.44-.52l-1.3.72-2.82-2.82.72-1.3a.97.97 0 0 0-.52-1.4l-1.4-.45v-4l1.4-.45a.97.97 0 0 0 .52-1.4l-.72-1.3L6.81 3.2l1.3.72a.97.97 0 0 0 1.44-.52Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.2" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const menuItems = [
  {
    label: '신규매물등록',
    to: '/listings/new',
    selected: (pathname: string) => pathname.startsWith('/listings/new'),
    icon: AddListingIcon,
  },
  {
    label: '마이페이지',
    to: '/profile',
    selected: (pathname: string) => pathname.startsWith('/profile'),
    icon: ProfileIcon,
  },
] as const

/** 헤더는 남겨 두고 그 아래 본문 위로 열리는 공통 사이드 메뉴. */
export function SideMenu({ open, onClose }: SideMenuProps) {
  const { pathname } = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true

    fetchMyProfile()
      .then((profile) => {
        if (active) setIsAdmin(profile.userType === 'ADMIN')
      })
      // 조회에 실패했을 때는 권한 메뉴를 노출하지 않는다.
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    <div
      aria-hidden={!open}
      className={
        'fixed inset-x-0 top-[100px] bottom-0 z-30 ' +
        (open ? 'pointer-events-auto' : 'pointer-events-none')
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        aria-label="주요 메뉴"
        inert={!open}
        className={
          'flex h-full w-[306px] flex-col overflow-y-auto bg-white pt-12 pb-8 shadow-[4px_0_16px_rgba(23,23,25,0.12)] ' +
          'transition-transform duration-300 ease-out motion-reduce:transition-none ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <nav className="ml-20 flex w-[210px] flex-col gap-4">
          {menuItems.map((item) => {
            const active = item.selected(pathname)
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={
                  'relative flex h-12 w-full items-center gap-3 pl-4 text-lg leading-6 font-semibold ' +
                  (active ? 'text-primary-40' : 'text-cool-neutral-40')
                }
              >
                {active && (
                  <span aria-hidden="true" className="bg-primary-40 absolute inset-y-0 left-0 w-1" />
                )}
                <Icon />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {isAdmin && (
          <nav className="mt-auto ml-20 w-[210px]">
            <Link
              to="/admin"
              onClick={onClose}
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              className="text-primary-40 flex h-12 w-full items-center gap-3 pl-4 text-lg leading-6 font-semibold"
            >
              <AdminIcon />
              <span>관리자 페이지</span>
            </Link>
          </nav>
        )}
      </aside>
    </div>
  )
}
