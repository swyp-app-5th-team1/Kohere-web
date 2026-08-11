import { Link } from 'react-router-dom'
import markUrl from '../assets/kohere-mark.svg'
import menuUrl from '../assets/icon-menu.svg'
import bellUrl from '../assets/icon-bell-fill.svg'

/**
 * 로그인 후 화면 공통 헤더 (햄버거 메뉴 · 로고 · 알림).
 * 메뉴와 알림은 화면만 잡아둔 상태라 동작이 없다. 기능이 정해지면 연결한다.
 */
export function AppHeader() {
  return (
    <header className="flex h-[100px] w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 md:px-20">
      <div className="flex items-center">
        <button
          type="button"
          aria-label="메뉴 열기"
          className="flex size-12 items-center justify-center p-2"
        >
          <img src={menuUrl} alt="" className="size-6" />
        </button>

        <Link
          to="/listings"
          className="flex items-center gap-[4.4px] px-[6.4px] py-[2.4px]"
          aria-label="kohere 홈으로"
        >
          <img src={markUrl} alt="" className="h-[29.35px] w-[14.26px] shrink-0" />
          <p
            className="text-primary-50 font-display whitespace-nowrap text-[38.4px] leading-10"
            style={{
              letterSpacing: '-0.16px',
              fontVariationSettings: '"SOFT" 0, "WONK" 1',
            }}
          >
            ko<span className="italic">here</span>
          </p>
        </Link>
      </div>

      <button
        type="button"
        aria-label="알림"
        className="flex size-12 items-center justify-center"
      >
        <img src={bellUrl} alt="" className="size-6" />
      </button>
    </header>
  )
}
