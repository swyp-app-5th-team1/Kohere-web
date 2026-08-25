import { useState, type FormEvent } from 'react'
import {
  findEmail,
  findEmailErrorMessage,
  isEmailShaped,
  requestPasswordResetLink,
  resetLinkErrorMessage,
} from '../api/auth'
import { ApiError } from '../api/client'
import {
  PHONE_CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  sendCodeErrorMessage,
  sendFindEmailPhoneCode,
  verifyFindEmailPhoneCode,
  verifyPhoneErrorMessage,
} from '../api/phone'
import { formatSeconds, useCountdown } from '../hooks/useCountdown'
import { EmailFoundDialog, EmailNotFoundDialog } from '../components/FindAccountDialogs'
import { ctaDisabledClass, ctaPrimaryClass } from '../components/form/CtaButton'
import { inputClass } from '../components/form/Field'
import { FormattedInput } from '../components/form/FormattedInput'
import { TextField } from '../components/form/TextField'
import { formatPhone } from '../components/form/formatters'
import clearUrl from '../assets/icon-x-small.svg'

/** 시안의 두 탭. */
type Tab = 'email' | 'password'

const fieldClass = `${inputClass} font-semibold`

/**
 * 전화번호 옆 「인증하기」(시안 224:30700). 검정 배경에 입력창과 같은 56px 높이다.
 * 비활성 상태는 시안에 없어 회원가입 화면의 인증 버튼(cool-neutral/20)을 따랐다.
 */
const verifyButtonClass =
  'bg-label-normal border-line-normal flex h-14 w-[100px] shrink-0 items-center justify-center ' +
  'rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition ' +
  'hover:opacity-90 disabled:bg-cool-neutral-20 disabled:cursor-not-allowed'

const tabClass = (selected: boolean) =>
  'flex-1 text-2xl leading-6 font-bold transition-colors ' +
  (selected ? 'text-primary-40' : 'text-cool-neutral-50')

/**
 * 이메일 · 비밀번호 찾기 (시안 224:30691 · 224:30782).
 *
 * 두 탭이 본인을 확인하는 방식이 다르다 — 이메일 찾기는 전화번호로 문자 인증을 하고,
 * 비밀번호 찾기는 메일로 재설정 링크를 보낸다(시안 메모 224:30707). 채널을 갈라 둔 것
 * 자체가 방어라, 한쪽으로 통일하지 않는다.
 */
