import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { findEmail, requestPasswordReset } from '../api/auth'
import { ApiError } from '../api/client'
import { inputClass } from '../components/form/Field'
import { FormattedInput } from '../components/form/FormattedInput'
import { TextField } from '../components/form/TextField'
import { formatPhone } from '../components/form/formatters'
import clearUrl from '../assets/icon-x-small.svg'

/** 시안의 두 탭. */
type Tab = 'email' | 'password'

const fieldClass = `${inputClass} font-semibold`

/**
 * 전화번호 옆 「인증하기」(시안 224:30146). 검정 배경에 입력창과 같은 56px 높이다.
 * 비활성 상태는 시안에 없어 회원가입 화면의 인증 버튼(cool-neutral/20)을 따랐다.
 */
const verifyButtonClass =
  'bg-label-normal border-line-normal flex h-14 w-[100px] shrink-0 items-center justify-center ' +
  'rounded-2xl border px-3 text-base leading-6 font-semibold text-white transition ' +
  'hover:opacity-90 disabled:bg-cool-neutral-20 disabled:cursor-not-allowed'

const tabClass = (selected: boolean) =>
  'flex-1 text-2xl leading-6 font-bold transition-colors ' +
  (selected ? 'text-primary-40' : 'text-cool-neutral-50')

export default function FindAccountPage() {
  const [tab, setTab] = useState<Tab>('email')

  // 이름 · 전화번호는 두 탭이 함께 쓴다. 탭을 옮겨도 지우지 않는다.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  /** 이메일 찾기 탭 전용 인증번호. 자릿수 스펙이 아직 없어 길이를 제한하지 않는다. */
  const [verificationCode, setVerificationCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const findingEmail = tab === 'email'

  // 회원가입 화면과 같은 기준(휴대폰 11자리). 시안에는 비활성 상태가 그려져 있지 않다.
  const canSendCode = phone.replace(/\D/g, '').length === 11

  // 시안의 버튼은 회색(비활성)으로 그려져 있다. 칸이 모두 채워지면 활성화한다.
  const canSubmit =
    name.trim() !== '' &&
    phone.trim() !== '' &&
    (findingEmail ? verificationCode.trim() !== '' : email.trim() !== '') &&
    !submitting

  /** 번호를 고치면 앞서 받은(받을) 인증번호는 무효다. 함께 지운다. */
  function handlePhoneChange(next: string) {
    setPhone(next)
    setVerificationCode('')
  }

  /*
   * TODO(스펙 확정 후): 이메일 찾기용 인증번호 발송 API 가 아직 없다.
   * phone.ts 의 sendSignupPhoneCode 는 회원가입 전용 챌린지라 여기서 쓰면 안 된다.
   * 스펙이 나오면 발송 호출과 재발송 쿨다운 · 만료 타이머(useCountdown)를 붙인다.
   */
  function handleSendCode() {
    // 아직 부를 API 가 없다. 버튼은 시안대로 그려만 둔다.
  }

  function selectTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    // 이전 탭에서 받은 답은 지운다. 다른 질문에 대한 답이라 남겨두면 헷갈린다.
    setErrorMessage(null)
    setResultMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage(null)
    setResultMessage(null)

    try {
      if (findingEmail) {
        // TODO(스펙 확정 후): 인증번호를 함께 보낼지, 별도 확인 단계를 둘지 정해지면
        // 반영한다. 지금은 기존대로 이름 · 전화번호만 보낸다. (경로 자체도 서버 미구현)
        const { maskedEmail } = await findEmail(name, phone)
        setResultMessage(`가입된 이메일은 ${maskedEmail} 입니다.`)
      } else {
        await requestPasswordReset(name, email, phone)
        setResultMessage('비밀번호 재설정 안내를 이메일로 보냈습니다.')
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : '요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-[423px] flex-col items-center gap-8">
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
            /* 이메일 찾기 — 휴대폰 인증 흐름(시안 224:30137): 이름, 전화번호+인증하기, 인증번호. */
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
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!canSendCode}
                  className={verifyButtonClass}
                >
                  인증하기
                </button>
              </div>

              {/* 시안에 인증번호 칸의 지우기 버튼은 없다. onClear 를 넘기지 않는다. */}
              <TextField
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="인증번호"
                placeholder="인증번호"
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(event.target.value.replace(/\D/g, ''))
                }
                className={fieldClass}
              />
            </div>
          ) : (
            /* 비밀번호 찾기 — 별도 시안 확인 중이라 기존 구성을 그대로 둔다. */
            <div className="flex w-full flex-col gap-4">
              <TextField
                required
                autoComplete="name"
                aria-label="이름"
                placeholder="이름"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />

              {/* 비밀번호 찾기는 재설정 안내를 보낼 곳이 필요해 이메일을 함께 받는다. */}
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

              <FormattedInput
                required
                autoComplete="tel-national"
                aria-label="전화번호"
                placeholder="전화번호"
                value={phone}
                onChange={setPhone}
                format={formatPhone}
                className={fieldClass}
              />
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="w-full text-center text-sm leading-5 text-red-600">
              {errorMessage}
            </p>
          )}

          {/* 결과 화면은 시안에 없어 폼 아래에 붙였다. 시안이 나오면 이 자리를 바꾼다. */}
          {resultMessage && (
            <div
              role="status"
              className="bg-cool-neutral-5 text-cool-neutral-70 flex w-full flex-col items-center gap-2 rounded-2xl px-4 py-5 text-center text-base leading-6 font-semibold"
            >
              <p>{resultMessage}</p>
              <Link to="/login" className="text-primary-40 text-sm leading-5">
                로그인하러 가기
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={
              'border-line-alternative flex h-12 w-full items-center justify-center rounded-2xl ' +
              'border px-3 text-base leading-6 font-semibold text-white transition-colors ' +
              (canSubmit
                ? 'bg-primary-40 hover:brightness-95'
                : 'bg-cool-neutral-20 cursor-not-allowed')
            }
          >
            {submitting ? '확인 중…' : findingEmail ? '이메일 찾기' : '비밀번호 찾기'}
          </button>
        </form>
      </div>
    </div>
  )
}
