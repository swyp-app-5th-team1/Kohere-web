import { Field, FieldError, inputClass, inputErrorClass } from '../form/Field'
import { FormattedInput } from '../form/FormattedInput'
import { TextField } from '../form/TextField'
import {
  formatBusinessNumber,
  formatPhone,
  isBusinessNumberComplete,
  isPhoneComplete,
} from '../form/formatters'
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
 * 매물 등록 7단계 — 연락처.
 *
 * 시안에 있던 동의 체크박스 두 개(개인정보 · 매물 노출)는 받지 않기로 팀이
 * 정했다(2026-08-28). 문구도 본문 문서도 함께 없어졌다.
 */
export function ContactStep({ value, onChange, onPrev, onNext }: ContactStepProps) {
  const touched = useTouched()

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

  const filled =
    value.managerName.trim() !== '' &&
    isPhoneComplete(value.phone) &&
    isBusinessNumberComplete(value.businessNumber)

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
                onBlur={() => touched.touch('businessNumber')}
                format={formatBusinessNumber}
                placeholder="123-45-67890"
                className={(shownBusinessError === null ? inputClass : inputErrorClass) + ' font-medium'}
              />
              {shownBusinessError && <FieldError>{shownBusinessError}</FieldError>}
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