export default function FindAccountPage() {
  const [tab, setTab] = useState<Tab>('email')

  // 이메일 찾기 탭.
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  /*
   * 확인(verify)을 이미 통과했는가.
   *
   * 인증 마커는 서버가 만들어 서버가 들고 있다 — 확인 응답에는 `verified: true` 만 오고
   * 조회 요청에도 마커를 실어 보내지 않는다. 그래서 이 값은 마커 자체가 아니라 「방금
   * 확인이 성공했으니 서버에 있을 것」이라는 짐작이고, 30분이 지났거나 다른 탭에서 이미
   * 써 버렸으면 틀릴 수 있다. 그 경우는 조회가 422 로 알려 주므로 그때 되돌린다.
   *
   * 확인을 「이메일 찾기」 누를 때 같이 하는 이유는 시안(224:30691)에 인증번호 옆 확인
   * 버튼이 없어서다. 한 번 통과했으면 다음 제출부터는 건너뛴다 — 같은 코드로 확인을 다시
   * 부르면 5회 시도만 축내는데, 이름을 고쳐 다시 찾는 경우가 실제로 흔하다.
   */
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null)
  /** 재발송이 열리는 시각과 인증번호가 만료되는 시각. 응답을 받은 순간 기준으로 잡는다. */
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null)

  const resendIn = useCountdown(resendAt)
  const codeLeft = useCountdown(codeExpiresAt)

  // 비밀번호 찾기 탭. 시안(224:30782)이 받는 값은 이메일 하나뿐이다.
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  /** 링크 유효시간. 서버가 `expiresIn`(초)로 내려주니 우리가 30분을 박지 않는다. */
  const [linkValidMinutes, setLinkValidMinutes] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const findingEmail = tab === 'email'

  // 회원가입 화면과 같은 기준(휴대폰 11자리). 시안에는 비활성 상태가 그려져 있지 않다.
  const codeSent = codeExpiresAt !== null
  const canSendCode =
    phone.replace(/\D/g, '').length === 11 && resendIn === 0 && !sendingCode && !submitting

  const canSubmit =
    !submitting &&
    (findingEmail
      ? name.trim() !== '' && phone.trim() !== '' && verificationCode.trim() !== ''
      : // 보낸 뒤에는 잠근다. 같은 이메일 5회/시간이라 연타하면 자기 예산만 태운다.
        // 주소를 고치면 linkSent 가 풀리면서 다시 열린다.
        isEmailShaped(email.trim()) && !linkSent)

  /** 번호를 고치면 앞서 받은 인증도 무효다. 재발송 쿨다운은 서버가 번호 기준이라 그대로 둔다. */
  function handlePhoneChange(next: string) {
    setPhone(next)
    setVerificationCode('')
    setPhoneVerified(false)
    setCodeExpiresAt(null)
    setPhoneMessage(null)
  }

  async function handleSendCode() {
    if (!canSendCode) return

    setSendingCode(true)
    setErrorMessage(null)
    // 새 인증번호를 받으면 앞서 통과한 확인은 무효로 본다.
    setPhoneVerified(false)
    setVerificationCode('')

    try {
      const result = await sendFindEmailPhoneCode(phone)
      const now = Date.now()
      setCodeExpiresAt(now + result.expiresIn * 1000)
      setResendAt(now + RESEND_COOLDOWN_SECONDS * 1000)
      setPhoneMessage('인증번호를 발송했습니다. 문자가 오지 않으면 번호를 확인해 주세요.')
    } catch (error) {
      setPhoneMessage(null)
      /*
       * 502(발송 실패)는 인증번호가 발급되지 않은 것이라 곧바로 다시 눌러야 해서
       * 쿨다운을 걸지 않는다. 429 는 이미 서버가 막고 있다.
       */
      setErrorMessage(sendCodeErrorMessage(error))
    } finally {
      setSendingCode(false)
    }
  }

  function selectTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    // 이전 탭에서 받은 답은 지운다. 다른 질문에 대한 답이라 남겨두면 헷갈린다.
    setErrorMessage(null)
    setLinkSent(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      if (findingEmail) {
        /*
         * 아직 확인을 안 했으면 먼저 한다. 이 호출이 성공해야 서버에 마커가 생긴다.
         * 확인 실패는 조회 실패와 원인이 달라서(인증번호 문제 vs 계정 문제) 여기서 갈라
         * 잡고, 조회까지 가지 않는다.
         */
        if (!phoneVerified) {
          try {
            await verifyFindEmailPhoneCode(phone, verificationCode)
            setPhoneVerified(true)
          } catch (verifyError) {
            setErrorMessage(verifyPhoneErrorMessage(verifyError))
            return
          }
        }

        const result = await findEmail(name, phone)
        setMaskedEmail(result.email)
        /*
         * 찾기에 성공하면 서버가 마커를 태운다. 화면도 인증 전으로 되돌려야
         * 「인증번호가 아직 적혀 있는데 다시 누르면 422」인 상태에 갇히지 않는다.
         */
        setPhoneVerified(false)
        setVerificationCode('')
        setCodeExpiresAt(null)
        setPhoneMessage(null)
      } else {
        const result = await requestPasswordResetLink(email.trim())
        setLinkValidMinutes(Math.round(result.expiresIn / 60))
        setLinkSent(true)
      }
    } catch (error) {
      /*
       * 404 는 「그 번호로 가입한 계정이 없음」과 「이름 불일치」를 합친 코드다. 서버가
       * 둘을 구분하지 않으므로(이름 대조를 오라클로 쓰지 못하게) 화면도 하나로 다룬다.
       * 이 실패는 마커를 태우지 않아 이름만 고쳐 곧바로 다시 시도할 수 있다.
       */
      if (findingEmail && error instanceof ApiError && error.code === 'AUTH_WEB_ACCOUNT_NOT_FOUND') {
        setNotFound(true)
      } else if (findingEmail) {
        /*
         * 422 는 마커가 만료(30분)됐거나 이미 소비됐다는 뜻이다. 화면이 「인증됨」이라고
         * 믿고 있으면 눌러도 계속 같은 오류만 나므로 발송 단계로 되돌린다.
         */
        if (error instanceof ApiError && error.code === 'AUTH_PHONE_NOT_VERIFIED') {
          setPhoneVerified(false)
          setCodeExpiresAt(null)
          setPhoneMessage(null)
        }
        setErrorMessage(findEmailErrorMessage(error))
      } else {
        setErrorMessage(resetLinkErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-[425px] flex-col items-center gap-8">
        <div role="tablist" className="flex w-full items-center justify-center gap-[59px]">
          <button
            type="button"
            role="tab"
            id="tab-email"
            aria-selected={findingEmail}
            aria-controls="find-account-form"
            onClick={() => selectTab('email')}
            className={`${tabClass(findingEmail)} text-right`}
          >
            이메일 찾기
          </button>
          <button
            type="button"
            role="tab"
            id="tab-password"
            aria-selected={!findingEmail}
            aria-controls="find-account-form"
            onClick={() => selectTab('password')}
            className={`${tabClass(!findingEmail)} text-left`}
          >
            비밀번호 찾기
          </button>
        </div>

        <form
          id="find-account-form"
          role="tabpanel"
          aria-labelledby={findingEmail ? 'tab-email' : 'tab-password'}
          onSubmit={handleSubmit}
          className="flex w-full flex-col items-center gap-8"
        >
          {findingEmail ? (
            /* 이메일 찾기 — 휴대폰 인증 흐름(시안 224:30691): 이름, 전화번호+인증하기, 인증번호. */
            <div className="flex w-full flex-col gap-4">
              <TextField
                required
                autoComplete="name"
                aria-label="이름"
                placeholder="이름"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onClear={() => setName('')}
                className={fieldClass}
              />

              {/* 전화번호가 남는 폭을 다 차지한다(시안 317px = 425 − 버튼 100 − 간격 8). */}
              <div className="flex w-full items-center gap-2">
                {/*
                 * FormattedInput 은 공용이라 손대지 않고, TextField 의 지우기 버튼
                 * (시안 224:30202 · 224:30207)을 여기서 같은 모양으로 붙였다.
                 */}
                <div className="relative min-w-0 flex-1">
                  <FormattedInput
                    required
                    autoComplete="tel-national"
                    aria-label="전화번호"
                    placeholder="전화번호"
                    value={phone}
                    onChange={handlePhoneChange}
                    format={formatPhone}
                    className={`${fieldClass} pr-11`}
                  />
                  {phone !== '' && (
                    <button
                      type="button"
                      aria-label="입력 지우기"
                      onClick={() => handlePhoneChange('')}
                      className="absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center"
                    >
                      <img src={clearUrl} alt="" className="size-full" />
                    </button>
                  )}
                </div>
                {/* 발송 뒤에는 같은 버튼이 재전송을 맡는다. 시안에 재전송 상태는 없다. */}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!canSendCode}
                  className={verifyButtonClass}
                >
                  {sendingCode
                    ? '발송 중…'
                    : resendIn > 0
                      ? `${resendIn}초`
                      : codeSent
                        ? '재전송'
                        : '인증하기'}
                </button>
              </div>

              <div className="flex w-full flex-col gap-0.5">
                {/* 시안에 인증번호 칸의 지우기 버튼은 없다. onClear 를 넘기지 않는다. */}
                <TextField
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="인증번호"
                  placeholder={`인증번호 ${PHONE_CODE_LENGTH}자리`}
                  value={verificationCode}
                  // 확인을 통과한 뒤에는 고칠 이유가 없다. 다시 하려면 재전송을 눌러야 한다.
                  disabled={phoneVerified}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                  className={fieldClass}
                />

                {/*
                 * 남은 시간과 발송 안내. 시안에는 없지만 5분 만료를 알려주지 않으면
                 * 사용자가 왜 실패하는지 알 수 없다. 회원가입 화면과 같은 자리다.
                 *
                 * 확인을 통과한 뒤에는 이 타이머를 감춘다. 인증번호(5분)는 마커(30분)보다
                 * 먼저 죽어서, 이름을 고쳐 다시 찾는 동안 「유효시간이 지났습니다」가 떠
                 * 버린다 — 아직 25분이나 남았는데 멀쩡한 사람에게 재발송을 시키는 꼴이다.
                 */}
                {codeSent && !phoneVerified && (
                  <p className="text-cool-neutral-70 px-2 text-xs leading-4">
                    {codeLeft > 0
                      ? `${phoneMessage ?? '인증번호를 발송했습니다.'} (${formatSeconds(codeLeft)})`
                      : '인증번호 유효시간이 지났습니다. 다시 받아 주세요.'}
                  </p>
                )}
                {phoneVerified && (
                  <p role="status" className="text-cool-neutral-70 px-2 text-xs leading-4">
                    휴대폰 인증이 완료되었습니다.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /*
             * 비밀번호 찾기 — 시안(224:30782)은 이메일 한 칸이 전부다. 이름 · 전화번호를
             * 같이 받던 예전 구성은 스펙이 없을 때 내가 임의로 만든 것이라 걷어냈다.
             */
            <div className="flex w-full flex-col gap-4">
              <TextField
                required
                inputMode="email"
                autoComplete="email"
                aria-label="이메일"
                placeholder="이메일"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setLinkSent(false)
                }}
                onClear={() => setEmail('')}
                className={fieldClass}
              />
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="w-full text-center text-sm leading-5 text-red-600">
              {errorMessage}
            </p>
          )}

          {/*
           * 발송 결과 화면은 시안에 없다. 문구만 아래에 붙여 두고, 팝업이 나오면 옮긴다.
           * 「가입된 주소인지」는 알려주지 않는다 — 로그인이 미등록 이메일과 비밀번호
           * 불일치를 같은 401 로 묶어 둔 걸 여기서 되돌리면 안 된다.
           */}
          {linkSent && (
            <p role="status" className="text-cool-neutral-70 w-full text-center text-sm leading-5">
              입력하신 주소로 비밀번호 재설정 링크를 보냈습니다.
              {linkValidMinutes !== null && ` 링크는 ${linkValidMinutes}분간 유효합니다.`}
              <br />
              메일이 보이지 않으면 스팸함을 확인해 주세요.
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={(canSubmit ? ctaPrimaryClass : ctaDisabledClass) + ' w-full'}
          >
            {/*
             * 시안(224:30788)의 라벨은 「인증번호 발송」인데 실제로 보내는 건 재설정
             * 링크다. 옛 흐름의 이름이 남은 것으로 보여 하는 일에 맞춰 바꿨다.
             * 디자인팀 확인이 되면 그때 시안 쪽을 맞춘다.
             */}
            {submitting
              ? '확인 중…'
              : findingEmail
                ? '이메일 찾기'
                : linkSent
                  ? '발송 완료'
                  : '재설정 링크 발송'}
          </button>
        </form>
      </div>

      {/* 결과는 시안대로 팝업이다. 닫으면 폼이 그대로 남아 다시 시도할 수 있다. */}
      {maskedEmail !== null && (
        <EmailFoundDialog open onClose={() => setMaskedEmail(null)} maskedEmail={maskedEmail} />
      )}
      <EmailNotFoundDialog open={notFound} onClose={() => setNotFound(false)} />
    </div>
  )
}
