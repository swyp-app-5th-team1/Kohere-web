import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { loadUserName } from '../api/tokens'
import { fetchMyProfile, type MyProfile } from '../api/users'
import { AppHeader } from '../components/AppHeader'
import { formatPhone } from '../components/form/formatters'

function ChevronRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 fill-current">
      <path d="M5.242 2.242a.6.6 0 0 0 0 .849L10.151 8l-4.909 4.909a.6.6 0 1 0 .849.848l5.333-5.333a.6.6 0 0 0 0-.849L6.091 2.242a.6.6 0 0 0-.849 0Z" />
    </svg>
  )
}

function maskedPhone(value: string): string {
  const trimmed = value.trim()
  // 내 정보 조회는 `010-****-5678`처럼 일부를 가려서 주므로 그 표기를 훼손하지 않는다.
  if (trimmed.includes('*')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  const korean = digits.startsWith('82') ? `0${digits.slice(2)}` : digits
  const formatted = formatPhone(korean)
  const groups = formatted.split('-')

  if (groups.length === 3) {
    return `${groups[0]}-${'*'.repeat(groups[1].length)}-${groups[2]}`
  }

  return formatted
}

type AccountRowProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
}

function AccountRow({ label, onClick, disabled = false }: AccountRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-neutral-5 border-neutral-10 text-cool-neutral-50 flex h-14 w-full items-center justify-between rounded-2xl border px-4 text-left text-xl leading-6 font-semibold transition hover:brightness-98 disabled:cursor-not-allowed"
    >
      <span>{label}</span>
      <span className="text-cool-neutral-20">
        <ChevronRight />
      </span>
    </button>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const cachedName = loadUserName()

  useEffect(() => {
    fetchMyProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  /*
   * logout 은 실패해도 로컬 토큰을 지우고 끝나므로(auth.ts 참고) 결과를 보지 않고
   * 곧바로 로그인 화면으로 보낸다. 서버가 access 토큰을 무효화하지 않는 구조라
   * 로컬을 지우는 것이 실제 로그아웃이다.
   */
  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1028px] px-6 pt-20 pb-20">
        <div className="flex h-[100px] items-center">
          <h1 className="text-[32px] leading-10 font-bold text-[#242424]">마이페이지</h1>
        </div>

        <section
          aria-label="내 정보"
          className="bg-secondary-5 border-neutral-30 mt-8 flex h-[104px] w-full items-center justify-between rounded-2xl border px-6 py-6"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <strong className="text-cool-neutral-80 truncate text-xl leading-6 font-semibold">
              {profile?.name ?? cachedName ?? '-'}
            </strong>
            <span className="text-cool-neutral-50 truncate text-lg leading-6 font-semibold">
              {profile?.phoneNumber ? maskedPhone(profile.phoneNumber) : '-'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile/edit')}
            className="bg-cool-neutral-5 border-label-strong text-cool-neutral-50 ml-6 flex h-8 shrink-0 items-center justify-center rounded-full border px-4 text-sm leading-5 font-medium"
          >
            수정하기
          </button>
        </section>

        <section className="mt-[70px]">
          <h2 className="text-cool-neutral-75 text-2xl leading-8 font-bold">계정관리</h2>

          <div className="mt-5 flex w-full flex-col gap-3">
            <AccountRow
              label="비밀번호 변경"
              onClick={() => navigate('/find-account?tab=password&source=profile')}
            />
            <AccountRow
              label={loggingOut ? '로그아웃 중…' : '로그아웃'}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
