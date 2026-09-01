import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  PHONE_CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  sendCodeErrorMessage,
  sendProfilePhoneCode,
  verifyPhoneErrorMessage,
  verifyProfilePhoneCode,
} from '../api/phone'
import {
  fetchMyProfile,
  updateMyPhoneErrorMessage,
  updateMyPhoneNumber,
  type MyProfile,
} from '../api/users'
import { AppHeader } from '../components/AppHeader'
import { LoadingIndicator } from '../components/LoadingIndicator'
import { FieldError, inputClass } from '../components/form/Field'
import { FormattedInput } from '../components/form/FormattedInput'
import { formatPhone } from '../components/form/formatters'
import { formatSeconds, useCountdown } from '../hooks/useCountdown'

const fieldClass = `${inputClass} min-w-0 flex-1 font-semibold`
const actionButtonClass =
  'bg-label-normal disabled:bg-cool-neutral-20 flex h-14 w-[158px] shrink-0 items-center ' +
  'justify-center gap-2 rounded-2xl px-3 text-base leading-6 font-semibold text-white transition ' +
  'hover:brightness-125 disabled:cursor-not-allowed disabled:hover:brightness-100'

function editablePhone(value: string | null): string {
  if (!value) return ''

  // `/users/me`는 `010-****-5678`처럼 마스킹해서 내려준다. 별표를 제거해 불완전한
  // 번호를 입력값으로 만들지 말고, 변경할 새 번호를 사용자가 전부 입력하게 한다.
  if (value.includes('*')) return ''

  const digits = value.replace(/\D/g, '')
  return formatPhone(digits.startsWith('82') ? `0${digits.slice(2)}` : digits)
}

