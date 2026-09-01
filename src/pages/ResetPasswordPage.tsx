import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { passwordPolicyError, resetPassword, resetPasswordErrorMessage } from '../api/auth'
import { ApiError } from '../api/client'
import { PasswordResetDoneDialog } from '../components/PasswordResetDoneDialog'
import { FieldError } from '../components/form/Field'
import { PasswordField } from '../components/form/PasswordField'
import { ctaDisabledClass, ctaPrimaryClass, ctaSecondaryClass } from '../components/form/CtaButton'

/**
 * 메일로 받은 재설정 링크를 타고 들어오는 화면 (시안 224:30754 · 224:30789).
 *
 * 링크에 실린 token 이 곧 본인 확인이라, 여기서는 이메일이나 인증번호를 다시 묻지 않는다.
 * 유효시간(30분) · 재사용 여부는 서버가 판단하므로 화면에서 미리 검사하지 않는다.
 *
 * 제출 한 번이 잠금 해제까지 겸한다 — 비밀번호 교체, 잠금 풀기, 실패 카운터 초기화,
 * 기존 세션 전량 무효화가 서버에서 한꺼번에 일어난다. 성공은 204(본문 없음)이고 세션을
 * 열어 주지 않으므로 로그인 화면으로 보낸다.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  /** 링크 형태는 백엔드가 `/reset-password?token=...` 으로 고정했다. */
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** 링크가 만료 · 재사용되어 이 화면으로는 더 진행할 수 없는 상태. */
  const [tokenDead, setTokenDead] = useState(false)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 토큰 없이 들어오면 무엇을 입력해도 400 이다. 헛수고 시키지 않고 미리 막는다.
  const canSubmit = token !== '' && password !== '' && confirm !== '' && !submitting

  const mismatchError = (value: string, against: string) =>
    value !== against ? '비밀번호가 일치하지 않습니다.' : null

  /** 이미 오류가 떠 있는 칸만 입력 도중에 다시 본다. 치는 중에 빨개지지 않게. */
  function revalidate(
    current: string | null,
    next: string | null,
    setter: (message: string | null) => void,
  ) {
    if (current !== null) setter(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const policy = passwordPolicyError(password)
    const mismatch = mismatchError(confirm, password)
    setPasswordError(policy)
    setConfirmError(mismatch)
    if (policy || mismatch) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await resetPassword(token, password)
      // 204 라 화면이 아무 말도 안 하면 성공한 건지 알 수 없다. 팝업으로 한 번 알리고,
      // 닫으면 로그인으로 보낸다 — 재설정 응답은 세션을 열어 주지 않는다.
      setDone(true)
    } catch (error) {
      /*
       * 비밀번호 정책 위반은 어느 칸이 문제인지 서버가 field 로 알려준다. 폼 아래에
       * 모아 두지 말고 그 칸에 붙인다. 이 실패는 토큰을 태우지 않아 곧바로 다시 낼 수 있다.
       */
      const fieldReason =
        error instanceof ApiError
          ? error.fieldErrors.find((item) => item.field === 'newPassword')?.reason
          : undefined

      if (fieldReason) {
        setPasswordError(fieldReason)
      } else {
        setSubmitError(resetPasswordErrorMessage(error))
        // 링크가 죽었으면 이 화면에서 할 수 있는 게 없다. 받으러 갈 길을 같이 띄운다.
        setTokenDead(
          error instanceof ApiError && error.code === 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[426px] flex-col items-center gap-12"
      >
        <div className="flex w-full flex-col items-center gap-4">
          <h1 className="text-cool-neutral-50 w-full text-center text-2xl leading-[1.6] font-bold">
            비밀번호 재설정
          </h1>
          <p className="text-cool-neutral-80 w-full text-center text-lg leading-6">
            8~20자리 이내의 새로운 비밀번호를 설정해 주세요.
          </p>

          {/*
            주소에 token 이 없으면 링크를 타고 온 게 아니다(직접 입력했거나 메일 앱이 주소를
            잘랐거나). 무엇을 치든 실패할 화면이라 미리 알려 준다. 시안에는 없는 상태다.
          */}
          {token === '' && (
            <p role="alert" className="text-status-red-50 w-full text-center text-sm leading-5">
              올바른 재설정 링크로 접속해 주세요. 메일의 버튼을 다시 눌러 주세요.
            </p>
          )}

          <div className="flex w-full flex-col gap-0.5">
            <PasswordField
              required
              autoComplete="new-password"
              aria-label="새 비밀번호"
              placeholder="새 비밀번호(영문, 숫자, 특수문자 8~20자)"
              value={password}
              error={passwordError !== null}
              onChange={(event) => {
                const next = event.target.value
                setPassword(next)
                revalidate(passwordError, passwordPolicyError(next), setPasswordError)
                // 앞 칸을 고치면 확인 칸의 일치 여부도 같이 뒤집힌다.
                revalidate(confirmError, mismatchError(confirm, next), setConfirmError)
              }}
              onBlur={() => setPasswordError(passwordPolicyError(password))}
              className="font-medium"
            />
            {passwordError && <FieldError>{passwordError}</FieldError>}
          </div>

          <div className="flex w-full flex-col gap-0.5">
            <PasswordField
              required
              autoComplete="new-password"
              aria-label="새 비밀번호 확인"
              placeholder="새 비밀번호 확인"
              value={confirm}
              error={confirmError !== null}
              onChange={(event) => {
                const next = event.target.value
                setConfirm(next)
                revalidate(confirmError, mismatchError(next, password), setConfirmError)
              }}
              onBlur={() => setConfirmError(mismatchError(confirm, password))}
              className="font-medium"
            />
            {confirmError && <FieldError>{confirmError}</FieldError>}
          </div>
        </div>

        {submitError && (
          <div className="flex w-full flex-col items-center gap-2">
            <p role="alert" className="w-full text-center text-sm leading-5 text-red-600">
              {submitError}
            </p>
            {tokenDead && (
              <Link to="/find-account" className="text-primary-40 text-sm leading-5 underline">
                재설정 링크 다시 받기
              </Link>
            )}
          </div>
        )}

        {/* 시안의 두 버튼은 폭이 같고 사이가 20px 다. */}
        <div className="flex w-full max-w-[425px] items-start justify-center gap-5">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`${ctaSecondaryClass} flex-1`}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={(canSubmit ? ctaPrimaryClass : ctaDisabledClass) + ' flex-1'}
          >
            {submitting ? '변경 중…' : '변경'}
          </button>
        </div>
      </form>

      <PasswordResetDoneDialog
        open={done}
        onClose={() => navigate('/login', { replace: true })}
      />
    </div>
  )
}
