import { useState } from 'react'
import {
  businessVerifyErrorMessage,
  isBusinessNumberComplete,
  verifyBusinessNumber,
} from '../../api/business'
import { ApiError } from '../../api/client'
import { Field, FieldError, inputClass, inputErrorClass } from '../form/Field'
import { FormattedInput } from '../form/FormattedInput'
import { TextField } from '../form/TextField'
import { formatBusinessNumber, formatPhone, isPhoneComplete } from '../form/formatters'
import { useTouched } from '../form/useTouched'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import { StepBody } from './StepBody'
import type { ContactDraft } from './draft'

type ContactStepProps = {
  value: ContactDraft
  onChange: (patch: Partial<ContactDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/**
 * 사업자등록번호 검증(`/auth/business/verify`)의 진행 상태.
 *
 * 명세상 이 호출은 의무가 아니다 — 등록 요청은 결과를 모르고, 진위는 승인 심사에서 다시
 * 본다. 여기서 부르는 건 미등록 · 휴폐업 번호를 심사 반려로 며칠 뒤에 아는 대신 그 자리에서
 * 알려 주기 위해서다. 그래서 **확실히 틀렸을 때만 막는다** — 확인 기관이 죽어 있으면
 * (`unavailable`) 문구만 띄우고 통과시킨다. 그것 때문에 등록을 막으면 우리 잘못도 임대인
 * 잘못도 아닌 이유로 매물을 못 올린다.
 */
type VerifyState = {
  /** 검증을 돌린 번호(숫자 10자리). 번호를 고치면 결과가 무효가 된다. */
  number: string
  status: 'checking' | 'ok' | 'failed' | 'unavailable'
  message?: string
}

/**
 * 매물 등록 7단계 — 연락처.
 *
 * 시안에 있던 동의 체크박스 두 개(개인정보 · 매물 노출)는 받지 않기로 팀이
 * 정했다(2026-08-28). 문구도 본문 문서도 함께 없어졌다.
 */
export function ContactStep({ value, onChange, onPrev, onNext }: ContactStepProps) {
  const touched = useTouched()

  const [verify, setVerify] = useState<VerifyState | null>(null)
  const businessDigits = value.businessNumber.replace(/\D/g, '')
  /** 지금 적힌 번호에 대한 결과만 의미가 있다. 고치는 순간 지난 결과는 버린다. */
  const currentVerify = verify?.number === businessDigits ? verify : null

  const runVerify = () => {
    touched.touch('businessNumber')
    if (businessDigits.length !== 10) return
    // 같은 번호를 다시 확인하지 않는다. 기관 장애(unavailable)였다면 다음 이탈 때 다시 본다.
    if (currentVerify && currentVerify.status !== 'unavailable') return

    const number = businessDigits
    setVerify({ number, status: 'checking' })

    verifyBusinessNumber(number)
      .then(() => update(number, { number, status: 'ok' }))
      .catch((error: unknown) => {
        // 외부 기관 장애나 인증 문제는 임대인이 고칠 수 있는 게 아니다. 막지 않는다.
        const code = error instanceof ApiError ? error.code : null
        const blocking =
          code === 'AUTH_BUSINESS_NUMBER_VERIFICATION_FAILED' || code === 'INVALID_INPUT'

        update(number, {
          number,
          status: blocking ? 'failed' : 'unavailable',
          message: blocking
            ? businessVerifyErrorMessage(error)
            : '사업자등록번호 확인 기관에 연결하지 못했습니다. 등록은 계속할 수 있습니다.',
        })
      })

    /** 응답이 오기 전에 번호를 고쳤으면 낡은 결과라 버린다. */
    function update(forNumber: string, next: VerifyState) {
      setVerify((current) =>
        current?.number === forNumber && current.status === 'checking' ? next : current,
      )
    }
  }

  /*
   * 하이픈을 넣어 주다 보니 「010-1」도 번듯해 보인다. 비었는지만 봐서는 덜 친 번호가 그대로
   * 넘어가므로 자릿수까지 센다.
   */
  const phoneError =
    value.phone.trim() === '' || isPhoneComplete(value.phone)
      ? null
      : '전화번호를 끝까지 적어 주세요'

  const businessError =
    value.businessNumber.trim() === '' || isBusinessNumberComplete(value.businessNumber)
      ? null
      : '사업자등록번호 10자리를 적어 주세요'

  const shownPhoneError = touched.error('phone', phoneError)
  const shownBusinessError = touched.error('businessNumber', businessError)

  /* 검증이 도는 중이거나 확실히 틀린 번호면 잠근다. 확인을 못 한 것(unavailable)은 통과다. */
  const verifyBlocked =
    currentVerify !== null &&
    (currentVerify.status === 'checking' || currentVerify.status === 'failed')

  const filled =
    value.managerName.trim() !== '' &&
    isPhoneComplete(value.phone) &&
    isBusinessNumberComplete(value.businessNumber) &&
    !verifyBlocked

  return (
    <>
      <StepBody>
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>마지막으로 연락처를 확인해 주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            <Field label="지점 운영자명">
              <TextField
                value={value.managerName}
                onChange={(event) => onChange({ managerName: event.target.value })}
                placeholder="홍길동"
                className="font-medium"
                />
            </Field>

            <Field label="지점 운영 휴대폰">
              <div className="flex w-full flex-col gap-1">
                <FormattedInput
                  value={value.phone}
                  onChange={(phone) => onChange({ phone })}
                  onBlur={() => touched.touch('phone')}
                  format={formatPhone}
                  placeholder="000-0000-0000"
                  className={
                    (shownPhoneError === null ? inputClass : inputErrorClass) + ' font-medium'
                  }
                />
                {shownPhoneError && <FieldError>{shownPhoneError}</FieldError>}
              </div>
            </Field>

            <Field label="사업자 등록 번호">
              <FormattedInput
                value={value.businessNumber}
                onChange={(businessNumber) => onChange({ businessNumber })}
                onBlur={runVerify}
                format={formatBusinessNumber}
                placeholder="123-45-67890"
                className={
                  (shownBusinessError === null && currentVerify?.status !== 'failed'
                    ? inputClass
                    : inputErrorClass) + ' font-medium'
                }
              />
              {shownBusinessError && <FieldError>{shownBusinessError}</FieldError>}
              {currentVerify?.status === 'checking' && (
                <span className="text-cool-neutral-30 px-1 text-xs leading-6 font-medium">
                  사업자등록번호를 확인하고 있습니다…
                </span>
              )}
              {currentVerify?.status === 'failed' && (
                <FieldError>{currentVerify.message}</FieldError>
              )}
              {currentVerify?.status === 'unavailable' && (
                <span className="text-cool-neutral-30 px-1 text-xs leading-6 font-medium">
                  {currentVerify.message}
                </span>
              )}
              {currentVerify?.status === 'ok' && (
                <span className="text-cool-neutral-30 px-1 text-xs leading-6 font-medium">
                  등록이 확인된 사업자등록번호입니다.
                </span>
              )}
              <span className="text-cool-neutral-30 px-1 text-xs leading-6 font-medium">
                매물 등록 확인용으로만 사용됩니다.
              </span>
            </Field>

          </div>
        </div>
      </StepBody>

      <StepFooter step={7} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