const digitsOnly = (value: string) => value.replace(/\D/g, '')

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [phone, setPhone] = useState('')
  const [originalPhone, setOriginalPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  /** 확인에 성공한 바로 그 번호. 번호가 바뀌면 인증 성공도 함께 무효가 된다. */
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null)
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null)
  const [codeMessage, setCodeMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // React 상태가 다시 그려지기 전의 연속 클릭까지 막는다.
  const sendInFlight = useRef(false)
  const verifyInFlight = useRef(false)
  const saveInFlight = useRef(false)

  const resendIn = useCountdown(resendAt)
  const codeExpiresIn = useCountdown(codeExpiresAt)
  const phoneDigits = digitsOnly(phone)
  const originalDigits = digitsOnly(originalPhone)
  const phoneChanged = phoneDigits !== originalDigits
  const phoneVerified = verifiedPhone === phoneDigits && phoneDigits !== ''

  const canSendCode =
    phoneDigits.length === 11 &&
    phoneChanged &&
    resendIn === 0 &&
    !sendingCode &&
    !verifyingCode &&
    !saving
  const canVerifyCode =
    codeSent &&
    verificationCode.length === PHONE_CODE_LENGTH &&
    codeExpiresIn > 0 &&
    !phoneVerified &&
    !verifyingCode &&
    !sendingCode &&
    !saving
  const canSave = phoneChanged && phoneVerified && !saving

  useEffect(() => {
    const controller = new AbortController()

    fetchMyProfile()
      .then((nextProfile) => {
        if (controller.signal.aborted) return
        const nextPhone = editablePhone(nextProfile.phoneNumber)
        setProfile(nextProfile)
        setPhone(nextPhone)
        setOriginalPhone(nextPhone)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })

    return () => controller.abort()
  }, [])

  function handlePhoneChange(next: string) {
    setPhone(next)
    setVerificationCode('')
    setCodeSent(false)
    setVerifiedPhone(null)
    setCodeExpiresAt(null)
    setPhoneMessage(null)
    setCodeMessage(null)
    setSaveError(null)
  }

  async function handleSendCode() {
    if (!canSendCode || sendInFlight.current) return
    sendInFlight.current = true
    setSendingCode(true)
    setPhoneMessage(null)
    setCodeMessage(null)
    setVerifiedPhone(null)

    try {
      const { expiresIn } = await sendProfilePhoneCode(phone)
      const now = Date.now()
      setCodeSent(true)
      setVerificationCode('')
      setCodeExpiresAt(now + expiresIn * 1000)
      setResendAt(now + RESEND_COOLDOWN_SECONDS * 1000)
      setPhoneMessage('인증번호를 발송했습니다.')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TOO_MANY_REQUESTS') {
        setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
      }
      setPhoneMessage(sendCodeErrorMessage(error))
    } finally {
      sendInFlight.current = false
      setSendingCode(false)
    }
  }

  async function handleVerifyCode() {
    if (!canVerifyCode || verifyInFlight.current) return
    verifyInFlight.current = true
    setVerifyingCode(true)
    setCodeMessage(null)

    try {
      const { verified } = await verifyProfilePhoneCode(phone, verificationCode)
      if (verified) {
        setVerifiedPhone(phoneDigits)
        setCodeMessage('휴대폰 인증이 완료되었습니다.')
      } else {
        setCodeMessage('인증에 실패했습니다.')
      }
    } catch (error) {
      setCodeMessage(verifyPhoneErrorMessage(error))
    } finally {
      verifyInFlight.current = false
      setVerifyingCode(false)
    }
  }

  async function handleSave() {
    if (!canSave || saveInFlight.current) return
    saveInFlight.current = true
    setSaving(true)
    setSaveError(null)

    try {
      await updateMyPhoneNumber(phone)
      navigate('/profile', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_PHONE_NOT_VERIFIED') {
        setVerifiedPhone(null)
      }
      setSaveError(updateMyPhoneErrorMessage(error))
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1028px] px-6 pt-[105px] pb-20">
        <section className="border-neutral-30 w-full rounded-2xl border px-6 py-6">
          {loadError ? (
            <div className="flex min-h-[254px] flex-col items-center justify-center gap-5">
              <p role="alert" className="text-cool-neutral-50 text-lg font-semibold">
                사용자 정보를 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="border-label-strong text-cool-neutral-50 h-8 rounded-full border px-4 text-sm font-medium"
              >
                돌아가기
              </button>
            </div>
          ) : profile === null ? (
            <div className="text-cool-neutral-50 flex min-h-[254px] items-center justify-center gap-2">
              <LoadingIndicator />
              <span className="text-base font-semibold">불러오는 중</span>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-cool-neutral-50 text-lg leading-6 font-semibold">이름</span>
                  <strong className="text-cool-neutral-80 truncate text-xl leading-6 font-semibold">
                    {profile.name ?? '-'}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canSave}
                  className={
                    'bg-cool-neutral-5 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 ' +
                    'text-sm leading-5 font-medium transition-colors disabled:cursor-not-allowed ' +
                    (phoneChanged
                      ? 'border-primary-press text-primary-press'
                      : 'border-label-strong text-label-strong')
                  }
                >
                  {saving && <LoadingIndicator className="size-3.5" />}
                  저장하기
                </button>
              </div>

              <div className="mt-12 flex flex-col gap-3">
                <span className="text-cool-neutral-50 text-lg leading-6 font-semibold">
                  휴대폰 번호 변경하기
                </span>

                <div className="flex w-full items-start gap-5">
                  <FormattedInput
                    autoComplete="tel-national"
                    aria-label="새 휴대폰 번호"
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    format={formatPhone}
                    disabled={phoneVerified || saving}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={!canSendCode}
                    className={actionButtonClass}
                  >
                    {sendingCode && <LoadingIndicator />}
                    {codeSent ? (resendIn > 0 ? `재전송 ${resendIn}초` : '재전송') : '인증번호 받기'}
                  </button>
                </div>

                <div className="flex w-full items-start gap-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={PHONE_CODE_LENGTH}
                    aria-label="인증번호"
                    placeholder={`인증번호 ${PHONE_CODE_LENGTH}자리`}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, ''))
                    }
                    disabled={!codeSent || phoneVerified || saving}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyCode()}
                    disabled={!canVerifyCode}
                    className={actionButtonClass}
                  >
                    {verifyingCode && <LoadingIndicator />}
                    확인
                  </button>
                </div>

                {codeSent && !phoneVerified && (
                  <p className="text-cool-neutral-50 px-2 text-xs leading-4">
                    {codeExpiresIn > 0
                      ? `${phoneMessage ?? '인증번호를 발송했습니다.'} (${formatSeconds(codeExpiresIn)})`
                      : '인증번호 유효시간이 지났습니다. 다시 받아 주세요.'}
                  </p>
                )}
                {!codeSent && phoneMessage && <FieldError>{phoneMessage}</FieldError>}
                {codeMessage && (
                  <p
                    role={phoneVerified ? 'status' : 'alert'}
                    className={
                      'px-2 text-xs leading-4 ' +
                      (phoneVerified ? 'text-cool-neutral-50' : 'text-status-red-50')
                    }
                  >
                    {codeMessage}
                  </p>
                )}
                {saveError && <FieldError>{saveError}</FieldError>}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
