import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isLockedByThisAttempt, login, loginAttempts, loginErrorMessage } from '../api/auth'
import type { LoginAttempts } from '../api/auth'
import { ApiError } from '../api/client'
import { KohereLogo } from '../components/KohereLogo'
import { AccountLockedDialog, LoginFailedDialog } from '../components/LoginDialogs'
import { inputClass } from '../components/form/Field'
import eyeHiddenUrl from '../assets/icon-eye-hidden.png'

type LocationState = { from?: { pathname?: string } }

/** 시안에 팝업이 있는 실패만 따로 띄우고, 나머지는 입력칸 아래 문구로 알린다. */
type Dialog = 'failed' | 'locked' | null

const fieldClass = `${inputClass} font-semibold`

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [passwordShown, setPasswordShown] = useState(false)
  /** 401 에 실려 온 실패 횟수. 팝업 문구의 숫자로만 쓴다. */
  const [attempts, setAttempts] = useState<LoginAttempts | null>(null)

  // 시안의 로그인 버튼은 회색(비활성) 상태로 그려져 있다. 두 칸이 모두 채워지면 활성화한다.
  const canSubmit = email.trim() !== '' && password !== '' && !submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage(null)
    setDialog(null)

    try {
      const result = await login(email, password)

      // 웹 로그인은 서버가 onboardingRequired 를 항상 false 로 준다. 나중에 온보딩 재개가
      // 생겨도 화면을 고치지 않도록 분기는 남겨 둔다.
      if (result.onboardingRequired) {
        navigate('/onboarding', { replace: true })
        return
      }

      // 로그인 가드에 걸려서 왔다면 원래 가려던 곳으로 돌려보낸다.
      const from = (location.state as LocationState | null)?.from?.pathname
      navigate(from ?? '/listings', { replace: true })
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null
      setAttempts(loginAttempts(error))

      /*
       * 잠금과 자격증명 오류는 시안에 팝업이 있다. 입력값 오류 · 시도 초과는 문구로만 알린다.
       *
       * 마지막 실패는 상태 코드가 아직 401 이라 code 만 보면 놓친다 — 실패 횟수가 상한에
       * 닿았으면 그 응답이 곧 잠금이므로 잠금 팝업으로 보낸다.
       */
      if (code === 'AUTH_ACCOUNT_LOCKED' || isLockedByThisAttempt(error)) setDialog('locked')
      else if (code === 'AUTH_INVALID_CREDENTIALS') setDialog('failed')
      else setErrorMessage(loginErrorMessage(error))
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
            {/* 시안(224:30111)에 눈 아이콘이 생겼다. 아이콘은 칸 안 오른쪽 끝에 붙는다. */}
            <div className="relative w-full">
              <input
                type={passwordShown ? 'text' : 'password'}
                required
                autoComplete="current-password"
                aria-label="비밀번호"
                placeholder="비밀번호"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setPasswordShown((shown) => !shown)}
                aria-label={passwordShown ? '비밀번호 숨기기' : '비밀번호 표시'}
                aria-pressed={passwordShown}
                className="absolute top-1/2 right-3.5 flex size-8 -translate-y-1/2 items-center justify-center"
              >
                {/*
                 * 시안에 감은 눈 아이콘 하나만 있어서, 보이는 동안은 흐리게 해서 상태를 구분한다.
                 * 뜬 눈 아이콘을 받으면 이 자리를 그걸로 바꾼다.
                 */}
                <img
                  src={eyeHiddenUrl}
                  alt=""
                  className={'size-5 ' + (passwordShown ? 'opacity-40' : '')}
                />
              </button>
            </div>
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

      <LoginFailedDialog
        open={dialog === 'failed'}
        onClose={() => setDialog(null)}
        failedCount={attempts?.failed}
        maxCount={attempts?.max}
      />

      {/* 열릴 때 붙여야 안에 있는 이메일 칸이 지금 입력값으로 채워진다. 계속 붙여 두면
          맨 처음 마운트될 때의 빈 값이 그대로 남는다. */}
      {dialog === 'locked' && (
        <AccountLockedDialog
          open
          onClose={() => setDialog(null)}
          defaultEmail={email}
          maxCount={attempts?.max}
        />
      )}
    </div>
  )
}
