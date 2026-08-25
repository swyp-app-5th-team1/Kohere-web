import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { PagePlaceholder } from '../components/PagePlaceholder'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  /*
   * 화면 시안이 아직 없어서 자리 표시자 아래에 버튼만 두었다.
   *
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
    <div>
      <PagePlaceholder title="프로필" note="계정 정보" />
      <div className="mx-auto max-w-3xl px-6">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="border-line-normal bg-cool-neutral-20 flex h-12 items-center justify-center rounded-2xl border px-6 text-base leading-6 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed"
        >
          {loggingOut ? '로그아웃 중…' : '로그아웃'}
        </button>
      </div>
    </div>
  )
}
