import { Chip, ChipGroup } from '../form/Chip'
import { Field } from '../form/Field'
import { StepFooter } from './StepFooter'
import { StepTitle } from './StepTitle'
import type { ConditionsDraft } from './draft'

import { AGE_BOUND, formatRange, parseRange, rangeText } from './ranges'
import { ARC_REQUIREMENTS, GENDER_POLICIES, SUPPORTED_LANGUAGES } from './catalogs'
import { RangeSlider } from '../form/RangeSlider'

const TEXT_MAX = 500

/** 라벨 오른쪽에 붙는 글자 수 표시. */
function Counter({ length }: { length: number }) {
  return (
    <span className="text-label-neutral text-sm leading-5 font-medium">
      {length} / {TEXT_MAX}
    </span>
  )
}

const textareaClass =
  'h-[100px] w-full resize-none rounded-2xl border border-gray-300 bg-white p-4 text-lg leading-6 ' +
  'font-medium outline-none transition-colors placeholder:text-cool-neutral-10 focus:border-cool-neutral-50'

type ConditionsStepProps = {
  value: ConditionsDraft
  onChange: (patch: Partial<ConditionsDraft>) => void
  onPrev: () => void
  onNext: () => void
}

/** 매물 등록 3단계 — 입주조건. 외국어 응대만 중복 선택이다. */
export function ConditionsStep({ value, onChange, onPrev, onNext }: ConditionsStepProps) {
  const toggleLanguage = (language: string) => {
    onChange({
      languages: value.languages.includes(language)
        ? value.languages.filter((item) => item !== language)
        : [...value.languages, language],
    })
  }

  const age = parseRange(value.ageRange) ?? AGE_BOUND

  const filled =
    value.genderRule !== '' &&
    value.languages.length > 0 &&
    value.arcRule !== '' &&
    value.ageRange.trim() !== '' &&
    value.houseRule.trim() !== '' &&
    value.refundPolicy.trim() !== ''

  return (
    <>
      <main className="flex w-full flex-1 flex-col items-center px-6 py-14">
        <div className="flex w-full max-w-[980px] flex-col gap-8">
          <StepTitle>숙소의 입주조건을 선택해주세요.</StepTitle>

          <div className="flex w-full flex-col gap-6">
            <Field label="성별 구분">
              <ChipGroup>
                {/* 화면에는 라벨을, 담는 건 서버 코드다. catalogs.ts 참고. */}
                {GENDER_POLICIES.map((item) => (
                  <Chip
                    key={item.code}
                    selected={value.genderRule === item.code}
                    onClick={() => onChange({ genderRule: item.code })}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <Field label="외국어 응대 (중복가능)">
              <ChipGroup>
                {SUPPORTED_LANGUAGES.map((item) => (
                  <Chip
                    key={item.code}
                    selected={value.languages.includes(item.code)}
                    onClick={() => toggleLanguage(item.code)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            <Field label="외국인 등록증(ARC) 필요 여부">
              <ChipGroup>
                {ARC_REQUIREMENTS.map((item) => (
                  <Chip
                    key={item.code}
                    selected={value.arcRule === item.code}
                    onClick={() => onChange({ arcRule: item.code })}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChipGroup>
            </Field>

            {/*
              자유 입력이면 「2030」이나 「20~40세」처럼 서버가 못 읽는 값이 들어온다.
              슬라이더는 형식이 어긋날 수가 없고 앞뒤가 뒤집히지도 않는다.
              (시안 코멘트에서 슬라이더로 가기로 정해진 항목이다)
            */}
            <Field
              label="이용 연령대"
              labelEnd={
                <span className="text-label-neutral text-sm leading-5 font-medium">
                  {rangeText(age, '세')}
                </span>
              }
            >
              <RangeSlider
                label="이용 연령대"
                unit="세"
                bound={AGE_BOUND}
                value={parseRange(value.ageRange)}
                onChange={({ min, max }) => onChange({ ageRange: formatRange(min, max) })}
              />
            </Field>

            {/* 안내 문구는 시안에 "임주자가" 로 적혀 있는데 오타로 보여 바로잡았다. */}
            <Field label="이용조건" labelEnd={<Counter length={value.houseRule.length} />}>
              <textarea
                value={value.houseRule}
                onChange={(event) => onChange({ houseRule: event.target.value })}
                maxLength={TEXT_MAX}
                placeholder="입주자가 지켜야 할 규칙을 적어주세요"
                className={textareaClass}
              />
            </Field>

            <Field label="환불정책" labelEnd={<Counter length={value.refundPolicy.length} />}>
              <textarea
                value={value.refundPolicy}
                onChange={(event) => onChange({ refundPolicy: event.target.value })}
                maxLength={TEXT_MAX}
                placeholder="중도 퇴실 시 환불 규정을 적어주세요"
                className={textareaClass}
              />
            </Field>
          </div>
        </div>
      </main>

      <StepFooter step={3} onPrev={onPrev} onNext={onNext} nextDisabled={!filled} />
    </>
  )
}
