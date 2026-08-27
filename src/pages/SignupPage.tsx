import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  emailDomainError,
  emailFormatError,
  emailLocalError,
  nameFormatError,
  passwordPolicyError,
  signup,
  signupErrorMessage,
} from '../api/auth'
import { ApiError } from '../api/client'
import {
  EMAIL_CODE_LENGTH,
  EMAIL_RESEND_COOLDOWN_SECONDS,
  sendEmailCodeErrorMessage,
  sendSignupEmailCode,
  verifyEmailErrorMessage,
  verifySignupEmailCode,
} from '../api/email'
import {
  PHONE_CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  sendCodeErrorMessage,
  sendSignupPhoneCode,
  verifyPhoneErrorMessage,
  verifySignupPhoneCode,
} from '../api/phone'
import { formatSeconds, useCountdown } from '../hooks/useCountdown'
import {
  Checkbox,
  Field,
  FieldError,
  inputClass,
  inputErrorClass,
  passwordMaskClass,
} from '../components/form/Field'
import { FormattedInput } from '../components/form/FormattedInput'
import { birthDateToIso, formatBirthDate, formatPhone } from '../components/form/formatters'
import { SignupCompleteDialog } from '../components/SignupCompleteDialog'
import { DOCUMENT_URLS } from '../constants/documents'
import chevronUrl from '../assets/icon-chevron.svg'
import arrowLeftUrl from '../assets/icon-arrow-left.svg'

const fieldClass = `${inputClass} font-medium`
const errorFieldClass = `${inputErrorClass} font-medium`
const passwordFieldClass = `${fieldClass} ${passwordMaskClass}`
const passwordErrorFieldClass = `${errorFieldClass} ${passwordMaskClass}`

/** 화면 검증에서 나온 칸별 오류. 값이 있으면 그 칸이 빨간 테두리가 되고 아래에 문구가 붙는다. */
type FieldKey =
  | 'name'
  | 'birthDate'
  | 'phone'
  | 'email'
  | 'emailDomain'
  | 'password'
  | 'passwordConfirm'
  | 'agreement'

type FieldErrors = Partial<Record<FieldKey, string>>

/** 자주 쓰는 이메일 도메인. '직접입력'을 고르면 텍스트 입력으로 바뀐다. */
const EMAIL_DOMAINS = ['naver.com', 'gmail.com', 'daum.net', 'hanmail.net', 'outlook.com']

