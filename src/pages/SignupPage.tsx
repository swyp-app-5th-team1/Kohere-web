import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, inputClass } from '../components/form/Field'
import chevronUrl from '../assets/icon-chevron.svg'
import arrowLeftUrl from '../assets/icon-arrow-left.svg'

const fieldClass = `${inputClass} font-medium`

/** 자주 쓰는 이메일 도메인. '직접입력'을 고르면 텍스트 입력으로 바뀐다. */
const EMAIL_DOMAINS = ['naver.com', 'gmail.com', 'daum.net', 'hanmail.net', 'outlook.com']

export default function SignupPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [emailLocal, setEmailLocal] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [customDomain, setCustomDomain] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO(스펙 확정 후): 회원가입 API 연동. 서버에 이메일/비밀번호 가입 엔드포인트가 아직 없다.
  }

  function handleDomainSelect(value: string) {
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
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                />
              </Field>
              <Field label="생년월일">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday"
                  placeholder="0000.00.00"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={fieldClass}
                />
              </Field>
            </div>

            {/* 전화번호 + 인증 */}
            <div className="flex flex-col gap-5">
              <Field label="전화번호 (문자문의 수신 연락처)" required>
                <div className="flex w-full items-start gap-5">
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="휴대폰 번호 입력 (‘-’ 제외 11자리 입력)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    className="bg-label-normal h-14 w-[120px] shrink-0 rounded-xl px-3 text-sm leading-5 font-medium text-white transition hover:opacity-90 md:w-[158px]"
                  >
                    인증번호 확인
                  </button>
                </div>
              </Field>
              <input
                type="text"
                inputMode="numeric"
                placeholder="인증번호 6자리"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className={fieldClass}
              />
            </div>

            {/* 이메일 주소 */}
            <Field label="이메일 주소">
              <div className="flex w-full flex-wrap items-center gap-5">
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="이메일 주소"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  className={`${fieldClass} min-w-[200px] flex-1`}
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
                      onChange={(e) => setEmailDomain(e.target.value)}
                      className={`${fieldClass} pr-12`}
                    />
                    <button
                      type="button"
                      aria-label="도메인 목록에서 선택"
                      onClick={() => {
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
              </div>
            </Field>

            {/* 비밀번호 */}
            <Field label="비밀번호">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 입력 (문자, 숫자, 특수문자 포함 8~10자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </Field>

            {/* 비밀번호 확인 */}
            <Field label="비밀번호 확인">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={fieldClass}
              />
            </Field>
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
          className="bg-primary-40 flex h-12 w-[130px] items-center justify-center gap-3 rounded-2xl px-3 text-base leading-6 font-semibold text-white transition hover:brightness-95 md:w-[158px]"
        >
          가입하기
        </button>
        </div>
      </div>
    </form>
  )
}
