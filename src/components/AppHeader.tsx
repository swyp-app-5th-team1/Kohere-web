import { useState } from 'react'
import { Link } from 'react-router-dom'
import markUrl from '../assets/kohere-mark.svg'
import menuUrl from '../assets/icon-menu.svg'
import bellUrl from '../assets/icon-bell-fill.svg'
import { SideMenu } from './SideMenu'

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

/**
 * 로그인 후 화면 공통 헤더 (햄버거 메뉴 · 로고 · 알림).
 * 알림은 화면만 잡아둔 상태라 동작이 없다.
 */
export function AppHeader({ variant = 'default', onMobileSearch }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const admin = variant === 'admin'

  return (
    <>
      <header className="relative z-40 flex h-[100px] w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 md:px-20">
        <div className="flex items-center">
          <button
            type="button"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
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

        {admin && (
          <div className="text-label-normal flex items-center md:hidden">
            <button
              type="button"
              aria-label="매물 검색"
              onClick={onMobileSearch}
              className="flex size-12 items-center justify-center"
            >
              <SearchIcon />
            </button>
            <button type="button" aria-label="알림" className="flex size-12 items-center justify-center">
              <img src={bellUrl} alt="" className="size-6" />
            </button>
            <Link to="/profile" aria-label="마이페이지" className="flex size-12 items-center justify-center">
              <ProfileIcon />
            </Link>
          </div>
        )}

        <button
          type="button"
          aria-label="알림"
          className={(admin ? 'hidden md:flex ' : 'flex ') + 'size-12 items-center justify-center'}
        >
          <img src={bellUrl} alt="" className="size-6" />
        </button>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
