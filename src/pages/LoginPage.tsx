import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { ApiError } from '../api/client'
import { KohereLogo } from '../components/KohereLogo'
import { inputClass } from '../components/form/Field'

type LocationState = { from?: { pathname?: string } }

const fieldClass = `${inputClass} font-semibold`

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 시안의 로그인 버튼은 회색(비활성) 상태로 그려져 있다. 두 칸이 모두 채워지면 활성화한다.
  const canSubmit = email.trim() !== '' && password !== '' && !submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await login(email, password)

      // 온보딩(사업자번호 · 휴대폰 인증)을 마치지 않았으면 먼저 그쪽으로 보낸다.
      if (result.onboardingRequired) {
        navigate('/onboarding', { replace: true })
        return
      }

      // 로그인 가드에 걸려서 왔다면 원래 가려던 곳으로 돌려보낸다.
      const from = (location.state as LocationState | null)?.from?.pathname
      navigate(from ?? '/listings', { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-[423px] flex-col items-center gap-[59px]">
        <KohereLogo />

        <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-8">
          <div className="flex w-full flex-col gap-4">
            <input
              type="email"
              required
              autoComplete="email"
              aria-label="이메일"
              placeholder="이메일"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              aria-label="비밀번호"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="w-full text-center text-sm leading-5 text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="flex w-full flex-col items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={
                'border-line-alternative flex h-12 w-full items-center justify-center rounded-2xl ' +
                'border px-3 text-base leading-6 font-semibold text-white transition-colors ' +
                // 활성 색은 회원가입 시안의 '가입하기' CTA(Primary/40)와 맞췄다. 로그인 시안엔 비활성만 있다.
                (canSubmit
                  ? 'bg-primary-40 hover:brightness-95'
                  : 'bg-cool-neutral-20 cursor-not-allowed')
              }
            >
              {submitting ? '로그인 중…' : '로그인하기'}
            </button>

            <div className="text-label-alternative flex w-full items-center justify-center gap-[38px] px-[15px] py-3 text-base leading-6 font-semibold">
              <Link to="/signup" className="flex-1 text-right">
                회원가입하기
              </Link>
              <Link to="/find-account" className="flex-1">
                ID/PW 찾기
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