export default function SignupPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  /** 화면 표기는 0000.00.00 이고, 보낼 때 0000-00-00 으로 바꾼다. */
  const [birthDateInput, setBirthDateInput] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [emailLocal, setEmailLocal] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [customDomain, setCustomDomain] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  /** 칸마다 그 아래에 붙는 오류. 화면에서 걸러낸 것들이다. */
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  /** 어느 칸 탓인지 특정할 수 없는 서버 오류. 제출 버튼 근처에 한 줄로 띄운다. */
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /*
   * 휴대폰 인증 상태. 앱의 임대인 온보딩(PhoneVerificationStepView)과 같은 구조다 —
   * 전화번호 옆 버튼이 발송·재전송을 겸하고, 인증번호 옆에 확인 버튼이 따로 있다.
   */
  const [codeSent, setCodeSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null)
  const [codeMessage, setCodeMessage] = useState<string | null>(null)

  /** 재발송이 열리는 시각과 인증번호가 만료되는 시각. 둘 다 응답 받은 순간 기준으로 잡는다. */
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null)

  const resendIn = useCountdown(resendAt)
  const codeExpiresIn = useCountdown(codeExpiresAt)

  const phoneDigits = phoneNumber.replace(/\D/g, '')
  const canSendCode =
    phoneDigits.length === 11 && !sendingCode && !phoneVerified && resendIn === 0
  const canVerifyCode =
    codeSent &&
    verificationCode.length === PHONE_CODE_LENGTH &&
    !verifyingCode &&
    !phoneVerified &&
    codeExpiresIn > 0

  /** 번호를 고치면 앞서 받은 인증은 무효다. 재발송 쿨다운은 서버가 번호 기준이라 그대로 둔다. */
  function handlePhoneChange(next: string) {
    setPhoneNumber(next)
    setCodeSent(false)
    setPhoneVerified(false)
    setVerificationCode('')
    setCodeExpiresAt(null)
    setPhoneMessage(null)
    setCodeMessage(null)
  }

  async function handleSendCode() {
    if (!canSendCode) return

    setSendingCode(true)
    setPhoneMessage(null)
    setCodeMessage(null)

    try {
      const { expiresIn } = await sendSignupPhoneCode(phoneNumber)
      const now = Date.now()

      setCodeSent(true)
      setCodeExpiresAt(now + expiresIn * 1000)
      setResendAt(now + RESEND_COOLDOWN_SECONDS * 1000)
      // 번호를 잘못 적어 재발송만 반복하다 시간당 한도를 태우는 걸 줄이려고 함께 안내한다.
      setPhoneMessage('인증번호를 발송했습니다. 문자가 오지 않으면 번호를 확인해 주세요.')
    } catch (error) {
      /*
       * 429 는 세 한도(재발송 60초 · 번호 5회/시간 · IP 20회/시간)를 구분해 주지 않는다.
       * 언제 풀리는지 알 수 없으니 일단 재발송 간격만큼 다시 잠가 연타를 막는다.
       * 시간당 한도에 걸린 경우라면 60초 뒤에도 또 429 지만, 그때는 다시 잠긴다.
       *
       * 502(발송 실패)는 인증번호가 발급되지 않은 것이라 곧바로 다시 눌러야 해서 잠그지 않는다.
       */
      if (error instanceof ApiError && error.code === 'TOO_MANY_REQUESTS') {
        setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
      }

      setPhoneMessage(sendCodeErrorMessage(error))
    } finally {
      setSendingCode(false)
    }
  }

  async function handleVerifyCode() {
    if (!canVerifyCode) return

    setVerifyingCode(true)
    setCodeMessage(null)

    try {
      const { verified } = await verifySignupPhoneCode(phoneNumber, verificationCode)
      setPhoneVerified(verified)
      setCodeMessage(verified ? '인증이 완료되었습니다.' : '인증에 실패했습니다.')
    } catch (error) {
      setCodeMessage(verifyPhoneErrorMessage(error))
    } finally {
      setVerifyingCode(false)
    }
  }

  /*
   * 이메일 인증 상태. 휴대폰 인증과 같은 구조다 — 주소 옆 버튼이 발송·재전송을 겸하고,
   * 인증번호 옆에 확인 버튼이 따로 있다. 연락처 인증과는 서로 순서가 무관하다.
   */
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingEmailCode, setSendingEmailCode] = useState(false)
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [emailSendMessage, setEmailSendMessage] = useState<string | null>(null)
  const [emailCodeMessage, setEmailCodeMessage] = useState<string | null>(null)

  const [emailResendAt, setEmailResendAt] = useState<number | null>(null)
  const [emailCodeExpiresAt, setEmailCodeExpiresAt] = useState<number | null>(null)

  const emailResendIn = useCountdown(emailResendAt)
  const emailCodeExpiresIn = useCountdown(emailCodeExpiresAt)

  const email = `${emailLocal}@${emailDomain}`
  /** 인증 메일이 도착할 수 없는 주소는 발송 전에 거른다 — 서버 규칙과 같다(auth.ts). */
  const emailShapeOk =
    emailLocalError(emailLocal) === null &&
    emailDomainError(emailDomain) === null &&
    emailFormatError(email) === null

  const canSendEmailCode =
    emailShapeOk && !sendingEmailCode && !emailVerified && emailResendIn === 0
  const canVerifyEmailCode =
    emailCodeSent &&
    emailCode.length === EMAIL_CODE_LENGTH &&
    !verifyingEmailCode &&
    !emailVerified &&
    emailCodeExpiresIn > 0

  /**
   * 주소를 고치면 앞서 받은 인증은 무효다. 마커가 주소 기준이라 아이디든 도메인이든
   * 한 글자만 달라져도 다시 받아야 한다. 재발송 쿨다운은 그대로 둔다 — IP 기준 한도가
   * 같이 걸려 있어 주소를 바꿔도 연타는 막는 게 맞다.
   */
  function resetEmailVerification() {
    setEmailCodeSent(false)
    setEmailVerified(false)
    setEmailCode('')
    setEmailCodeExpiresAt(null)
    setEmailSendMessage(null)
    setEmailCodeMessage(null)
  }

  async function handleSendEmailCode() {
    if (!canSendEmailCode) return

    setSendingEmailCode(true)
    setEmailSendMessage(null)
    setEmailCodeMessage(null)

    try {
      const { expiresIn } = await sendSignupEmailCode(email)
      const now = Date.now()

      setEmailCodeSent(true)
      setEmailCodeExpiresAt(now + expiresIn * 1000)
      setEmailResendAt(now + EMAIL_RESEND_COOLDOWN_SECONDS * 1000)
      // 오타로 남의 주소에 보내 놓고 기다리는 걸 줄이려고 주소 확인을 함께 안내한다.
      setEmailSendMessage('인증번호를 발송했습니다. 메일이 오지 않으면 주소를 확인해 주세요.')
    } catch (error) {
      // 휴대폰 발송과 같은 이유로, 429 만 재발송 간격만큼 다시 잠가 연타를 막는다.
      if (error instanceof ApiError && error.code === 'TOO_MANY_REQUESTS') {
        setEmailResendAt(Date.now() + EMAIL_RESEND_COOLDOWN_SECONDS * 1000)
      }

      setEmailSendMessage(sendEmailCodeErrorMessage(error))
    } finally {
      setSendingEmailCode(false)
    }
  }

  async function handleVerifyEmailCode() {
    if (!canVerifyEmailCode) return

    setVerifyingEmailCode(true)
    setEmailCodeMessage(null)

    try {
      const { verified } = await verifySignupEmailCode(email, emailCode)
      setEmailVerified(verified)
      setEmailCodeMessage(verified ? '인증이 완료되었습니다.' : '인증에 실패했습니다.')
    } catch (error) {
      setEmailCodeMessage(verifyEmailErrorMessage(error))
    } finally {
      setVerifyingEmailCode(false)
    }
  }

  /**
   * 칸을 벗어날 때 본다. 치는 도중에 보면 이메일을 한 글자 쳤을 뿐인데 형식이 틀렸다고
   * 혼내게 된다. 다 쓰고 나갈 때 알려주는 게 맞다.
   */
  function checkOnBlur(key: FieldKey, message: string | null) {
    setFieldErrors((prev) => ({ ...prev, [key]: message ?? undefined }))
  }

  /**
   * 이미 오류가 떠 있는 칸만 치는 도중에 다시 본다. 고치는 순간 문구가 사라져야
   * 무엇을 고쳐야 하는지 알 수 있다. 아직 안 틀린 칸은 건드리지 않는다.
   */
  function revalidate(key: FieldKey, message: string | null) {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: message ?? undefined } : prev))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    /*
     * 서버에 보내기 전에 화면에서 걸러낼 수 있는 것들을 본다.
     *
     * 하나 찾고 멈추지 않고 전부 모은다. 한 번에 한 줄씩 알려주면 긴 폼에서는
     * 고치고 누르기를 여러 번 반복하게 된다.
     */
    const found: FieldErrors = {}

    const nameError = nameFormatError(name)
    if (nameError) found.name = nameError

    const birthDate = birthDateToIso(birthDateInput)
    if (!birthDate) {
      found.birthDate = '생년월일을 8자리로 정확히 입력해 주세요.'
      // 서버는 과거 날짜만 받는다. ISO 문자열이라 사전순 비교로 충분하다.
    } else if (birthDate > new Date().toISOString().slice(0, 10)) {
      found.birthDate = '생년월일을 다시 확인해 주세요.'
    }

    // 인증 없이 제출하면 서버가 422 로 막는다. 여기서 먼저 걸러 준다.
    if (!phoneVerified) found.phone = '휴대폰 인증을 완료해 주세요.'

    const localError = emailLocalError(emailLocal)
    const domainError = emailDomainError(emailDomain)
    if (localError) found.email = localError
    if (domainError) found.emailDomain = domainError
    // 앞뒤가 다 맞아도 합친 길이가 넘칠 수 있다.
    if (!localError && !domainError) {
      const wholeError = emailFormatError(email)
      if (wholeError) found.email = wholeError
    }
    // 인증 없이 제출하면 서버가 422 로 막는다. 휴대폰과 같은 규칙이다.
    if (!found.email && !found.emailDomain && !emailVerified) {
      found.email = '이메일 인증을 완료해 주세요.'
    }

    const passwordError = passwordPolicyError(password)
    if (passwordError) found.password = passwordError
    if (password !== passwordConfirm) found.passwordConfirm = '비밀번호가 일치하지 않습니다.'

    if (!termsAgreed || !privacyAgreed) found.agreement = '필수 약관에 동의해 주세요.'

    setFieldErrors(found)
    if (Object.keys(found).length > 0) return
    if (!birthDate) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await signup({
        name,
        birthDate,
        // 서버는 하이픈 없는 숫자만 받는다.
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        email,
        password,
        termsOfServiceAgreed: termsAgreed,
        privacyPolicyAgreed: privacyAgreed,
        // 시안에서 마케팅 동의 칸이 빠졌다. 서버는 선택값이라 받지 않은 것으로 보낸다.
        marketingAgreed: false,
      })

      setCompleted(true)
    } catch (error) {
      // 마커가 만료되면 이미 통과한 인증이 무효다. 화면도 발송 단계로 되돌려야
      // "인증완료" 라고 떠 있는데 가입은 안 되는 상태에 갇히지 않는다.
      if (error instanceof ApiError && error.code === 'AUTH_PHONE_NOT_VERIFIED') {
        setCodeSent(false)
        setPhoneVerified(false)
        setVerificationCode('')
        setCodeExpiresAt(null)
        setCodeMessage(null)
      }

      setErrorMessage(signupErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  function handleDomainSelect(value: string) {
    resetEmailVerification()
    if (value === '__custom__') {
      setCustomDomain(true)
      setEmailDomain('')
      return
    }
    setEmailDomain(value)
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-screen flex-col bg-white">
      {/* 본문 — 시안: pt100 px100 pb56, 내용 폭 980 */}
      <main className="flex-1 overflow-y-auto px-6 pt-12 pb-14 md:px-[100px] md:pt-[100px]">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8 pb-16">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">회원가입</h1>

          <div className="flex flex-col gap-[50px]">
            {/* 이름 · 생년월일 */}
            <div className="flex flex-col gap-[50px] md:flex-row">
              <Field label="이름">
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="이름을 입력해주세요"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    revalidate('name', nameFormatError(e.target.value))
                  }}
                  onBlur={() => checkOnBlur('name', nameFormatError(name))}
                  className={fieldErrors.name ? errorFieldClass : fieldClass}
                />
                {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
              </Field>
              <Field label="생년월일">
                <FormattedInput
                  autoComplete="bday"
                  placeholder="0000.00.00"
                  value={birthDateInput}
                  onChange={setBirthDateInput}
                  format={formatBirthDate}
                  className={fieldErrors.birthDate ? errorFieldClass : fieldClass}
                />
                {fieldErrors.birthDate && <FieldError>{fieldErrors.birthDate}</FieldError>}
              </Field>
            </div>

            {/* 전화번호 + 인증. 발송·재전송은 번호 옆 버튼, 확인은 인증번호 옆 버튼이 맡는다. */}
            <div className="flex flex-col gap-5">
              <Field label="전화번호 (문자문의 수신 연락처)" required>
                <div className="flex w-full flex-col gap-1">
                  <div className="flex w-full items-start gap-5">
                    <FormattedInput
                      autoComplete="tel-national"
                      placeholder="휴대폰 번호 입력 (‘-’ 제외 11자리 입력)"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      format={formatPhone}
                      disabled={phoneVerified}
                      className={`${fieldClass} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={!canSendCode}
                      className="bg-label-normal disabled:bg-cool-neutral-20 h-14 w-[120px] shrink-0 rounded-xl px-3 text-sm leading-5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed md:w-[158px]"
                    >
                      {phoneVerified
                        ? '인증완료'
                        : sendingCode
                          ? '발송 중…'
                          : resendIn > 0
                            ? `재전송 ${resendIn}초`
                            : codeSent
                              ? '재전송'
                              : '인증번호 전송'}
                    </button>
                  </div>
                  {fieldErrors.phone ? (
                    <FieldError>{fieldErrors.phone}</FieldError>
                  ) : (
                    phoneMessage && (
                      <span className="text-cool-neutral-40 px-2 text-xs leading-4">
                        {phoneMessage}
                      </span>
                    )
                  )}
                </div>
              </Field>

              <div className="flex w-full flex-col gap-1">
                <div className="flex w-full items-start gap-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={PHONE_CODE_LENGTH}
                    aria-label="인증번호"
                    placeholder={`인증번호 ${PHONE_CODE_LENGTH}자리`}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    disabled={!codeSent || phoneVerified}
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={!canVerifyCode}
                    className="bg-label-normal disabled:bg-cool-neutral-20 h-14 w-[120px] shrink-0 rounded-xl px-3 text-sm leading-5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed md:w-[158px]"
                  >
                    {verifyingCode ? '확인 중…' : '확인'}
                  </button>
                </div>
                {/*
                 * 남은 시간은 안내용이다. 실제 만료 판정은 서버가 하므로 0 이 되어도
                 * "만료됐다" 로 단정하지 않고 다시 받으라고만 안내한다.
                 */}
                {codeSent && !phoneVerified && (
                  <span className="text-cool-neutral-40 px-1 text-xs leading-5">
                    {codeExpiresIn > 0
                      ? `남은 시간 ${formatSeconds(codeExpiresIn)}`
                      : '인증번호 유효시간이 지났습니다. 다시 받아 주세요.'}
                  </span>
                )}

                {codeMessage && (
                  <span
                    className={
                      'px-1 text-xs leading-5 ' +
                      (phoneVerified ? 'text-cool-neutral-40' : 'text-red-600')
                    }
                  >
                    {codeMessage}
                  </span>
                )}
              </div>
            </div>

            {/* 이메일 주소 + 인증. 휴대폰과 같은 구조 — 주소 옆 전송, 인증번호 옆 확인. */}
            <div className="flex flex-col gap-5">
              <Field label="이메일 주소">
                <div className="flex w-full flex-wrap items-center gap-5">
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="이메일 주소"
                    value={emailLocal}
                    disabled={emailVerified}
                    onChange={(e) => {
                      setEmailLocal(e.target.value)
                      resetEmailVerification()
                      revalidate('email', emailLocalError(e.target.value))
                    }}
                    onBlur={() => checkOnBlur('email', emailLocalError(emailLocal))}
                    className={`${fieldErrors.email ? errorFieldClass : fieldClass} min-w-[200px] flex-1`}
                  />
                  <span className="text-cool-neutral-80 w-11 shrink-0 p-3 text-center text-[22px] leading-7 font-medium">
                    @
                  </span>
                  {customDomain ? (
                    <div className="relative w-full md:w-[380px]">
                      <input
                        type="text"
                        placeholder="도메인 입력"
                        autoFocus
                        value={emailDomain}
                        disabled={emailVerified}
                        onChange={(e) => {
                          setEmailDomain(e.target.value)
                          resetEmailVerification()
                          revalidate('emailDomain', emailDomainError(e.target.value))
                        }}
                        onBlur={() => checkOnBlur('emailDomain', emailDomainError(emailDomain))}
                        className={`${fieldErrors.emailDomain ? errorFieldClass : fieldClass} pr-12`}
                      />
                      <button
                        type="button"
                        aria-label="도메인 목록에서 선택"
                        onClick={() => {
                          resetEmailVerification()
                          setCustomDomain(false)
                          setEmailDomain('')
                        }}
                        className="absolute top-1/2 right-4 -translate-y-1/2"
                      >
                        <img src={chevronUrl} alt="" className="size-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full md:w-[380px]">
                      <select
                        aria-label="이메일 도메인"
                        value={emailDomain}
                        disabled={emailVerified}
                        onChange={(e) => handleDomainSelect(e.target.value)}
                        className={`${fieldClass} appearance-none pr-12 ${emailDomain === '' ? 'text-cool-neutral-10' : ''}`}
                      >
                        <option value="" disabled>
                          직접입력
                        </option>
                        {EMAIL_DOMAINS.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                        <option value="__custom__">직접입력</option>
                      </select>
                      <img
                        src={chevronUrl}
                        alt=""
                        className="pointer-events-none absolute top-1/2 right-4 size-6 -translate-y-1/2"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={!canSendEmailCode}
                    className="bg-label-normal disabled:bg-cool-neutral-20 h-14 w-[120px] shrink-0 rounded-xl px-3 text-sm leading-5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed md:w-[158px]"
                  >
                    {emailVerified
                      ? '인증완료'
                      : sendingEmailCode
                        ? '발송 중…'
                        : emailResendIn > 0
                          ? `재전송 ${emailResendIn}초`
                          : emailCodeSent
                            ? '재전송'
                            : '인증번호 전송'}
                  </button>
                </div>
                {/* 앞칸·뒷칸 중 틀린 쪽 문구를 보여준다. 둘 다면 앞칸부터. */}
                {fieldErrors.email || fieldErrors.emailDomain ? (
                  <FieldError>{fieldErrors.email ?? fieldErrors.emailDomain}</FieldError>
                ) : (
                  emailSendMessage && (
                    <span className="text-cool-neutral-40 px-2 text-xs leading-4">
                      {emailSendMessage}
                    </span>
                  )
                )}
              </Field>

              <div className="flex w-full flex-col gap-1">
                <div className="flex w-full items-start gap-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={EMAIL_CODE_LENGTH}
                    aria-label="이메일 인증번호"
                    placeholder={`인증번호 ${EMAIL_CODE_LENGTH}자리`}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                    disabled={!emailCodeSent || emailVerified}
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailCode}
                    disabled={!canVerifyEmailCode}
                    className="bg-label-normal disabled:bg-cool-neutral-20 h-14 w-[120px] shrink-0 rounded-xl px-3 text-sm leading-5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed md:w-[158px]"
                  >
                    {verifyingEmailCode ? '확인 중…' : '확인'}
                  </button>
                </div>
                {/* 남은 시간은 안내용이다. 실제 만료 판정은 서버가 한다 — 휴대폰과 같다. */}
                {emailCodeSent && !emailVerified && (
                  <span className="text-cool-neutral-40 px-1 text-xs leading-5">
                    {emailCodeExpiresIn > 0
                      ? `남은 시간 ${formatSeconds(emailCodeExpiresIn)}`
                      : '인증번호 유효시간이 지났습니다. 다시 받아 주세요.'}
                  </span>
                )}

                {emailCodeMessage && (
                  <span
                    className={
                      'px-1 text-xs leading-5 ' +
                      (emailVerified ? 'text-cool-neutral-40' : 'text-red-600')
                    }
                  >
                    {emailCodeMessage}
                  </span>
                )}
              </div>
            </div>

            {/* 비밀번호 */}
            <Field label="비밀번호">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="새 비밀번호(영문, 숫자, 특수문자 8~20자)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  revalidate('password', passwordPolicyError(e.target.value))
                }}
                onBlur={() => checkOnBlur('password', passwordPolicyError(password))}
                className={fieldErrors.password ? passwordErrorFieldClass : passwordFieldClass}
              />
              {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
            </Field>

            {/* 비밀번호 확인 */}
            <Field label="비밀번호 확인">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value)
                  revalidate(
                    'passwordConfirm',
                    e.target.value === password ? null : '비밀번호가 일치하지 않습니다.',
                  )
                }}
                onBlur={() =>
                  checkOnBlur(
                    'passwordConfirm',
                    passwordConfirm === password ? null : '비밀번호가 일치하지 않습니다.',
                  )
                }
                className={
                  fieldErrors.passwordConfirm ? passwordErrorFieldClass : passwordFieldClass
                }
              />
              {fieldErrors.passwordConfirm && (
                <FieldError>{fieldErrors.passwordConfirm}</FieldError>
              )}
            </Field>

            {/*
             * 약관 동의. 시안(224:29565)이 「약관 동의」 제목 아래 상자 두 개를 12px 간격으로
             * 쌓는 구조로 바뀌었다. 예전 시안은 한 상자에 한 줄이었다.
             *
             * 마케팅 동의는 시안에서 빠졌다. 서버에서는 선택값이라 안 받아도 되고,
             * 제출할 때 false 로 보낸다.
             */}
            <fieldset className="flex w-full flex-col gap-1">
              <legend className="text-neutral-70 mb-1 px-1 text-lg leading-6 font-semibold">
                약관 동의
              </legend>

              <div className="flex w-full flex-col gap-3">
                {(
                  [
                    [
                      termsAgreed,
                      setTermsAgreed,
                      '서비스 이용약관 (필수)',
                      DOCUMENT_URLS.termsOfService,
                    ],
                    [
                      privacyAgreed,
                      setPrivacyAgreed,
                      '개인정보처리방침 (필수)',
                      DOCUMENT_URLS.privacyPolicy,
                    ],
                  ] as const
                ).map(([checked, setChecked, label, url]) => (
                  <div
                    key={label}
                    className="border-line-normal flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-4"
                  >
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox
                        checked={checked}
                        onChange={(next) => {
                          setChecked(next)
                          // 체크하면 「필수 약관에 동의해 주세요」가 바로 사라지게 다시 본다.
                          revalidate('agreement', null)
                        }}
                      />
                      <span className="text-neutral-70 text-base leading-6">{label}</span>
                    </label>

                    {/* 문서는 앱과 같은 노션 페이지다. 폼을 벗어나지 않게 새 탭으로 연다. */}
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-50 shrink-0 text-base leading-6 font-medium"
                    >
                      보기
                    </a>
                  </div>
                ))}
              </div>
              {fieldErrors.agreement && <FieldError>{fieldErrors.agreement}</FieldError>}
            </fieldset>

            {errorMessage && (
              <p role="alert" className="text-sm leading-5 text-red-600">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* 하단 바 — 좌 가입취소 / 우 가입하기.
          시안(1440)에서 버튼은 콘텐츠 열(980)보다 50px 바깥에 있다. 뷰포트 기준 180px 로 잡으면
          넓은 화면에서 폼과 멀어지므로, 980+50×2=1080 컨테이너를 중앙 정렬해 그 관계를 고정한다. */}
      <div className="flex w-full shrink-0 items-center bg-white px-6 py-6 md:py-10">
        <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="bg-cool-neutral-20 border-line-normal flex h-12 w-[130px] items-center justify-center gap-3 rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition hover:opacity-90 md:w-[158px]"
        >
          <img src={arrowLeftUrl} alt="" className="size-6" />
          가입취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-40 disabled:bg-cool-neutral-20 flex h-12 w-[130px] items-center justify-center gap-3 rounded-2xl px-3 text-base leading-6 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed md:w-[158px]"
        >
          {submitting ? '가입 중…' : '가입하기'}
        </button>
        </div>
      </div>

      <SignupCompleteDialog
        open={completed}
        onClose={() => navigate('/login', { replace: true })}
      />
    </form>
  )
}
