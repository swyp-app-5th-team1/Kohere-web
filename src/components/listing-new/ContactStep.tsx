import type { ReactNode } from 'react'
import { Field, inputClass } from '../form/Field'
import { FormattedInput } from '../form/FormattedInput'
import { formatBusinessNumber, formatPhone } from '../form/formatters'
import { StepFooter } from './StepFooter'
import type { ContactDraft } from './draft'

type ContactStepProps = {
  value: ContactDraft
  onChange: (patch: Partial<ContactDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/** 시안의 네모 체크박스 (16px · radius 2 · 테두리 #999). */
function CheckBox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="border-neutral-30 accent-primary-50 size-4 shrink-0 rounded-[2px] border"
      />
      <span className="text-neutral-70 text-base leading-6">{children}</span>
    </label>
  )
}

/** 매물 등록 7단계 — 연락처와 약관 동의. */
export function ContactStep({ value, onChange, onPrev, onNext }: ContactStepProps) {
  const allAgreed = value.agreedPrivacy && value.agreedExposure

  const filled =
    value.managerName.trim() !== '' &&
    value.phone.trim() !== '' &&
    value.businessNumber.trim() !== '' &&
    allAgreed

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <h1 className="text-[32px] leading-6 font-bold text-[#242424]">
            마지막으로 연락처를 확인해 주세요.
          </h1>

          <div className="flex w-full flex-col gap-6">
            <Field label="지점 운영자명">
              <input
                value={value.managerName}
                onChange={(event) => onChange({ managerName: event.target.value })}
                placeholder="홍길동"
                className={inputClass + ' font-medium'}
              />
            </Field>

            <Field label="지점 운영 휴대폰">
              <FormattedInput
                value={value.phone}
                onChange={(phone) => onChange({ phone })}
                format={formatPhone}
                placeholder="02-0000-0000"
                className={inputClass + ' font-medium'}
              />
            </Field>

            {/* 시안 예시는 123-456-789 인데 사업자등록번호는 10자리 3-2-5 라 예시를 바로잡았다. */}
            <Field label="사업자 등록 번호">
              <FormattedInput
                value={value.businessNumber}
                onChange={(businessNumber) => onChange({ businessNumber })}
                format={formatBusinessNumber}
                placeholder="123-45-67890"
                className={inputClass + ' font-medium'}
              />
              <span className="text-cool-neutral-30 px-1 text-xs leading-6 font-medium">
                매물 등록 확인용으로만 사용됩니다.
              </span>
            </Field>

            <div className="border-line-normal flex w-full flex-col gap-3 rounded-2xl border bg-white p-4">
              <CheckBox
                checked={allAgreed}
                onChange={(next) => onChange({ agreedPrivacy: next, agreedExposure: next })}
              >
                아래 항목에 모두 동의합니다.
              </CheckBox>

              <div className="border-line-normal w-full border-t" />

              <div className="flex w-full items-center justify-between">
                <CheckBox
                  checked={value.agreedPrivacy}
                  onChange={(next) => onChange({ agreedPrivacy: next })}
                >
                  개인정보 수집·이용 동의 (필수)
                </CheckBox>
                {/* 약관 본문이 정해지면 링크나 모달로 연결한다. */}
                <button
                  type="button"
                  className="text-neutral-50 cursor-pointer text-base leading-6 font-medium"
                >
                  보기
                </button>
              </div>

              <div className="flex w-full items-center justify-between">
                <CheckBox
                  checked={value.agreedExposure}
                  onChange={(next) => onChange({ agreedExposure: next })}
                >
                  매물 정보 제공 및 노출 동의 (필수)
                </CheckBox>
                <button
                  type="button"
                  className="text-neutral-50 cursor-pointer text-base leading-6 font-medium"
                >
                  보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StepFooter step={7} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
